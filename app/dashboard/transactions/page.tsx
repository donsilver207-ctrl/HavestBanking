"use client"

import { useState, useEffect } from "react"
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Download,
  Loader2,
  AlertCircle,
  ShieldCheck,
  X,
  KeyRound,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  DialogDescription,
} from "@/components/ui/dialog"
import { createBrowserClient } from "@supabase/ssr"

type Transaction = {
  id: string
  type: "credit" | "debit"
  description: string
  amount: number
  currency: string
  status: "completed" | "pending" | "flagged" | "cancelled"
  reference: string | null
  created_at: string
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))
}

function exportCSV(rows: Transaction[]) {
  const header = ["ID", "Date", "Description", "Type", "Amount", "Currency", "Status", "Reference"]
  const lines = rows.map(tx => [
    tx.id,
    formatDate(tx.created_at),
    `"${tx.description.replace(/"/g, '""')}"`,
    tx.type,
    tx.amount,
    tx.currency,
    tx.status,
    tx.reference ?? "",
  ].join(","))
  const csv = [header.join(","), ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Returns true if the transaction requires a verification code */
function requiresVerification(tx: Transaction) {
  const desc = tx.description.toUpperCase()
  return (
    tx.status === "pending" &&
    (desc.includes("SWIFT") || desc.includes("WIRE"))
  )
}

/** Parse existing code from reference, e.g. "REF-001 (Code:123456)" → "123456" */
function parseExistingCode(reference: string | null): string {
  if (!reference) return ""
  const match = reference.match(/\(Code:(\d{6})\)/)
  return match ? match[1] : ""
}

/** Build the new reference string */
function buildReference(existingRef: string | null, code: string): string {
  // Strip any previous code block
  const base = (existingRef ?? "").replace(/\s*\(Code:\d{6}\)/, "").trim()
  return base ? `${base} (Code:${code})` : `(Code:${code})`
}

// ── Verification Code Dialog ──────────────────────────────────────────────────

type VerifyDialogProps = {
  transaction: Transaction | null
  onClose: () => void
  onSuccess: (txId: string, newReference: string) => void
}

function VerifyDialog({ transaction, onClose, onSuccess }: VerifyDialogProps) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Pre-fill if code already saved
  useEffect(() => {
    if (transaction) {
      const existing = parseExistingCode(transaction.reference)
      if (existing.length === 6) {
        setDigits(existing.split(""))
      } else {
        setDigits(["", "", "", "", "", ""])
      }
      setError(null)
      setSuccess(false)
    }
  }, [transaction])

  const code = digits.join("")
  const isComplete = code.length === 6 && /^\d{6}$/.test(code)

  function handleDigit(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = char
    setDigits(next)
    setError(null)
    // Auto-advance
    if (char && index < 5) {
      const nextInput = document.getElementById(`digit-${index + 1}`)
      nextInput?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      const prev = document.getElementById(`digit-${index - 1}`)
      prev?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    const next = [...digits]
    pasted.split("").forEach((ch, i) => { if (i < 6) next[i] = ch })
    setDigits(next)
    const lastFilled = Math.min(pasted.length, 5)
    document.getElementById(`digit-${lastFilled}`)?.focus()
  }

  async function handleSubmit() {
    if (!transaction || !isComplete) return
    setSaving(true)
    setError(null)

    const newReference = buildReference(transaction.reference, code)

    const { data: updated, error: dbError } = await supabase
      .from("transactions")
      .update({ reference: newReference })
      .eq("id", transaction.id)
      .select("id, reference")

    setSaving(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    // RLS blocks update silently — no rows returned means permission denied
    if (!updated || updated.length === 0) {
      setError(
        "Update blocked — please run this SQL in your Supabase dashboard:\n" +
        "create policy \"transactions_update_own\" on public.transactions " +
        "for update using (auth.uid() = user_id);"
      )
      return
    }

    setSuccess(true)
    setTimeout(() => {
      onSuccess(transaction.id, newReference)
      onClose()
    }, 800)
  }

  if (!transaction) return null

  return (
    <Dialog open={!!transaction} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-foreground">Verification Required</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Enter the 6-digit code for this {transaction.description.toUpperCase().includes("SWIFT") ? "SWIFT" : "Wire"} transfer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Transaction Summary */}
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 space-y-1 text-sm">
          <p className="font-medium text-foreground truncate">{transaction.description}</p>
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>{formatDate(transaction.created_at)}</span>
            <span className={transaction.type === "credit" ? "text-success font-semibold" : "font-semibold"}>
              {transaction.type === "credit" ? "+" : "−"}
              {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
            </span>
          </div>
          {transaction.reference && (
            <p className="text-xs text-muted-foreground truncate">
              Ref: {transaction.reference.replace(/\s*\(Code:\d{6}\)/, "")}
            </p>
          )}
        </div>

        {/* Digit Inputs */}
        <div className="flex justify-center gap-2 py-2" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              id={`digit-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`
                h-12 w-10 rounded-lg border text-center text-lg font-mono font-semibold
                transition-all duration-150 outline-none
                bg-background text-foreground
                focus:border-primary focus:ring-2 focus:ring-primary/20
                ${d ? "border-primary/60" : "border-border"}
                ${error ? "border-destructive focus:ring-destructive/20" : ""}
                ${success ? "border-success bg-success/5" : ""}
              `}
            />
          ))}
        </div>

        {/* Reference preview */}
        {isComplete && !error && (
          <p className="text-center text-xs text-muted-foreground -mt-1">
            Reference will be saved as:{" "}
            <span className="font-mono text-foreground">
              {buildReference(transaction.reference, code)}
            </span>
          </p>
        )}

        {error && (
          <div className="flex flex-col gap-1.5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Save failed</span>
            </div>
            {error.includes("transactions_update_own") ? (
              <>
                <p className="text-destructive/80">Missing RLS update policy. Run this in your Supabase SQL editor:</p>
                <code className="block rounded bg-black/10 px-2 py-1.5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
                  {`create policy "transactions_update_own"\non public.transactions\nfor update using (auth.uid() = user_id);`}
                </code>
              </>
            ) : (
              <p>{error}</p>
            )}
          </div>
        )}

        {success && (
          <div className="flex items-center justify-center gap-2 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
            <ShieldCheck className="h-3.5 w-3.5" />
            Code saved successfully
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={handleSubmit}
            disabled={!isComplete || saving || success}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {saving ? "Saving…" : "Confirm Code"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const [verifyTx, setVerifyTx] = useState<Transaction | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Not authenticated"); setLoading(false); return }

      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, description, amount, currency, status, reference, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) { setError(error.message); setLoading(false); return }
      setTransactions(data ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  function handleVerifySuccess(txId: string, newReference: string) {
    setTransactions(prev =>
      prev.map(tx => tx.id === txId ? { ...tx, reference: newReference } : tx)
    )
  }

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.id.toLowerCase().includes(search.toLowerCase()) ||
      (tx.reference ?? "").toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || tx.status === statusFilter
    const matchesType = typeFilter === "all" || tx.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  if (error) return (
    <div className="flex h-64 flex-col items-center justify-center gap-2 text-destructive">
      <AlertCircle className="h-6 w-6" />
      <p className="text-sm">{error}</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Full transaction history across all accounts
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => exportCSV(filtered)}
          disabled={filtered.length === 0}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by description, ID or reference..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <Filter className="mr-2 h-4 w-4" />
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="debit">Debit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} Transaction{filtered.length !== 1 && "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">ID</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Description</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Currency</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((tx) => {
                  const needsCode = requiresVerification(tx)
                  const hasCode = !!parseExistingCode(tx.reference)

                  return (
                    <tr key={tx.id} className="group">
                      <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                        {tx.id.slice(0, 8)}…
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            tx.type === "credit"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive"
                          }`}>
                            {tx.type === "credit"
                              ? <ArrowDownLeft className="h-3.5 w-3.5" />
                              : <ArrowUpRight className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{tx.description}</p>
                            {tx.reference && (
                              <p className="text-xs text-muted-foreground font-mono">
                                Ref: {tx.reference}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`py-3 pr-4 font-semibold whitespace-nowrap ${
                        tx.type === "credit" ? "text-success" : "text-foreground"
                      }`}>
                        {tx.type === "credit" ? "+" : "−"}
                        {formatCurrency(Math.abs(tx.amount), tx.currency)}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{tx.currency}</td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            tx.status === "completed" ? "secondary"
                            : tx.status === "pending" ? "outline"
                            : "destructive"
                          }
                          className="text-xs capitalize"
                        >
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        {needsCode ? (
                          <Button
                            size="sm"
                            variant={hasCode ? "outline" : "default"}
                            className="gap-1.5 h-7 text-xs px-2.5"
                            onClick={() => setVerifyTx(tx)}
                          >
                            <KeyRound className="h-3 w-3" />
                            {hasCode ? "Edit Code" : "Enter Code"}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {transactions.length === 0
                ? "No transactions yet."
                : "No transactions match your filters."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Verification Dialog */}
      <VerifyDialog
        transaction={verifyTx}
        onClose={() => setVerifyTx(null)}
        onSuccess={handleVerifySuccess}
      />
    </div>
  )
}