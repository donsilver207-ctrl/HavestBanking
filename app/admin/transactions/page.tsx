"use client"

import { useEffect, useState } from "react"
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  AlertCircle,
  Plus,
  X,
  Clock,
  Ban,
  FileImage,
  ExternalLink,
  CalendarIcon,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TxStatus = "completed" | "pending" | "flagged" | "cancelled"

interface Transaction {
  id: string
  userId: string
  userName: string
  type: "credit" | "debit"
  description: string
  amount: number
  currency: string
  status: TxStatus
  reference: string | null
  createdAt: string
  transferType: "internal" | "swift" | "wire" | "scheduled" | null
  fromAccountId: string | null
}

interface UserOption {
  id: string
  name: string
  email: string | null
}

interface AccountOption {
  id: string
  name: string
  currency: string
  balance: number
}

interface WalletOption {
  id: string
  currency: string
  symbol: string
  balance: number
}

type DepositMode = "deposit" | "deduct"
type DeductTarget = "account" | "wallet"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Returns local datetime string for <input type="datetime-local"> defaulting to now */
function toDatetimeLocal(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/** Returns true if the description suggests a check deposit or loan application */
function isCheckOrLoan(description: string): boolean {
  const d = description.toLowerCase()
  return d.includes("check deposit") || d.includes("mobile check") || d.includes("loan")
}

/**
 * Extracts storage paths from a reference string.
 * Handles:
 *  - plain string:  "checks/uuid/check_123.jpeg"
 *  - JSON array:    ["collaterals/uuid/collateral_123.png", ...]
 * Returns only entries that look like image paths.
 */
function extractImagePaths(reference: string | null): string[] {
  if (!reference) return []

  const imageExtensions = /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|avif)$/i

  // Try JSON array first
  if (reference.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(reference)
      if (Array.isArray(parsed)) {
        return parsed.filter((p): p is string => typeof p === "string" && imageExtensions.test(p))
      }
    } catch {
      // fall through
    }
  }

  // Plain string
  if (imageExtensions.test(reference.trim())) {
    return [reference.trim()]
  }

  return []
}

// ---------------------------------------------------------------------------
// Image Lightbox
// ---------------------------------------------------------------------------

interface LightboxProps {
  urls: string[]
  onClose: () => void
}

