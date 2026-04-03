"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Eye,
  Loader2,
  AlertCircle,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DocStatus = "pending" | "approved" | "rejected"

interface KycApplicant {
  userId: string
  name: string
  email: string | null
  country: string | null
  submittedAt: string
  documents: {
    id: string
    stepName: string
    fileName: string
    filePath: string
    status: DocStatus
  }[]
}

interface HistoryEntry {
  id: string
  action: string
  targetUserName: string | null
  adminName: string
  logType: string
  createdAt: string
  decision: "approved" | "rejected"
  reason?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskLevel(submittedAt: string): "low" | "medium" | "high" {
  const days =
    (Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24)
  if (days > 7) return "high"
  if (days > 3) return "medium"
  return "low"
}

function riskClass(level: "low" | "medium" | "high") {
  if (level === "low") return "bg-success text-success-foreground"
  if (level === "medium") return "bg-warning text-warning-foreground"
  return "bg-destructive text-destructive-foreground"
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminKycPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [queue, setQueue] = useState<KycApplicant[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])

  // Per-applicant rejection note state
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({})
  // Which applicant's rejection textarea is open
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  // Loading state per applicant
  const [processingId, setProcessingId] = useState<string | null>(null)

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    // 1. All pending kyc_documents with their profile info
    const { data: docs, error: docsErr } = await supabase
      .from("kyc_documents")
      .select(`
        id,
        user_id,
        step_name,
        file_name,
        file_path,
        status,
        created_at,
        profiles (
          first_name,
          last_name,
          email,
          country
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: true })

    if (docsErr) {
      setError("Failed to load KYC queue.")
      setLoading(false)
      return
    }

    // Group by user_id — one card per applicant
    const byUser = new Map<string, KycApplicant>()
    for (const doc of docs ?? []) {
      const profile = Array.isArray(doc.profiles) ? doc.profiles[0] : doc.profiles
      const name = [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .join(" ") || "Unknown User"

      if (!byUser.has(doc.user_id)) {
        byUser.set(doc.user_id, {
          userId: doc.user_id,
          name,
          email: profile?.email ?? null,
          country: profile?.country ?? null,
          submittedAt: doc.created_at,
          documents: [],
        })
      }
      byUser.get(doc.user_id)!.documents.push({
        id: doc.id,
        stepName: doc.step_name,
        fileName: doc.file_name,
        filePath: doc.file_path,
        status: doc.status as DocStatus,
      })
    }
    setQueue(Array.from(byUser.values()))

    // 2. KYC audit history
    const { data: logs, error: logsErr } = await supabase
      .from("audit_logs")
      .select("id, action, target_user_name, admin_name, log_type, created_at")
      .eq("log_type", "kyc")
      .order("created_at", { ascending: false })
      .limit(50)

    if (logsErr) {
      setError("Failed to load KYC history.")
      setLoading(false)
      return
    }

    setHistory(
      (logs ?? []).map((log) => ({
        id: log.id,
        action: log.action,
        targetUserName: log.target_user_name,
        adminName: log.admin_name,
        logType: log.log_type,
        createdAt: log.created_at,
        decision: log.action.toLowerCase().includes("reject")
          ? "rejected"
          : "approved",
        reason: log.action.toLowerCase().includes("reject")
          ? log.action
          : undefined,
      }))
    )

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------------------
  // Admin actions
  // -------------------------------------------------------------------------

  async function getAdminName(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return "Admin"
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single()
    return [data?.first_name, data?.last_name].filter(Boolean).join(" ") || "Admin"
  }

  async function approveApplicant(applicant: KycApplicant) {
    setProcessingId(applicant.userId)

    // 1. Approve all pending documents
    await supabase
      .from("kyc_documents")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("user_id", applicant.userId)
      .eq("status", "pending")

    // 2. Update profile kyc_status
    await supabase
      .from("profiles")
      .update({ kyc_status: "approved", updated_at: new Date().toISOString() })
      .eq("id", applicant.userId)

    // 3. Write audit log
    const adminName = await getAdminName()
    await supabase.from("audit_logs").insert({
      action: "KYC approved",
      target_user_id: applicant.userId,
      target_user_name: applicant.name,
      admin_name: adminName,
      log_type: "kyc",
    })

    // 4. Notify user
    await supabase.from("notifications").insert({
      user_id: applicant.userId,
      title: "KYC Approved",
      message:
        "Your identity verification has been approved. You now have full access to your account.",
      type: "kyc",
    })

    setProcessingId(null)
    await fetchData()
  }

  async function rejectApplicant(applicant: KycApplicant) {
    const notes = rejectNotes[applicant.userId]?.trim() || ""
    setProcessingId(applicant.userId)

    // 1. Reject all pending documents with reviewer notes
    await supabase
      .from("kyc_documents")
      .update({
        status: "rejected",
        reviewer_notes: notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("user_id", applicant.userId)
      .eq("status", "pending")

    // 2. Update profile kyc_status
    await supabase
      .from("profiles")
      .update({ kyc_status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", applicant.userId)

    // 3. Write audit log
    const adminName = await getAdminName()
    const actionText = notes
      ? `KYC rejected: ${notes}`
      : "KYC rejected"
    await supabase.from("audit_logs").insert({
      action: actionText,
      target_user_id: applicant.userId,
      target_user_name: applicant.name,
      admin_name: adminName,
      log_type: "kyc",
    })

    // 4. Notify user
    await supabase.from("notifications").insert({
      user_id: applicant.userId,
      title: "KYC Rejected",
      message: notes
        ? `Your verification was rejected: ${notes}`
        : "Your identity verification was rejected. Please re-submit your documents.",
      type: "kyc",
    })

    setProcessingId(null)
    setRejectingId(null)
    setRejectNotes((prev) => ({ ...prev, [applicant.userId]: "" }))
    await fetchData()
  }

  async function viewDocument(filePath: string, fileName: string) {
    const { data } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(filePath, 60)

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank")
    }
  }

  // -------------------------------------------------------------------------
  // Render
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          KYC Review
        </h1>
        <p className="text-sm text-muted-foreground">
          Review and process identity verification requests
        </p>
      </div>

      {/* Pending Queue */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Clock className="h-5 w-5 text-warning" />
          Pending Review ({queue.length})
        </h2>

        {queue.length === 0 ? (
          <Card className="border-border">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <Shield className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No pending KYC submissions.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {queue.map((applicant) => {
              const risk = riskLevel(applicant.submittedAt)
              const isProcessing = processingId === applicant.userId
              const isRejecting = rejectingId === applicant.userId

              return (
                <Card
                  key={applicant.userId}
                  className="border-border ring-2 ring-warning/30"
                >
                  <CardContent className="flex flex-col gap-4 p-5">
                    {/* Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-medium text-foreground">
                          {applicant.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {applicant.email}
                          {applicant.country && ` — ${applicant.country}`}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Submitted:{" "}
                          {new Date(applicant.submittedAt).toLocaleDateString(
                            "en-CH",
                            { day: "2-digit", month: "short", year: "numeric" }
                          )}
                        </p>
                      </div>
                      <Badge className={riskClass(risk)}>
                        Risk: {risk}
                      </Badge>
                    </div>

                    {/* Documents */}
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Submitted Documents
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {applicant.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm"
                          >
                            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-foreground">
                              {doc.stepName}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-1 h-5 w-5"
                              title={`View ${doc.fileName}`}
                              onClick={() =>
                                viewDocument(doc.filePath, doc.fileName)
                              }
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rejection note input */}
                    {isRejecting && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs">
                          Rejection reason{" "}
                          <span className="text-muted-foreground">
                            (optional — shown to user)
                          </span>
                        </Label>
                        <Textarea
                          rows={3}
                          placeholder="e.g. Documents expired — unable to verify identity"
                          value={rejectNotes[applicant.userId] ?? ""}
                          onChange={(e) =>
                            setRejectNotes((prev) => ({
                              ...prev,
                              [applicant.userId]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="gap-2"
                        disabled={isProcessing}
                        onClick={() => approveApplicant(applicant)}
                      >
                        {isProcessing && !isRejecting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Approve
                      </Button>

                      {isRejecting ? (
                        <>
                          <Button
                            variant="destructive"
                            className="gap-2"
                            disabled={isProcessing}
                            onClick={() => rejectApplicant(applicant)}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Confirm Rejection
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setRejectingId(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="destructive"
                          className="gap-2"
                          disabled={isProcessing}
                          onClick={() => setRejectingId(applicant.userId)}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* History */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Review History</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No review history yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        item.decision === "approved"
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {item.decision === "approved" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {item.targetUserName ?? "Unknown User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reviewed by {item.adminName} on{" "}
                        {new Date(item.createdAt).toLocaleDateString("en-CH", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      {item.decision === "rejected" && item.reason && (
                        <p className="text-xs text-destructive">
                          {item.reason.replace(/^KYC rejected:\s*/i, "")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={
                      item.decision === "approved" ? "secondary" : "destructive"
                    }
                  >
                    {item.decision}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}