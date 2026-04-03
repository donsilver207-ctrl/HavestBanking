"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Download,
  Loader2,
  AlertCircle,
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
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((tx) => (
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
                            <p className="text-xs text-muted-foreground">Ref: {tx.reference}</p>
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
                    <td className="py-3">
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
                  </tr>
                ))}
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
    </div>
  )
}