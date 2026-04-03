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
}

interface UserOption {
  id: string
  name: string
  email: string | null
}

interface WalletOption {
  id: string
  currency: string
  symbol: string
  balance: number
}

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

  const [users, setUsers] = useState<UserOption[]>([])
  const [wallets, setWallets] = useState<WalletOption[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingWallets, setLoadingWallets] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedUserId, setSelectedUserId] = useState("")
  const [selectedWalletId, setSelectedWalletId] = useState("")
  const [amount, setAmount] = useState("")
  const [reference, setReference] = useState("")
  const [userSearch, setUserSearch] = useState("")

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
            name:
              [p.first_name, p.last_name].filter(Boolean).join(" ") ||
              p.email ||
              "Unknown",
            email: p.email,
          }))
        )
        setLoadingUsers(false)
      })
  }, [open])

  useEffect(() => {
    if (!selectedUserId) {
      setWallets([])
      setSelectedWalletId("")
      return
    }
    setLoadingWallets(true)
    supabase
      .from("wallets")
      .select("id, currency, symbol, balance")
      .eq("user_id", selectedUserId)
      .then(({ data }) => {
        setWallets(data ?? [])
        setSelectedWalletId("")
        setLoadingWallets(false)
      })
  }, [selectedUserId])

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId)
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(userSearch.toLowerCase())
  )

  function reset() {
    setSelectedUserId("")
    setSelectedWalletId("")
    setAmount("")
    setReference("")
    setUserSearch("")
    setError(null)
    setWallets([])
  }

  async function handleSubmit() {
    if (!selectedUserId || !selectedWalletId || !amount) {
      setError("Please fill in all required fields.")
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount.")
      return
    }

    if (!selectedWallet) return

    setSubmitting(true)
    setError(null)

    const { data: { user: adminUser } } = await supabase.auth.getUser()
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", adminUser!.id)
      .single()
    const adminName =
      [adminProfile?.first_name, adminProfile?.last_name]
        .filter(Boolean)
        .join(" ") || "Admin"

    const selectedUser = users.find((u) => u.id === selectedUserId)!
    const ref = reference.trim() || `CASH-DEP-${Date.now()}`

    const { error: txErr } = await supabase.from("transactions").insert({
      user_id: selectedUserId,
      type: "credit",
      description: `Cash Deposit — ${selectedWallet.currency}`,
      amount: parsedAmount,
      currency: selectedWallet.currency,
      status: "completed",
      reference: ref,
    })

    if (txErr) {
      setError(`Failed to create transaction: ${txErr.message}`)
      setSubmitting(false)
      return
    }

    const { error: walletErr } = await supabase
      .from("wallets")
      .update({ balance: selectedWallet.balance + parsedAmount })
      .eq("id", selectedWalletId)

    if (walletErr) {
      setError(`Transaction created but wallet update failed: ${walletErr.message}`)
      setSubmitting(false)
      return
    }

    await supabase.from("audit_logs").insert({
      action: `Cash deposit of ${formatCurrency(parsedAmount, selectedWallet.currency)} into ${selectedWallet.currency} wallet. Ref: ${ref}`,
      target_user_id: selectedUserId,
      target_user_name: selectedUser.name,
      admin_name: adminName,
      log_type: "transaction",
    })

    await supabase.from("notifications").insert({
      user_id: selectedUserId,
      title: "Cash Deposit Received",
      message: `${formatCurrency(parsedAmount, selectedWallet.currency)} has been deposited into your ${selectedWallet.currency} wallet. Reference: ${ref}`,
      type: "transfer",
    })

    setSubmitting(false)
    reset()
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">
            Record Cash Deposit
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">
              Customer <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="mb-1"
            />
            {loadingUsers ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading users…
              </div>
            ) : (
              <Select
                value={selectedUserId}
                onValueChange={(v) => {
                  setSelectedUserId(v)
                  setUserSearch(users.find((u) => u.id === v)?.name ?? "")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {filteredUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="font-medium">{u.name}</span>
                      {u.email && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {u.email}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No users found
                    </div>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">
              Deposit Into Wallet <span className="text-destructive">*</span>
            </Label>
            {loadingWallets ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading wallets…
              </div>
            ) : (
              <Select
                value={selectedWalletId}
                onValueChange={setSelectedWalletId}
                disabled={!selectedUserId || wallets.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedUserId
                        ? "Select a customer first"
                        : wallets.length === 0
                        ? "No wallets found"
                        : "Select wallet"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {w.symbol} {w.currency}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Current: {formatCurrency(w.balance, w.currency)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">
              Amount ({selectedWallet?.currency ?? "—"}){" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {selectedWallet?.symbol ?? "$"}
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-8"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {selectedWallet && amount && !isNaN(parseFloat(amount)) && (
              <p className="text-xs text-muted-foreground">
                New balance:{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(
                    selectedWallet.balance + parseFloat(amount),
                    selectedWallet.currency
                  )}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">
              Reference{" "}
              <span className="text-muted-foreground">(auto-generated if blank)</span>
            </Label>
            <Input
              placeholder="e.g. CASH-DEP-2026-001"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => { reset(); onClose() }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedUserId || !selectedWalletId || !amount}
            className="gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Processing…" : "Record Deposit"}
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

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  async function fetchTransactions() {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase
      .from("transactions")
      .select(`
        id,
        user_id,
        type,
        description,
        amount,
        currency,
        status,
        reference,
        created_at,
        profiles (
          first_name,
          last_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(200)

    if (err) {
      setError("Failed to load transactions.")
      setLoading(false)
      return
    }

    setTransactions(
      (data ?? []).map((tx) => {
        const profile = Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles
        return {
          id: tx.id,
          userId: tx.user_id,
          userName:
            [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
            "Unknown",
          type: tx.type as "credit" | "debit",
          description: tx.description,
          amount: tx.amount,
          currency: tx.currency,
          status: tx.status as TxStatus,
          reference: tx.reference,
          createdAt: tx.created_at,
        }
      })
    )
    setLoading(false)
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  // -------------------------------------------------------------------------
  // Shared: get admin identity
  // -------------------------------------------------------------------------

  async function getAdminName(): Promise<string> {
    const { data: { user: adminUser } } = await supabase.auth.getUser()
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", adminUser!.id)
      .single()
    return (
      [adminProfile?.first_name, adminProfile?.last_name].filter(Boolean).join(" ") ||
      "Admin"
    )
  }

  // -------------------------------------------------------------------------
  // Action: Complete pending transaction
  // Applies the balance change that was held in "pending" state.
  // -------------------------------------------------------------------------

  async function completeTransaction(tx: Transaction) {
    setProcessingId(tx.id)
    const adminName = await getAdminName()

    // Fetch the user's wallet for this currency
    const { data: walletData } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", tx.userId)
      .eq("currency", tx.currency)
      .single()

    if (walletData) {
      const delta = tx.type === "credit" ? tx.amount : -tx.amount
      await supabase
        .from("wallets")
        .update({ balance: walletData.balance + delta })
        .eq("id", walletData.id)
    }

    // Mark transaction completed
    await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", tx.id)

    await supabase.from("audit_logs").insert({
      action: `Pending transaction completed: ${tx.description} (${formatCurrency(tx.amount, tx.currency)})`,
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
      prev.map((t) => (t.id === tx.id ? { ...t, status: "completed" } : t))
    )
    setProcessingId(null)
  }

  // -------------------------------------------------------------------------
  // Action: Decline pending transaction
  // Cancels without applying balance change. If it was a debit that already
  // had funds held (i.e. balance was already debited on creation), revert it.
  // Convention: pending debits have already reduced the balance → revert.
  // Pending credits have NOT yet added funds → no revert needed.
  // -------------------------------------------------------------------------

  async function declineTransaction(tx: Transaction) {
    setProcessingId(tx.id)
    const adminName = await getAdminName()

    // Revert wallet only for pending debits (funds were held/already deducted)
    if (tx.type === "debit") {
      const { data: walletData } = await supabase
        .from("wallets")
        .select("id, balance")
        .eq("user_id", tx.userId)
        .eq("currency", tx.currency)
        .single()

      if (walletData) {
        await supabase
          .from("wallets")
          .update({ balance: walletData.balance + tx.amount })
          .eq("id", walletData.id)
      }
    }

    await supabase
      .from("transactions")
      .update({ status: "cancelled" })
      .eq("id", tx.id)

    await supabase.from("audit_logs").insert({
      action: `Pending transaction declined${tx.type === "debit" ? " (balance reverted)" : ""}: ${tx.description} (${formatCurrency(tx.amount, tx.currency)})`,
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

  // -------------------------------------------------------------------------
  // Action: Clear flagged transaction
  // -------------------------------------------------------------------------

  async function clearFlag(tx: Transaction) {
    setProcessingId(tx.id)
    const adminName = await getAdminName()

    await supabase
      .from("transactions")
      .update({ status: "completed" })
      .eq("id", tx.id)

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

  // -------------------------------------------------------------------------
  // Action: Block flagged transaction
  // -------------------------------------------------------------------------

  async function blockTransaction(tx: Transaction) {
    setProcessingId(tx.id)
    const adminName = await getAdminName()

    await supabase
      .from("transactions")
      .update({ status: "cancelled" })
      .eq("id", tx.id)

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
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Transaction Monitoring
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and manage all platform transactions
          </p>
        </div>
        <Button
          className="shrink-0 gap-2"
          onClick={() => setDepositModalOpen(true)}
        >
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
              <p className="text-sm font-medium text-foreground">
                Suspicious Transaction{flaggedCount > 1 ? "s" : ""} Detected
              </p>
              <p className="text-xs text-muted-foreground">
                {flaggedCount} transaction{flaggedCount > 1 ? "s" : ""} flagged
                for AML review — immediate attention required
              </p>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setFilter("flagged")}
            >
              Review Now
            </Button>
          </div>
        )}

        {pendingCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <Clock className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Pending Transaction{pendingCount > 1 ? "s" : ""} Awaiting Review
              </p>
              <p className="text-xs text-muted-foreground">
                {pendingCount} transaction{pendingCount > 1 ? "s" : ""} require
                approval before funds are settled
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10"
              onClick={() => setFilter("pending")}
            >
              Review
            </Button>
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
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
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
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading transactions…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchTransactions}>
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              No transactions found.
            </p>
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
                          tx.status === "flagged"
                            ? "bg-destructive/5"
                            : tx.status === "pending"
                            ? "bg-amber-500/5"
                            : ""
                        }`}
                      >
                        <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="p-4">
                          <p className="font-medium text-foreground">
                            {tx.userName}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                tx.type === "credit"
                                  ? "bg-success/10 text-success"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                            >
                              {tx.type === "credit" ? (
                                <ArrowDownLeft className="h-3 w-3" />
                              ) : (
                                <ArrowUpRight className="h-3 w-3" />
                              )}
                            </div>
                            <span className="font-medium text-foreground">
                              {tx.description}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`p-4 font-mono font-semibold whitespace-nowrap ${
                            tx.type === "credit"
                              ? "text-success"
                              : "text-foreground"
                          }`}
                        >
                          {tx.type === "credit" ? "+" : "−"}
                          {formatCurrency(Math.abs(tx.amount), tx.currency)}
                        </td>
                        <td className="p-4 font-mono text-xs text-muted-foreground">
                          {tx.reference ?? "—"}
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={
                              tx.status === "completed"
                                ? "secondary"
                                : tx.status === "pending"
                                ? "outline"
                                : tx.status === "flagged"
                                ? "destructive"
                                : "outline"
                            }
                            className={
                              tx.status === "pending"
                                ? "border-amber-500/40 text-amber-600"
                                : tx.status === "cancelled"
                                ? "text-muted-foreground"
                                : ""
                            }
                          >
                            {tx.status === "flagged" && (
                              <AlertTriangle className="mr-1 h-3 w-3" />
                            )}
                            {tx.status === "pending" && (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            {tx.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {/* ── Pending actions ── */}
                          {tx.status === "pending" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs border-success/40 text-success hover:bg-success/10"
                                disabled={isProcessing}
                                onClick={() => completeTransaction(tx)}
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
                                disabled={isProcessing}
                                onClick={() => declineTransaction(tx)}
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Ban className="h-3 w-3" />
                                )}
                                Decline
                                {tx.type === "debit" && (
                                  <span className="ml-0.5 text-[10px] opacity-70">
                                    + revert
                                  </span>
                                )}
                              </Button>
                            </div>
                          )}

                          {/* ── Flagged actions ── */}
                          {tx.status === "flagged" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs"
                                disabled={isProcessing}
                                onClick={() => clearFlag(tx)}
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3 w-3" />
                                )}
                                Clear
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 gap-1 text-xs"
                                disabled={isProcessing}
                                onClick={() => blockTransaction(tx)}
                              >
                                {isProcessing ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                                Block
                              </Button>
                            </div>
                          )}

                          {/* ── No actions ── */}
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

      <CashDepositModal
        open={depositModalOpen}
        onClose={() => setDepositModalOpen(false)}
        onSuccess={() => {
          setDepositModalOpen(false)
          fetchTransactions()
        }}
      />
    </div>
  )
}