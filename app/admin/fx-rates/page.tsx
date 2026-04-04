"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Clock,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { generateStatementPDF } from "@/lib/generate-statement-pdf"

type StatementRow = {
  id: string
  user_id: string
  period: string
  file_path: string | null
  file_name: string
  generated_at: string
  profiles?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  }[] | null
}

type JobStatus = "idle" | "running" | "done" | "error"

type JobResult = {
  id: string
  file_name: string
  status: "success" | "error"
  message?: string
  file_path?: string
}

// FIX 1: Extracted helper so profile resolution isn't duplicated inline
function resolveProfile(profiles: StatementRow["profiles"]) {
  return Array.isArray(profiles) ? profiles[0] : profiles
}

function resolveClientName(profiles: StatementRow["profiles"]) {
  const profile = resolveProfile(profiles)
  if (profile?.first_name && profile?.last_name) {
    return `${profile.first_name} ${profile.last_name}`
  }
  return profile?.email ?? "Unknown Client"
}

export default function AdminStatementGenerationPage() {
  const supabase = createClient()

  const [pending, setPending] = useState<StatementRow[]>([])
  const [loading, setLoading] = useState(true)
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle")
  const [results, setResults] = useState<JobResult[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("statements")
      .select(
        `id, user_id, period, file_path, file_name, generated_at,
         profiles!statements_user_id_fkey ( first_name, last_name, email )`
      )
      .is("file_path", null)
      .order("generated_at", { ascending: true })

    if (!error && data) {
      setPending(data as StatementRow[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  async function fetchTransactionsForUser(userId: string, period: string) {
    const [year, month] = period.split("-").map(Number)
    const from = new Date(year, month - 1, 1).toISOString()
    const to = new Date(year, month, 0, 23, 59, 59).toISOString()

    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: true })

    return data ?? []
  }

  async function fetchAccountForUser(userId: string) {
    const { data } = await supabase
      .from("accounts")
      .select("account_number, iban, currency, balance, name")
      .eq("user_id", userId)
      .limit(1)
      .single()

    return data
  }

  async function generateAndUpload(statement: StatementRow): Promise<JobResult> {
    const profile = resolveProfile(statement.profiles)
    const clientName = resolveClientName(statement.profiles)
  
    const [transactions, account] = await Promise.all([
      fetchTransactionsForUser(statement.user_id, statement.period),
      fetchAccountForUser(statement.user_id),
    ])
  
    console.log("transactions:", transactions)
    console.log("account:", account)
  
    const pdfBlob = await generateStatementPDF({
      clientName,
      email: profile?.email ?? "",
      period: statement.period,
      account,
      transactions,
    })
  
    console.log("pdfBlob:", pdfBlob)
  
    const storagePath = `statements/${statement.user_id}/${statement.file_name}`
    const { error: uploadError } = await supabase.storage
      .from("statement-documents")
      .upload(storagePath, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      })
  
    console.log("uploadError:", uploadError)
  
    if (uploadError) {
      return {
        id: statement.id,
        file_name: statement.file_name,
        status: "error",
        message: uploadError.message,
      }
    }
  
    const { error: updateError } = await supabase
      .from("statements")
      .update({ file_path: storagePath })
      .eq("id", statement.id)
  
    console.log("updateError:", updateError)
  
    if (updateError) {
      return {
        id: statement.id,
        file_name: statement.file_name,
        status: "error",
        message: updateError.message,
      }
    }
  
    return {
      id: statement.id,
      file_name: statement.file_name,
      status: "success",
      file_path: storagePath,
    }
  }

  async function handleGenerateAll() {
    if (pending.length === 0) return
    setJobStatus("running")
    setResults([])

    const jobResults: JobResult[] = []

    for (const statement of pending) {
      setProcessingId(statement.id)
      const result = await generateAndUpload(statement)
      jobResults.push(result)
      setResults([...jobResults])
    }

    setProcessingId(null)
    setJobStatus("done")
    await fetchPending()
  }

  // FIX 2: handleGenerateSingle no longer sets global jobStatus to "running",
  // so other rows' Generate buttons stay enabled during a single-row generation.
  async function handleGenerateSingle(statement: StatementRow) {
    setProcessingId(statement.id)
    const result = await generateAndUpload(statement)
    setResults((prev) => {
      const filtered = prev.filter((r) => r.id !== result.id)
      return [...filtered, result]
    })
    setProcessingId(null)
    // Only promote to "done" if this was the only thing running
    setJobStatus((prev) => (prev === "running" ? "running" : "done"))
    await fetchPending()
  }

  const successCount = results.filter((r) => r.status === "success").length
  const errorCount = results.filter((r) => r.status === "error").length

  // FIX 3: Show "all caught up" whenever pending is empty, regardless of jobStatus.
  // Previously this was blocked when jobStatus === "done", hiding the success state
  // after generateAll completed and the list was refreshed away.
  const showEmptyState = !loading && pending.length === 0

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Statement Generation
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate and upload PDF statements for pending requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={fetchPending}
            disabled={loading || jobStatus === "running"}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            className="gap-2"
            onClick={handleGenerateAll}
            disabled={
              pending.length === 0 ||
              loading ||
              jobStatus === "running"
            }
          >
            {jobStatus === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {jobStatus === "running"
              ? "Generating…"
              : `Generate All (${pending.length})`}
          </Button>
        </div>
      </div>

      {/* Job summary banner */}
      {jobStatus === "done" && results.length > 0 && (
        <div
          className={`rounded-lg border p-3 text-center text-sm font-medium ${
            errorCount > 0
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-success/30 bg-success/10 text-success"
          }`}
        >
          {errorCount === 0
            ? `✓ All ${successCount} statement${successCount !== 1 ? "s" : ""} generated and uploaded successfully.`
            : `${successCount} succeeded, ${errorCount} failed. Check individual rows below.`}
        </div>
      )}

      {/* Pending statements */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading pending statements…
        </div>
      ) : showEmptyState ? (
        <Card className="border-border bg-muted/50">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="font-medium text-foreground">All caught up</p>
            <p className="text-sm text-muted-foreground">
              No pending statements without a file path.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {pending.map((s) => {
            const result = results.find((r) => r.id === s.id)
            const isProcessing = processingId === s.id
            // FIX 1: Use shared helper instead of duplicated inline logic
            const clientName = resolveClientName(s.profiles)

            return (
              <Card key={s.id} className="border-border">
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 rounded-lg bg-muted p-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="font-medium text-foreground">{clientName}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {s.file_name}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {s.period}
                        </Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Requested{" "}
                          {new Date(s.generated_at).toLocaleDateString("en-CH", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:justify-end">
                    {result ? (
                      result.status === "success" ? (
                        <span className="flex items-center gap-1 text-sm font-medium text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          Generated
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 text-sm font-medium text-destructive"
                          title={result.message}
                        >
                          <AlertCircle className="h-4 w-4" />
                          Failed
                        </span>
                      )
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        // FIX 2: Only disable this specific row's button while it's processing,
                        // not all buttons whenever any generation is running.
                        disabled={isProcessing || jobStatus === "running"}
                        onClick={() => handleGenerateSingle(s)}
                      >
                        {isProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        {isProcessing ? "Generating…" : "Generate"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Already completed this session */}
      {results.length > 0 && (
        <Card className="border-border bg-muted/50">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Generated PDFs are stored in the{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              statement-documents/statements/&#123;user_id&#125;/
              </code>{" "}
              bucket and the{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                statements.file_path
              </code>{" "}
              column is updated immediately. Clients can download their statements from their portal.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}