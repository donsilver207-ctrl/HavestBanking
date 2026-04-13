"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Shield,
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  User,
  Building,
  Globe,
  XCircle,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

type StepStatus = "completed" | "pending" | "rejected" | "not_started"

interface ProfileFields {
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  national_id: string
}

interface KycStep {
  stepName: string
  title: string
  description: string
  icon: React.ElementType
  status: StepStatus
  documentId?: string
  reviewerNotes?: string
  type: "form" | "upload"
}

interface ProfileData {
  kycStatus: "pending" | "approved" | "rejected"
  tier: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COUNTRIES = [
  { code: "CH", label: "Switzerland" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "GB", label: "United Kingdom" },
  { code: "US", label: "United States" },
  { code: "AE", label: "United Arab Emirates" },
  { code: "SG", label: "Singapore" },
  { code: "NG", label: "Nigeria" },
  { code: "ZA", label: "South Africa" },
  { code: "OTHER", label: "Other" },
]

const REQUIRED_PROFILE_FIELDS: (keyof ProfileFields)[] = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "country",
  "national_id",
]

const STEP_DEFINITIONS: Omit<KycStep, "status" | "documentId" | "reviewerNotes">[] = [
  {
    stepName: "Personal Information",
    title: "Personal Information",
    description: "Full name, contact details, and national ID number",
    icon: User,
    type: "form",
  },
  {
    stepName: "Government ID",
    title: "Government ID",
    description: "Passport or national identity document",
    icon: FileText,
    type: "upload",
  },
  {
    stepName: "Proof of Address",
    title: "Proof of Address",
    description: "Utility bill or bank statement within 3 months",
    icon: Building,
    type: "upload",
  },
  {
    stepName: "Source of Funds",
    title: "Source of Funds",
    description: "Documentation proving origin of wealth (E.g IRS Docs, Payment Slip)",
    icon: Globe,
    type: "upload",
  },
  {
    stepName: "Enhanced Due Diligence",
    title: "Enhanced Due Diligence",
    description: "Additional verification for Tier 3 access",
    icon: Shield,
    type: "upload",
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isProfileComplete(p: ProfileFields): boolean {
  return REQUIRED_PROFILE_FIELDS.every((f) => !!p[f]?.trim())
}

function docStatusToStepStatus(
  docStatus: "pending" | "approved" | "rejected" | undefined
): StepStatus {
  if (!docStatus) return "not_started"
  if (docStatus === "approved") return "completed"
  if (docStatus === "rejected") return "rejected"
  return "pending"
}

function stepStatusLabel(status: StepStatus) {
  switch (status) {
    case "completed": return "Completed"
    case "pending":   return "Under Review"
    case "rejected":  return "Rejected"
    default:          return "Not Started"
  }
}

function stepStatusVariant(
  status: StepStatus
): "secondary" | "outline" | "destructive" | "default" {
  switch (status) {
    case "completed": return "secondary"
    case "pending":   return "outline"
    case "rejected":  return "destructive"
    default:          return "default"
  }
}

function iconBgClass(status: StepStatus) {
  switch (status) {
    case "completed": return "bg-success/10 text-success"
    case "pending":   return "bg-yellow-500/10 text-yellow-500"
    case "rejected":  return "bg-destructive/10 text-destructive"
    default:          return "bg-muted text-muted-foreground"
  }
}

function StatusIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed": return <CheckCircle2 className="h-5 w-5" />
    case "pending":   return <Clock className="h-5 w-5" />
    case "rejected":  return <XCircle className="h-5 w-5" />
    default:          return null
  }
}

// ---------------------------------------------------------------------------
// Upload helper
// ---------------------------------------------------------------------------

async function uploadDocument(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  stepName: string,
  file: File
): Promise<{ error: string | null }> {
  const ext = file.name.split(".").pop()
  const filePath = `kyc/${userId}/${stepName.replace(/\s+/g, "_").toLowerCase()}_${Date.now()}.${ext}`

  const { error: storageError } = await supabase.storage
    .from("kyc-documents")
    .upload(filePath, file, { upsert: false })

  if (storageError) return { error: storageError.message }

  const { error: dbError } = await supabase.from("kyc_documents").insert({
    user_id: userId,
    step_name: stepName,
    document_type: stepName,
    file_path: filePath,
    file_name: file.name,
    status: "pending",
  })

  if (dbError) return { error: dbError.message }
  return { error: null }
}

// ---------------------------------------------------------------------------
// Personal Information inline form
// ---------------------------------------------------------------------------

interface PersonalInfoFormProps {
  initial: ProfileFields
  onSaved: () => void
}