function ImageLightbox({ urls, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowRight") setCurrent((c) => Math.min(c + 1, urls.length - 1))
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(c - 1, 0))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [urls.length, onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] max-w-4xl flex-col gap-3 rounded-xl bg-background p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-foreground">
            {urls.length > 1 ? `Document ${current + 1} of ${urls.length}` : "Document Preview"}
          </p>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Image */}
        <img
          src={urls[current]}
          alt={`Document ${current + 1}`}
          className="max-h-[70vh] w-auto rounded-lg object-contain border border-border"
        />

        {/* Navigation */}
        {urls.length > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current === 0}
              onClick={() => setCurrent((c) => c - 1)}
            >
              ← Prev
            </Button>
            <div className="flex gap-1.5">
              {urls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i === current ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={current === urls.length - 1}
              onClick={() => setCurrent((c) => c + 1)}
            >
              Next →
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Reference Cell — shows image trigger for check/loan rows
// ---------------------------------------------------------------------------

interface ReferenceCellProps {
  tx: Transaction
  supabase: ReturnType<typeof createClient>
}

function ReferenceCell({ tx, supabase }: ReferenceCellProps) {
  const [signedUrls, setSignedUrls] = useState<string[]>([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const imagePaths = isCheckOrLoan(tx.description) ? extractImagePaths(tx.reference) : []
  const hasImages = imagePaths.length > 0

  async function openLightbox() {
    if (signedUrls.length > 0) {
      setLightboxOpen(true)
      return
    }
    setLoading(true)
    const urls: string[] = []
    for (const path of imagePaths) {
      const { data } = await supabase.storage
        .from("statement-documents")
        .createSignedUrl(path, 60 * 60) // 1-hour signed URL
      if (data?.signedUrl) urls.push(data.signedUrl)
    }
    setSignedUrls(urls)
    setLoading(false)
    if (urls.length > 0) setLightboxOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        {/* Plain reference text */}
        {tx.reference && !hasImages && (
          <span className="font-mono text-xs text-muted-foreground">
            {tx.reference.length > 30 ? `${tx.reference.slice(0, 30)}…` : tx.reference}
          </span>
        )}

        {/* Image trigger button */}
        {hasImages && (
          <button
            onClick={openLightbox}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <FileImage className="h-3 w-3" />
            )}
            {imagePaths.length === 1 ? "View Document" : `View ${imagePaths.length} Documents`}
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </button>
        )}

        {/* Show truncated path as secondary label */}
        {hasImages && (
          <span className="font-mono text-[10px] text-muted-foreground/60">
            {imagePaths[0].split("/").pop()}
            {imagePaths.length > 1 && ` +${imagePaths.length - 1} more`}
          </span>
        )}

        {/* No reference */}
        {!tx.reference && <span className="text-xs text-muted-foreground">—</span>}
      </div>

      {lightboxOpen && signedUrls.length > 0 && (
        <ImageLightbox urls={signedUrls} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Cash Deposit Modal
// ---------------------------------------------------------------------------

interface CashDepositModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function CashDepositModal({ open, onClose, onSuccess }: CashDepositModalProps) {
  const supabase = createClient()

  const [mode, setMode] = useState<DepositMode>("deposit")
  const [deductTarget, setDeductTarget] = useState<DeductTarget>("account")
  const [users, setUsers] = useState<UserOption[]>([])
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [wallets, setWallets] = useState<WalletOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingTargets, setLoadingTargets] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [selectedWalletId, setSelectedWalletId] = useState("")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [userSearch, setUserSearch] = useState("")
  // Date override — defaults to now when modal opens
  const [transactionDate, setTransactionDate] = useState<string>(toDatetimeLocal())

  // Reset date to now whenever the modal opens
  useEffect(() => {
    if (open) setTransactionDate(toDatetimeLocal())
  }, [open])

  useEffect(() => {
    if (!open) return
    setLoadingUsers(true)
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .order("first_name")
      .then(({ data }) => {
        setUsers(
          (data ?? []).map((p) => ({
            id: p.id,
            name: [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Unknown",
            email: p.email,
          }))
        )
        setLoadingUsers(false)
      })
  }, [open])

  useEffect(() => {
    if (!selectedUserId) {
      setAccounts([])
      setWallets([])
      setSelectedAccountId("")
      setSelectedWalletId("")
      return
    }
    setLoadingTargets(true)
    Promise.all([
      supabase
        .from("accounts")
        .select("id, name, currency, balance")
        .eq("user_id", selectedUserId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("wallets")
        .select("id, currency, symbol, balance")
        .eq("user_id", selectedUserId)
        .order("currency"),
    ]).then(([accRes, walRes]) => {
      setAccounts(accRes.data ?? [])
      setWallets(walRes.data ?? [])
      setSelectedAccountId("")
      setSelectedWalletId("")
      setLoadingTargets(false)
    })
  }, [selectedUserId])

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)
  const selectedWallet = wallets.find((w) => w.id === selectedWalletId)

  const previewBalance = (() => {
    const amt = parseFloat(amount)
    if (isNaN(amt)) return null
    if (mode === "deposit" || deductTarget === "account") {
      if (!selectedAccount) return null
      const next = mode === "deposit" ? selectedAccount.balance + amt : selectedAccount.balance - amt
      return { value: next, currency: selectedAccount.currency }
    } else {
      if (!selectedWallet) return null
      return { value: selectedWallet.balance - amt, currency: selectedWallet.currency }
    }
  })()

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(userSearch.toLowerCase())
  )

  function reset() {
    setMode("deposit")
    setDeductTarget("account")
    setSelectedUserId("")
    setSelectedAccountId("")
    setSelectedWalletId("")
    setAmount("")
    setReference("")
    setUserSearch("")
    setError(null)
    setAccounts([])
    setWallets([])
    setTransactionDate(toDatetimeLocal())
  }

  async function handleSubmit() {
    const needsAccount = mode === "deposit" || deductTarget === "account"
    const needsWallet = mode === "deduct" && deductTarget === "wallet"

    if (!selectedUserId || (!selectedAccountId && needsAccount) || (!selectedWalletId && needsWallet) || !amount) {
      setError("Please fill in all required fields.")
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount.")
      return
    }

    if (mode === "deduct") {
      if (deductTarget === "account" && selectedAccount && parsedAmount > selectedAccount.balance) {
        setError(`Insufficient account balance. Available: ${formatCurrency(selectedAccount.balance, selectedAccount.currency)}`)
        return
      }
      if (deductTarget === "wallet" && selectedWallet && parsedAmount > selectedWallet.balance) {
        setError(`Insufficient wallet balance. Available: ${selectedWallet.symbol}${selectedWallet.balance.toLocaleString()} ${selectedWallet.currency}`)
        return
      }
    }

    setSubmitting(true)
    setError(null)

    const { data: { user: adminUser } } = await supabase.auth.getUser()
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", adminUser!.id)
      .single()
    const adminName = [adminProfile?.first_name, adminProfile?.last_name].filter(Boolean).join(" ") || "Admin"
    const selectedUser = users.find((u) => u.id === selectedUserId)!
    const ref = reference.trim() || `${mode === "deposit" ? "CASH-DEP" : "CASH-DED"}-${Date.now()}`

    // Convert the local datetime string to an ISO timestamp
    const overrideTimestamp = transactionDate
      ? new Date(transactionDate).toISOString()
      : new Date().toISOString()

    if (mode === "deposit") {
      const { error: depositErr } = await supabase.rpc("admin_cash_deposit", {
        p_account_id: selectedAccountId,
        p_user_id: selectedUserId,
        p_amount: parsedAmount,
        p_reference: ref,
      })
      if (depositErr) {
        setError(`Deposit failed: ${depositErr.message}`)
        setSubmitting(false)
        return
      }

      // Patch the transaction's created_at to the admin-chosen date
      await supabase
        .from("transactions")
        .update({ created_at: overrideTimestamp })
        .eq("reference", ref)
        .eq("user_id", selectedUserId)

      await supabase.from("audit_logs").insert({
        action: `Cash deposit of ${formatCurrency(parsedAmount, selectedAccount!.currency)} into account "${selectedAccount!.name}". Ref: ${ref}. Dated: ${formatDate(overrideTimestamp)}`,
        target_user_id: selectedUserId,
        target_user_name: selectedUser.name,
        admin_name: adminName,
        log_type: "transaction",
      })
      await supabase.from("notifications").insert({
        user_id: selectedUserId,
        title: "Cash Deposit Received",
        message: `${formatCurrency(parsedAmount, selectedAccount!.currency)} has been deposited into your account "${selectedAccount!.name}". Reference: ${ref}`,
        type: "transfer",
      })
    } else {
      const { error: deductErr } = await supabase.rpc("admin_cash_deduct", {
        p_target: deductTarget,
        p_account_id: deductTarget === "account" ? selectedAccountId : null,
        p_wallet_id: deductTarget === "wallet" ? selectedWalletId : null,
        p_user_id: selectedUserId,
        p_amount: parsedAmount,
        p_reference: ref,
      })
      if (deductErr) {
        setError(`Deduction failed: ${deductErr.message}`)
        setSubmitting(false)
        return
      }

      // Patch the transaction's created_at to the admin-chosen date
      await supabase
        .from("transactions")
        .update({ created_at: overrideTimestamp })
        .eq("reference", ref)
        .eq("user_id", selectedUserId)

      const targetLabel = deductTarget === "account" ? `account "${selectedAccount!.name}"` : `${selectedWallet!.currency} wallet`
      const currency = deductTarget === "account" ? selectedAccount!.currency : selectedWallet!.currency
      await supabase.from("audit_logs").insert({
        action: `Cash deduction of ${formatCurrency(parsedAmount, currency)} from ${targetLabel}. Ref: ${ref}. Dated: ${formatDate(overrideTimestamp)}`,
        target_user_id: selectedUserId,
        target_user_name: selectedUser.name,
        admin_name: adminName,
        log_type: "transaction",
      })
      await supabase.from("notifications").insert({
        user_id: selectedUserId,
        title: "Account Adjustment",
        message: `${formatCurrency(parsedAmount, currency)} has been deducted from your ${targetLabel}. Reference: ${ref}`,
        type: "transfer",
      })
    }

    setSubmitting(false)
    reset()
    onSuccess()
  }

  const isDeposit = mode === "deposit"
  const showAccountPicker = isDeposit || deductTarget === "account"
  const showWalletPicker = !isDeposit && deductTarget === "wallet"

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            {isDeposit ? "Record Cash Deposit" : "Record Cash Deduction"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
            <button type="button" onClick={() => setMode("deposit")}
              className={`flex-1 py-2 transition-colors ${isDeposit ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
              + Deposit
            </button>
            <button type="button" onClick={() => setMode("deduct")}
              className={`flex-1 py-2 transition-colors ${!isDeposit ? "bg-destructive text-destructive-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
              − Deduct
            </button>
          </div>

          {!isDeposit && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Deduct From</Label>
              <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
                <button type="button" onClick={() => setDeductTarget("account")}
                  className={`flex-1 py-2 transition-colors ${deductTarget === "account" ? "bg-muted text-foreground font-semibold" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                  Account
                </button>
                <button type="button" onClick={() => setDeductTarget("wallet")}
                  className={`flex-1 py-2 transition-colors ${deductTarget === "wallet" ? "bg-muted text-foreground font-semibold" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                  Wallet
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Customer <span className="text-destructive">*</span></Label>
            <Input placeholder="Search by name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="mb-1" />
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading users…
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={(v) => { setSelectedUserId(v); setUserSearch(users.find((u) => u.id === v)?.name ?? "") }}>
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {filteredUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="font-medium">{u.name}</span>
                      {u.email && <span className="ml-2 text-xs text-muted-foreground">{u.email}</span>}
                    </SelectItem>
                  ))}
                  {filteredUsers.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No users found</div>}
                </SelectContent>
              </Select>
            )}
          </div>

          {showAccountPicker && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">{isDeposit ? "Deposit Into Account" : "Deduct From Account"} <span className="text-destructive">*</span></Label>
              {loadingTargets ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading accounts…</div>
              ) : (
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId} disabled={!selectedUserId || accounts.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedUserId ? "Select a customer first" : accounts.length === 0 ? "No accounts found" : "Select account"} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.name}</span>
                          <span className="text-xs text-muted-foreground">{a.currency} — {formatCurrency(a.balance, a.currency)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {showWalletPicker && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Deduct From Wallet <span className="text-destructive">*</span></Label>
              {loadingTargets ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading wallets…</div>
              ) : (
                <Select value={selectedWalletId} onValueChange={setSelectedWalletId} disabled={!selectedUserId || wallets.length === 0}>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedUserId ? "Select a customer first" : wallets.length === 0 ? "No wallets found" : "Select wallet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{w.symbol} {w.currency}</span>
                          <span className="text-xs text-muted-foreground">{formatCurrency(w.balance, w.currency)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">
              Amount <span className="text-muted-foreground">({showAccountPicker ? (selectedAccount?.currency ?? "—") : (selectedWallet?.currency ?? "—")})</span>{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {previewBalance !== null && amount && !isNaN(parseFloat(amount)) && (
              <p className={`text-xs ${previewBalance.value < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                New balance: <span className="font-medium text-foreground">{formatCurrency(previewBalance.value, previewBalance.currency)}</span>
                {previewBalance.value < 0 && " — will go negative"}
              </p>
            )}
          </div>

          {/* ── Transaction Date Override ── */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
              Transaction Date
              <span className="text-muted-foreground">(defaults to now)</span>
            </Label>
            <Input
              type="datetime-local"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              max={toDatetimeLocal()}
              className="text-xs"
            />
            {transactionDate && new Date(transactionDate) < new Date(Date.now() - 60_000) && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Backdated transaction — will be recorded with historical date
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Reference <span className="text-muted-foreground">(auto-generated if blank)</span></Label>
            <Input placeholder={isDeposit ? "e.g. CASH-DEP-2026-001" : "e.g. CASH-DED-2026-001"} value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onClose() }} disabled={submitting}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedUserId || (showAccountPicker && !selectedAccountId) || (showWalletPicker && !selectedWalletId) || !amount}
            variant={isDeposit ? "default" : "destructive"}
            className="gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? (isDeposit ? "Processing…" : "Deducting…") : (isDeposit ? "Record Deposit" : "Record Deduction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Approve Transaction Modal — shown when admin clicks "Complete" on a pending tx
// ---------------------------------------------------------------------------

interface ApproveTransactionModalProps {
  tx: Transaction | null
  onClose: () => void
  onConfirm: (tx: Transaction, overrideDate: string) => void
  processing: boolean
}

function ApproveTransactionModal({ tx, onClose, onConfirm, processing }: ApproveTransactionModalProps) {
  const [approvalDate, setApprovalDate] = useState<string>(toDatetimeLocal())

  // Reset to now whenever a new transaction is opened
  useEffect(() => {
    if (tx) setApprovalDate(toDatetimeLocal())
  }, [tx?.id])

  if (!tx) return null

  const isBackdated = approvalDate && new Date(approvalDate) < new Date(Date.now() - 60_000)

  return (
    <Dialog open={!!tx} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Complete Transaction
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Transaction summary */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Customer</span>
              <span className="text-xs font-medium text-foreground">{tx.userName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Description</span>
              <span className="text-xs font-medium text-foreground truncate max-w-[180px]">{tx.description}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Amount</span>
              <span className={`text-xs font-semibold font-mono ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                {tx.type === "credit" ? "+" : "−"}{formatCurrency(Math.abs(tx.amount), tx.currency)}
              </span>
            </div>
            {tx.reference && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Reference</span>
                <span className="text-xs font-mono text-muted-foreground">{tx.reference.slice(0, 24)}{tx.reference.length > 24 ? "…" : ""}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Original Date</span>
              <span className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</span>
            </div>
          </div>

          {/* Date override */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <CalendarIcon className="h-3 w-3 text-muted-foreground" />
              Completion Date
              <span className="text-muted-foreground">(defaults to now)</span>
            </Label>
            <Input
              type="datetime-local"
              value={approvalDate}
              onChange={(e) => setApprovalDate(e.target.value)}
              className="text-xs"
            />
            {isBackdated ? (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Transaction will be completed with a historical date
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                This sets the <code className="text-[10px] bg-muted px-1 rounded">created_at</code> timestamp on the transaction record.
              </p>
            )}
          </div>

          {isCheckOrLoan(tx.description) && tx.type === "credit" && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 rounded-md border border-border bg-muted/40 px-3 py-2">
              <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
              Funds will be credited to the customer's account balance.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={processing}>Cancel</Button>
          <Button
            onClick={() => onConfirm(tx, approvalDate || toDatetimeLocal())}
            disabled={processing || !approvalDate}
            className="gap-2 border-success/40 bg-success/10 text-success hover:bg-success/20"
            variant="outline"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {processing ? "Processing…" : "Confirm & Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminTransactionsPage() {
  const supabase = createClient()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [depositModalOpen, setDepositModalOpen] = useState(false)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Approval modal state
  const [pendingApprovalTx, setPendingApprovalTx] = useState<Transaction | null>(null)

  async function fetchTransactions() {
    setLoading(true)
    setError(null)

    const [txRes, trRes] = await Promise.all([
      supabase
        .from("transactions")
        .select(`id, user_id, type, description, amount, currency, status, reference, created_at, profiles (first_name, last_name)`)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("transfers")
        .select("reference, transfer_type, from_account_id")
        .limit(500),
    ])

    if (txRes.error) {
      setError("Failed to load transactions.")
      setLoading(false)
      return
    }

    const transferMap = new Map<string, { transferType: string; fromAccountId: string | null }>()
    for (const t of trRes.data ?? []) {
      if (t.reference) {
        transferMap.set(t.reference, {
          transferType: t.transfer_type,
          fromAccountId: t.from_account_id ?? null,
        })
      }
    }

    setTransactions(
      (txRes.data ?? []).map((tx: any) => {
        const profile = Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles
        const transfer = tx.reference ? transferMap.get(tx.reference) : undefined
        return {
          id: tx.id,
          userId: tx.user_id,
          userName: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Unknown",
          type: tx.type as "credit" | "debit",
          description: tx.description,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status as TxStatus,
          reference: tx.reference,
          createdAt: tx.created_at,
          transferType: (transfer?.transferType ?? null) as Transaction["transferType"],
          fromAccountId: transfer?.fromAccountId ?? null,
        }
      })
    )
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  async function getAdminName(): Promise<string> {
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", adminUser!.id)
      .single()
    return [adminProfile?.first_name, adminProfile?.last_name].filter(Boolean).join(" ") || "Admin"
  }

  // -------------------------------------------------------------------------
  // Complete pending transaction (called after modal confirmation with date)
  // -------------------------------------------------------------------------

  async function completeTransaction(tx: Transaction, overrideDate?: string) {
    setProcessingId(tx.id)
    setPendingApprovalTx(null)
    const adminName = await getAdminName()

    const completionTimestamp = overrideDate
      ? new Date(overrideDate).toISOString()
      : new Date().toISOString()

    // ── Check deposit / Loan: use admin_cash_deposit RPC ──
    if (tx.type === "credit" && isCheckOrLoan(tx.description)) {
      const { data: accountRows, error: accountFetchErr } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", tx.userId)
        .eq("currency", tx.currency)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)

      if (accountFetchErr || !accountRows || accountRows.length === 0) {
        console.error("completeTransaction: no matching account found", tx.userId, tx.currency, accountFetchErr)
        setProcessingId(null)
        return
      }

      const { error: rpcErr } = await supabase.rpc("admin_cash_deposit", {
        p_account_id: accountRows[0].id,
        p_user_id:    tx.userId,
        p_amount:     tx.amount,
        p_reference:  tx.reference ?? tx.id,
      })

      if (rpcErr) {
        console.error("completeTransaction: admin_cash_deposit RPC failed", rpcErr)
        setProcessingId(null)
        return
      }
    }

    // Update status and apply the date override
    await supabase
      .from("transactions")
      .update({ status: "completed", created_at: completionTimestamp })
      .eq("id", tx.id)

    await supabase.from("audit_logs").insert({
      action: `Pending transaction completed: ${tx.description} (${formatCurrency(tx.amount, tx.currency)}). Dated: ${formatDate(completionTimestamp)}`,
      target_user_id: tx.userId,
      target_user_name: tx.userName,
      admin_name: adminName,
      log_type: "transaction",
    })

    await supabase.from("notifications").insert({
      user_id: tx.userId,
      title: "Transaction Completed",
      message: `Your ${tx.type === "credit" ? "incoming" : "outgoing"} transaction of ${formatCurrency(tx.amount, tx.currency)} has been completed. Reference: ${tx.reference ?? tx.id}`,
      type: "transfer",
    })

    setTransactions((prev) =>
      prev.map((t) =>
        t.id === tx.id
          ? { ...t, status: "completed", createdAt: completionTimestamp }
          : t
      )
    )
    setProcessingId(null)
  }

  // -------------------------------------------------------------------------
  // Decline pending transaction
  // -------------------------------------------------------------------------

  async function declineTransaction(tx: Transaction) {
    setProcessingId(tx.id)
    const adminName = await getAdminName()

    if (tx.type === "debit") {
      if (tx.transferType === "internal" && tx.fromAccountId) {
        const { data: accountData } = await supabase
          .from("accounts")
          .select("id, balance")
          .eq("id", tx.fromAccountId)
          .single()
        if (accountData) {
          await supabase
            .from("accounts")
            .update({ balance: accountData.balance + tx.amount })
            .eq("id", accountData.id)
        }
      } else {
        const { data: walletData } = await supabase
          .from("wallets")
          .select("id, balance")
          .eq("user_id", tx.userId)
          .eq("currency", tx.currency)
          .single()
        if (walletData && walletData.balance >= 0) {
          await supabase
            .from("wallets")
            .update({ balance: walletData.balance + tx.amount })
            .eq("id", walletData.id)
        }
      }
    }

    await supabase
      .from("transactions")
      .update({ status: "cancelled" })
      .eq("id", tx.id)

    const revertNote =
      tx.type === "debit"
        ? tx.transferType === "internal"
          ? " (account balance reverted)"
          : " (wallet balance reverted)"
        : ""

    await supabase.from("audit_logs").insert({
      action: `Pending transaction declined${revertNote}: ${tx.description} (${formatCurrency(tx.amount, tx.currency)})`,
      target_user_id: tx.userId,
      target_user_name: tx.userName,
      admin_name: adminName,
      log_type: "transaction",
    })

    await supabase.from("notifications").insert({
      user_id: tx.userId,
      title: "Transaction Declined",
      message: `Your transaction of ${formatCurrency(tx.amount, tx.currency)} has been declined. Reference: ${tx.reference ?? tx.id}. Contact support for assistance.`,
      type: "security",
    })

    setTransactions((prev) =>
      prev.map((t) => (t.id === tx.id ? { ...t, status: "cancelled" } : t))
    )
    setProcessingId(null)
  }

  async function clearFlag(tx: Transaction) {
    setProcessingId(tx.id)
    const adminName = await getAdminName()

    await supabase.from("transactions").update({ status: "completed" }).eq("id", tx.id)
    await supabase.from("audit_logs").insert({
      action: `Flagged transaction cleared: ${tx.description} (${formatCurrency(tx.amount, tx.currency)})`,
      target_user_id: tx.userId,
      target_user_name: tx.userName,
      admin_name: adminName,
      log_type: "transaction",
    })

    setTransactions((prev) =>
      prev.map((t) => (t.id === tx.id ? { ...t, status: "completed" } : t))
    )
    setProcessingId(null)
  }

  async function blockTransaction(tx: Transaction) {
    setProcessingId(tx.id)
    const adminName = await getAdminName()

    if (tx.type === "debit") {
      if (tx.transferType === "internal" && tx.fromAccountId) {
        const { data: accountData } = await supabase
          .from("accounts")
          .select("id, balance")
          .eq("id", tx.fromAccountId)
          .single()
        if (accountData) {
          await supabase
            .from("accounts")
            .update({ balance: accountData.balance + tx.amount })
            .eq("id", accountData.id)
        }
      } else {
        const { data: walletData } = await supabase
          .from("wallets")
          .select("id, balance")
          .eq("user_id", tx.userId)
          .eq("currency", tx.currency)
          .single()
        if (walletData && walletData.balance >= 0) {
          await supabase
            .from("wallets")
            .update({ balance: walletData.balance + tx.amount })
            .eq("id", walletData.id)
        }
      }
    }

    await supabase.from("transactions").update({ status: "cancelled" }).eq("id", tx.id)
    await supabase.from("audit_logs").insert({
      action: `Transaction blocked/cancelled: ${tx.description} (${formatCurrency(tx.amount, tx.currency)})`,
      target_user_id: tx.userId,
      target_user_name: tx.userName,
      admin_name: adminName,
      log_type: "transaction",
    })
    await supabase.from("notifications").insert({
      user_id: tx.userId,
      title: "Transaction Blocked",
      message: `A transaction of ${formatCurrency(tx.amount, tx.currency)} has been blocked by compliance. Reference: ${tx.reference ?? tx.id}`,
      type: "security",
    })

    setTransactions((prev) =>
      prev.map((t) => (t.id === tx.id ? { ...t, status: "cancelled" } : t))
    )
    setProcessingId(null)
  }

  // -------------------------------------------------------------------------
  // Filter
  // -------------------------------------------------------------------------

  const flaggedCount = transactions.filter((tx) => tx.status === "flagged").length
  const pendingCount = transactions.filter((tx) => tx.status === "pending").length

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase()) ||
      tx.userName.toLowerCase().includes(search.toLowerCase()) ||
      (tx.reference ?? "").toLowerCase().includes(search.toLowerCase())
    const matchesFilter = filter === "all" || tx.status === filter
    return matchesSearch && matchesFilter
  })

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Transaction Monitoring</h1>
          <p className="text-sm text-muted-foreground">Review and manage all platform transactions</p>
        </div>
        <Button className="shrink-0 gap-2" onClick={() => setDepositModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Cash Deposit
        </Button>
      </div>

      {/* Alert banners */}
      <div className="flex flex-col gap-3">
        {flaggedCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Suspicious Transaction{flaggedCount > 1 ? "s" : ""} Detected</p>
              <p className="text-xs text-muted-foreground">{flaggedCount} transaction{flaggedCount > 1 ? "s" : ""} flagged for AML review — immediate attention required</p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => setFilter("flagged")}>Review Now</Button>
          </div>
        )}
        {pendingCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <Clock className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Pending Transaction{pendingCount > 1 ? "s" : ""} Awaiting Review</p>
              <p className="text-xs text-muted-foreground">{pendingCount} transaction{pendingCount > 1 ? "s" : ""} require approval before funds are settled</p>
            </div>
            <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10" onClick={() => setFilter("pending")}>Review</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by description, user, reference or ID..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />Loading transactions…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchTransactions}>Retry</Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No transactions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Customer</th>
                    <th className="p-4 font-medium">Description</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Reference</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((tx) => {
                    const isProcessing = processingId === tx.id
                    return (
                      <tr
                        key={tx.id}
                        className={`transition-colors hover:bg-muted/50 ${
                          tx.status === "flagged" ? "bg-destructive/5" : tx.status === "pending" ? "bg-amber-500/5" : ""
                        }`}
                      >
                        <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">{formatDate(tx.createdAt)}</td>
                        <td className="p-4"><p className="font-medium text-foreground">{tx.userName}</p></td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tx.type === "credit" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                              {tx.type === "credit" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{tx.description}</span>
                              {tx.transferType && (
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{tx.transferType}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`p-4 font-mono font-semibold whitespace-nowrap ${tx.type === "credit" ? "text-success" : "text-foreground"}`}>
                          {tx.type === "credit" ? "+" : "−"}{formatCurrency(Math.abs(tx.amount), tx.currency)}
                        </td>

                        {/* ── Reference cell with image viewer ── */}
                        <td className="p-4">
                          <ReferenceCell tx={tx} supabase={supabase} />
                        </td>

                        <td className="p-4">
                          <Badge
                            variant={tx.status === "completed" ? "secondary" : tx.status === "pending" ? "outline" : tx.status === "flagged" ? "destructive" : "outline"}
                            className={tx.status === "pending" ? "border-amber-500/40 text-amber-600" : tx.status === "cancelled" ? "text-muted-foreground" : ""}
                          >
                            {tx.status === "flagged" && <AlertTriangle className="mr-1 h-3 w-3" />}
                            {tx.status === "pending" && <Clock className="mr-1 h-3 w-3" />}
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {tx.status === "pending" && (
                            <div className="flex gap-1">
                              {/* Complete — opens the approval modal with date picker */}
                              <Button
                                size="sm" variant="outline"
                                className="h-7 gap-1 text-xs border-success/40 text-success hover:bg-success/10"
                                disabled={isProcessing}
                                onClick={() => setPendingApprovalTx(tx)}
                              >
                                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Complete
                                {isCheckOrLoan(tx.description) && tx.type === "credit" && (
                                  <span className="ml-0.5 text-[10px] opacity-70">→ acct</span>
                                )}
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                className="h-7 gap-1 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                                disabled={isProcessing}
                                onClick={() => declineTransaction(tx)}
                              >
                                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                                Decline
                                {tx.type === "debit" && <span className="ml-0.5 text-[10px] opacity-70">+ revert</span>}
                              </Button>
                            </div>
                          )}
                          {tx.status === "flagged" && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" disabled={isProcessing} onClick={() => clearFlag(tx)}>
                                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Clear
                              </Button>
                              <Button size="sm" variant="destructive" className="h-7 gap-1 text-xs" disabled={isProcessing} onClick={() => blockTransaction(tx)}>
                                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                                Block
                              </Button>
                            </div>
                          )}
                          {tx.status !== "pending" && tx.status !== "flagged" && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CashDepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        onSuccess={() => { setDepositModalOpen(false); fetchTransactions() }}
      />

      <ApproveTransactionModal
        tx={pendingApprovalTx}
        onClose={() => setPendingApprovalTx(null)}
        onConfirm={(tx, date) => completeTransaction(tx, date)}
        processing={processingId === pendingApprovalTx?.id}
      />
    </div>
  )
}