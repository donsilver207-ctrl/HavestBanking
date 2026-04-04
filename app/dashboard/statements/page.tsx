"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Download, FileText, Calendar, Loader2, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Account {
  id: string
  name: string
  currency: string
}

interface Statement {
  id: string
  period: string
  file_path: string | null
  file_name: string
  generated_at: string
  // joined / derived
  accountName?: string
  type: "Annual" | "Quarterly" | "Monthly" | "Custom"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Infer statement type from the period string stored in the DB */
function inferType(period: string): Statement["type"] {
  const p = period.toLowerCase()
  if (p.includes("annual") || /^\d{4}$/.test(p.trim())) return "Annual"
  if (p.includes("q1") || p.includes("q2") || p.includes("q3") || p.includes("q4")) return "Quarterly"
  // "January 2025", "Jan 2025", "2025-01", etc.
  const monthNames = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]
  if (monthNames.some((m) => p.includes(m))) return "Monthly"
  if (/\d{4}-\d{2}-\d{2}/.test(p)) return "Custom"
  return "Monthly"
}

function typeBadgeVariant(type: Statement["type"]): "default" | "secondary" | "outline" {
  if (type === "Annual") return "default"
  if (type === "Quarterly") return "secondary"
  return "outline"
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StatementsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statements, setStatements] = useState<Statement[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generateSuccess, setGenerateSuccess] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setError("Unable to load your session. Please sign in again.")
      setLoading(false)
      return
    }

    // Fetch accounts for the filter dropdown
    const { data: accountsData, error: accountsError } = await supabase
      .from("accounts")
      .select("id, name, currency")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true })

    if (accountsError) {
      setError("Failed to load accounts.")
      setLoading(false)
      return
    }

    setAccounts(accountsData ?? [])

    // Fetch statements
    const { data: stmtData, error: stmtError } = await supabase
      .from("statements")
      .select("id, period, file_path, file_name, generated_at")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })

    if (stmtError) {
      setError("Failed to load statements.")
      setLoading(false)
      return
    }

    const mapped: Statement[] = (stmtData ?? []).map((s) => ({
      ...s,
      type: inferType(s.period),
    }))

    setStatements(mapped)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // -------------------------------------------------------------------------
  // Download
  // -------------------------------------------------------------------------

  const handleDownload = async (stmt: Statement) => {
    if (!stmt.file_path) return

    setDownloadingId(stmt.id)

    const { data, error } = await supabase.storage
      .from("statement-documents")
      .createSignedUrl(stmt.file_path, 60) // 60-second expiry

    if (error || !data?.signedUrl) {
      console.error("Download error:", error?.message)
      setDownloadingId(null)
      return
    }

    // Trigger browser download
    const a = document.createElement("a")
    a.href = data.signedUrl
    a.download = stmt.file_name
    a.click()

    setDownloadingId(null)
  }

  // -------------------------------------------------------------------------
  // Generate custom statement
  // -------------------------------------------------------------------------

  const handleGenerate = async () => {
    if (!dateFrom || !dateTo) return

    setGenerating(true)
    setGenerateError(null)
    setGenerateSuccess(false)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setGenerateError("Session expired. Please sign in again.")
      setGenerating(false)
      return
    }

    const period = `${dateFrom} to ${dateTo}`
    const fileName = `statement_${dateFrom}_${dateTo}.pdf`

    // Insert a placeholder row — a background job / edge function would
    // populate file_path once the PDF is generated.
    const { error } = await supabase.from("statements").insert({
      user_id: user.id,
      period,
      file_name: fileName,
      file_path: null, // will be populated by the generation job
    })

    if (error) {
      setGenerateError(error.message)
    } else {
      setGenerateSuccess(true)
      setDateFrom("")
      setDateTo("")
      await fetchData() // refresh list to show new pending entry
    }

    setGenerating(false)
  }

  // -------------------------------------------------------------------------
  // Filtered view
  // -------------------------------------------------------------------------

  const filtered = statements.filter((s) => {
    if (selectedAccount === "all") return true
    // statements don't have account_id in the schema, so we match on
    // file_name / period containing the account name as a best-effort filter
    const account = accounts.find((a) => a.id === selectedAccount)
    if (!account) return true
    const needle = account.name.toLowerCase()
    return (
      s.period.toLowerCase().includes(needle) ||
      s.file_name.toLowerCase().includes(needle)
    )
  })

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={fetchData}>
          Try Again
        </Button>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Statements
          </h1>
          <p className="text-sm text-muted-foreground">
            Download your account statements and tax documents
          </p>
        </div>

        {/* Account filter */}
        {accounts.length > 0 && (
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Statements table */}
      <Card className="border-border">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No statements found.</p>
              <p className="text-xs text-muted-foreground">
                Use the form below to request your first statement.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-4 font-medium">Period</th>
                    <th className="p-4 font-medium">Generated</th>
                    <th className="p-4 font-medium">Type</th>
                    <th className="p-4 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((stmt) => {
                    const isDownloading = downloadingId === stmt.id
                    const hasFile = !!stmt.file_path

                    return (
                      <tr
                        key={stmt.id}
                        className="transition-colors hover:bg-muted/50"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="font-medium text-foreground">
                              {stmt.period}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {formatDate(stmt.generated_at)}
                        </td>
                        <td className="p-4">
                          <Badge variant={typeBadgeVariant(stmt.type)}>
                            {stmt.type}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          {hasFile ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5"
                              disabled={isDownloading}
                              onClick={() => handleDownload(stmt)}
                            >
                              {isDownloading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Download className="h-3.5 w-3.5" />
                              )}
                              PDF
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Generating…
                            </span>
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

      {/* Request custom statement */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-5 w-5" />
            Request Custom Statement
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  max={dateTo || undefined}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  min={dateFrom || undefined}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <Button
              disabled={!dateFrom || !dateTo || generating}
              onClick={handleGenerate}
              className="gap-2 sm:shrink-0"
            >
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              {generating ? "Requesting…" : "Generate Statement"}
            </Button>
          </div>

          {generateError && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {generateError}
            </p>
          )}

          {generateSuccess && (
            <p className="text-xs text-success">
              Statement requested successfully. It will appear in the list above once generated.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}