function PersonalInfoForm({ initial, onSaved }: PersonalInfoFormProps) {
  const supabase = createClient()
  const [fields, setFields] = useState<ProfileFields>(initial)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  const set =
    (key: keyof ProfileFields) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }))

  const isDirty = JSON.stringify(fields) !== JSON.stringify(initial)
  const canSubmit = isProfileComplete(fields) && isDirty && !saving

  const handleSubmit = async () => {
    setSaving(true)
    setSaveError(null)
    setJustSaved(false)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSaveError("Session expired. Please sign in again.")
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name:  fields.first_name.trim(),
        last_name:   fields.last_name.trim(),
        phone:       fields.phone.trim(),
        country:     fields.country,
        national_id: fields.national_id.trim(),
        updated_at:  new Date().toISOString(),
      })
      .eq("id", user.id)

    if (error) {
      setSaveError(error.message)
    } else {
      setJustSaved(true)
      onSaved()
    }

    setSaving(false)
  }

  return (
    <div className="mt-4 flex flex-col gap-4 border-t pt-4">
      {/* Name */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pi_first_name" className="text-xs">First Name</Label>
          <Input
            id="pi_first_name"
            value={fields.first_name}
            onChange={set("first_name")}
            placeholder="Jean"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pi_last_name" className="text-xs">Last Name</Label>
          <Input
            id="pi_last_name"
            value={fields.last_name}
            onChange={set("last_name")}
            placeholder="Dupont"
          />
        </div>
      </div>

      {/* Email – read-only */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pi_email" className="text-xs">
          Email{" "}
          <span className="text-muted-foreground">(linked to your account)</span>
        </Label>
        <Input
          id="pi_email"
          value={fields.email}
          readOnly
          disabled
          className="cursor-not-allowed opacity-60"
        />
      </div>

      {/* Phone + Country */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pi_phone" className="text-xs">Phone Number</Label>
          <Input
            id="pi_phone"
            value={fields.phone}
            onChange={set("phone")}
            placeholder="+41 79 123 45 67"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Country of Residence</Label>
          <Select
            value={fields.country}
            onValueChange={(v) => setFields((p) => ({ ...p, country: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* National ID */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pi_national_id" className="text-xs">
          National ID / Passport Number / SSN
        </Label>
        <Input
          id="pi_national_id"
          value={fields.national_id}
          onChange={set("national_id")}
          placeholder="e.g. X12345678"
        />
      </div>

      {/* Error */}
      {saveError && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {saveError}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="gap-2"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saving ? "Saving…" : "Save & Continue"}
        </Button>
        {justSaved && (
          <span className="flex items-center gap-1 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved successfully
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function VerificationPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profileMeta, setProfileMeta] = useState<ProfileData | null>(null)
  const [profileFields, setProfileFields] = useState<ProfileFields>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    country: "CH",
    national_id: "",
  })
  const [steps, setSteps] = useState<KycStep[]>([])
  const [uploadingStep, setUploadingStep] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

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

    const { data: pd, error: profileError } = await supabase
      .from("profiles")
      .select(
        "first_name, last_name, email, phone, country, national_id, kyc_status, tier"
      )
      .eq("id", user.id)
      .single()

    if (profileError) {
      setError("Failed to load profile data.")
      setLoading(false)
      return
    }

    const fields: ProfileFields = {
      first_name:  pd.first_name  ?? "",
      last_name:   pd.last_name   ?? "",
      email:       pd.email       ?? user.email ?? "",
      phone:       pd.phone       ?? "",
      country:     pd.country     ?? "CH",
      national_id: pd.national_id ?? "",
    }

    setProfileFields(fields)
    setProfileMeta({ kycStatus: pd.kyc_status, tier: pd.tier })

    const { data: docs, error: docsError } = await supabase
      .from("kyc_documents")
      .select("id, step_name, status, reviewer_notes")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (docsError) {
      setError("Failed to load KYC documents.")
      setLoading(false)
      return
    }

    const latestDocByStep = new Map<
      string,
      {
        id: string
        status: "pending" | "approved" | "rejected"
        reviewer_notes: string | null
      }
    >()
    for (const doc of docs ?? []) {
      if (!latestDocByStep.has(doc.step_name)) {
        latestDocByStep.set(doc.step_name, {
          id: doc.id,
          status: doc.status,
          reviewer_notes: doc.reviewer_notes,
        })
      }
    }

    const profileComplete = isProfileComplete(fields)

    const mergedSteps: KycStep[] = STEP_DEFINITIONS.map((def) => {
      if (def.type === "form") {
        return {
          ...def,
          status: profileComplete ? ("completed" as const) : ("not_started" as const),
        }
      }
      const doc = latestDocByStep.get(def.stepName)
      return {
        ...def,
        status: docStatusToStepStatus(doc?.status),
        documentId: doc?.id,
        reviewerNotes: doc?.reviewer_notes ?? undefined,
      }
    })

    setSteps(mergedSteps)

    // Auto-expand the first incomplete step
    const firstIncomplete = mergedSteps.find(
      (s) => s.status === "not_started" || s.status === "rejected"
    )
    if (firstIncomplete && expandedStep === null) {
      setExpandedStep(firstIncomplete.stepName)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------------------
  // Upload
  // -------------------------------------------------------------------------

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    stepName: string
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingStep(stepName)
    setUploadError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setUploadError("Session expired. Please sign in again.")
      setUploadingStep(null)
      return
    }

    const { error } = await uploadDocument(supabase, user.id, stepName, file)
    if (error) {
      setUploadError(`Upload failed: ${error}`)
    } else {
      await fetchData()
    }

    setUploadingStep(null)
    e.target.value = ""
  }

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const completedSteps = steps.filter((s) => s.status === "completed").length
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0
  const nextActionableStep = steps.find(
    (s) => s.status === "not_started" || s.status === "rejected"
  )

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
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          KYC Verification
        </h1>
        <p className="text-sm text-muted-foreground">
          Complete your identity verification to unlock full account features
        </p>
      </div>

      {/* Progress overview */}
      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Verification Progress</p>
              <p className="mt-1 font-serif text-2xl font-bold text-foreground">
                {completedSteps} of {steps.length} Steps
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  profileMeta?.kycStatus === "approved"
                    ? "bg-success text-success-foreground"
                    : profileMeta?.kycStatus === "rejected"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-warning text-warning-foreground"
                }
              >
                {profileMeta?.kycStatus === "approved"
                  ? "Fully Verified"
                  : profileMeta?.kycStatus === "rejected"
                  ? "Verification Failed"
                  : "In Progress"}
              </Badge>
              {profileMeta?.tier && (
                <Badge variant="outline">Tier {profileMeta.tier}</Badge>
              )}
            </div>
          </div>
          <Progress value={progress} className="mt-4 h-2" />
        </CardContent>
      </Card>

      {/* Upload error banner */}
      {uploadError && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{uploadError}</p>
          </CardContent>
        </Card>
      )}

      {/* Steps */}
      <div className="flex flex-col gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isActionable =
            step.status === "not_started" || step.status === "rejected"
          const isNextStep = nextActionableStep?.stepName === step.stepName
          const isUploading = uploadingStep === step.stepName
          const isExpanded = expandedStep === step.stepName

          return (
            <Card
              key={step.stepName}
              className={`border-border transition-shadow ${
                isNextStep ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBgClass(step.status)}`}
                  >
                    {step.status !== "not_started" ? (
                      <StatusIcon status={step.status} />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-medium text-foreground">
                        Step {index + 1}: {step.title}
                      </h3>
                      <Badge variant={stepStatusVariant(step.status)}>
                        {stepStatusLabel(step.status)}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {step.description}
                    </p>

                    {/* Reviewer rejection note */}
                    {step.status === "rejected" && step.reviewerNotes && (
                      <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        <span className="font-medium">Reviewer note:</span>{" "}
                        {step.reviewerNotes}
                      </p>
                    )}

                    {/* ── FORM step ── */}
                    {step.type === "form" && (
                      <>
                        <Button
                          size="sm"
                          variant={
                            step.status === "completed" ? "ghost" : "outline"
                          }
                          className="mt-3 gap-1.5 text-muted-foreground"
                          onClick={() =>
                            setExpandedStep(isExpanded ? null : step.stepName)
                          }
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              {step.status === "completed"
                                ? "Hide"
                                : "Hide Form"}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" />
                              {step.status === "completed"
                                ? "Edit Details"
                                : "Fill in Details"}
                            </>
                          )}
                        </Button>

                        {isExpanded && (
                          <PersonalInfoForm
                            initial={profileFields}
                            onSaved={() => {
                              setExpandedStep(null)
                              fetchData()
                            }}
                          />
                        )}
                      </>
                    )}

                    {/* ── UPLOAD step ── */}
                    {step.type === "upload" && isActionable && (
                      <label className="mt-3 inline-block cursor-pointer">
                        <input
                          type="file"
                          className="sr-only"
                          accept=".pdf,.jpg,.jpeg,.png"
                          disabled={isUploading}
                          onChange={(e) => handleFileChange(e, step.stepName)}
                        />
                        <Button
                          size="sm"
                          className="gap-2"
                          disabled={isUploading}
                          asChild
                        >
                          <span>
                            {isUploading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            {isUploading
                              ? "Uploading…"
                              : step.status === "rejected"
                              ? "Re-upload Document"
                              : "Upload Document"}
                          </span>
                        </Button>
                      </label>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Info */}
      <Card className="border-border bg-muted/50">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Why do we need this?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                KYC (Know Your Customer) verification is required by
                international banking regulations to prevent fraud, money
                laundering, and terrorist financing. Your data is encrypted and
                stored securely in compliance with Swiss data protection laws.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}