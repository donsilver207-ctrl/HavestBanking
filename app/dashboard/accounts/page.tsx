"use client"

import { useEffect, useState, useRef } from "react"
import { Copy, Download, Building2, Camera, Upload, X, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { createBrowserClient } from "@supabase/ssr"

interface Account {
  id: string
  name: string
  account_number: string
  iban: string | null
  swift: string | null
  jurisdiction: string
  account_type: string
  balance: number
  currency: string
  is_active: boolean
}

interface CheckDepositState {
  open: boolean
  file: File | null
  preview: string | null
  amount: string
  description: string
  uploading: boolean
  success: boolean
  error: string | null
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

const initialDepositState: CheckDepositState = {
  open: false,
  file: null,
  preview: null,
  amount: "",
  description: "",
  uploading: false,
  success: false,
  error: null,
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [deposits, setDeposits] = useState<Record<string, CheckDepositState>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchAccounts() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("accounts")
        .select("id, name, account_number, iban, swift, jurisdiction, account_type, balance, currency, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })

      if (data) {
        setAccounts(data)
        const initialDeposits: Record<string, CheckDepositState> = {}
        data.forEach((a) => { initialDeposits[a.id] = { ...initialDepositState } })
        setDeposits(initialDeposits)
      }
      setLoading(false)
    }

    fetchAccounts()
  }, [])

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  function getDeposit(accountId: string): CheckDepositState {
    return deposits[accountId] ?? { ...initialDepositState }
  }

  function updateDeposit(accountId: string, patch: Partial<CheckDepositState>) {
    setDeposits((prev) => ({
      ...prev,
      [accountId]: { ...getDeposit(accountId), ...patch },
    }))
  }

  function handleFileChange(accountId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      updateDeposit(accountId, { error: "Please upload an image file (JPG, PNG, etc.)" })
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      updateDeposit(accountId, { error: "File must be under 10MB" })
      return
    }

    const preview = URL.createObjectURL(file)
    updateDeposit(accountId, { file, preview, error: null })
  }

  function handleDrop(accountId: string, e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>
    handleFileChange(accountId, fakeEvent)
  }

  async function handleSubmitDeposit(account: Account) {
    const deposit = getDeposit(account.id)
    if (!deposit.file || !deposit.amount) return

    const amount = parseFloat(deposit.amount)
    if (isNaN(amount) || amount <= 0) {
      updateDeposit(account.id, { error: "Please enter a valid amount" })
      return
    }

    updateDeposit(account.id, { uploading: true, error: null })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      updateDeposit(account.id, { uploading: false, error: "Session expired. Please sign in again." })
      return
    }

    // Upload check image to storage
    const ext = deposit.file.name.split(".").pop()
    const fileName = `check_${Date.now()}.${ext}`
    const storagePath = `checks/${user.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from("statement-documents")
      .upload(storagePath, deposit.file, {
        contentType: deposit.file.type,
        upsert: false,
      })

    if (uploadError) {
      updateDeposit(account.id, { uploading: false, error: uploadError.message })
      return
    }

    // Insert pending transaction
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: "credit",
      description: deposit.description
        ? `Check deposit — ${deposit.description}`
        : "Mobile check deposit",
      amount,
      currency: account.currency,
      status: "pending",
      reference: storagePath, // store image path in reference field for admin review
    })

    if (txError) {
      updateDeposit(account.id, { uploading: false, error: txError.message })
      return
    }

    // Success — reset after short delay
    updateDeposit(account.id, { uploading: false, success: true })
    setTimeout(() => {
      if (deposit.preview) URL.revokeObjectURL(deposit.preview)
      updateDeposit(account.id, { ...initialDepositState, open: false })
    }, 3000)
  }

  function resetDeposit(accountId: string) {
    const d = getDeposit(accountId)
    if (d.preview) URL.revokeObjectURL(d.preview)
    updateDeposit(accountId, { ...initialDepositState, open: false })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Loading accounts…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Manage your offshore banking accounts
        </p>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts found.</p>
      ) : (
        <div className="grid gap-6">
          {accounts.map((account) => {
            const deposit = getDeposit(account.id)

            return (
              <Card key={account.id} className="border-border overflow-hidden">
                <CardHeader className="flex flex-row items-start justify-between pb-4">
                  <div>
                    <CardTitle className="text-lg text-foreground">{account.name}</CardTitle>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="secondary">{account.account_type}</Badge>
                      <Badge variant="outline">{account.jurisdiction}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="font-serif text-xl font-bold text-foreground">
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  {/* Account details */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Account Number</p>
                      <p className="mt-0.5 text-sm font-mono text-foreground">{account.account_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">IBAN</p>
                      <div className="mt-0.5 flex items-center gap-1">
                        <p className="truncate text-sm font-mono text-foreground">{account.iban ?? "—"}</p>
                        {account.iban && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={() => copyToClipboard(account.iban!)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">SWIFT / BIC</p>
                      <p className="mt-0.5 text-sm font-mono text-foreground">{account.swift ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Jurisdiction</p>
                      <div className="mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                        <p className="text-sm text-foreground">{account.jurisdiction}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Download className="h-3.5 w-3.5" />
                      Download Statement
                    </Button>
                    {account.iban && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => copyToClipboard(account.iban!)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy IBAN
                      </Button>
                    )}
                    <Button
                      variant={deposit.open ? "secondary" : "outline"}
                      size="sm"
                      className="gap-1.5 ml-auto"
                      onClick={() =>
                        deposit.open
                          ? resetDeposit(account.id)
                          : updateDeposit(account.id, { open: true })
                      }
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Mobile Check Deposit
                      {deposit.open ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>

                  {/* Check deposit panel */}
                  {deposit.open && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Deposit a Check</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Upload a photo of your check. It will be reviewed by our team before funds are credited.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => resetDeposit(account.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Success state */}
                      {deposit.success ? (
                        <div className="flex flex-col items-center gap-2 py-6 text-center">
                          <div className="rounded-full bg-success/10 p-3">
                            <CheckCircle2 className="h-6 w-6 text-success" />
                          </div>
                          <p className="font-medium text-foreground">Check submitted successfully</p>
                          <p className="text-xs text-muted-foreground">
                            Your deposit is pending review. Funds will be credited once verified by our team.
                          </p>
                          <div className="mt-1 flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1">
                            <Clock className="h-3.5 w-3.5 text-warning" />
                            <span className="text-xs font-medium text-warning">Pending admin verification</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Image upload */}
                          {deposit.preview ? (
                            <div className="relative">
                              <img
                                src={deposit.preview}
                                alt="Check preview"
                                className="w-full rounded-md object-cover max-h-48 border border-border"
                              />
                              <Button
                                variant="secondary"
                                size="icon"
                                className="absolute top-2 right-2 h-7 w-7"
                                onClick={() => {
                                  if (deposit.preview) URL.revokeObjectURL(deposit.preview)
                                  updateDeposit(account.id, { file: null, preview: null })
                                  if (fileInputRefs.current[account.id]) {
                                    fileInputRefs.current[account.id]!.value = ""
                                  }
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                              <div className="absolute bottom-2 left-2 rounded bg-background/80 px-2 py-0.5 text-xs text-foreground backdrop-blur-sm">
                                {deposit.file?.name}
                              </div>
                            </div>
                          ) : (
                            <div
                              className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-background/50 p-6 text-center cursor-pointer hover:bg-muted/40 transition-colors"
                              onClick={() => fileInputRefs.current[account.id]?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDrop(account.id, e)}
                            >
                              <div className="rounded-full bg-muted p-3">
                                <Camera className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  Take a photo or upload check image
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  JPG, PNG up to 10MB — make sure all 4 corners are visible
                                </p>
                              </div>
                              <Button variant="outline" size="sm" className="gap-1.5 mt-1" type="button">
                                <Upload className="h-3.5 w-3.5" />
                                Choose File
                              </Button>
                            </div>
                          )}

                          <input
                            ref={(el) => { fileInputRefs.current[account.id] = el }}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleFileChange(account.id, e)}
                          />

                          {/* Amount + description */}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-medium text-muted-foreground">
                                Check Amount <span className="text-destructive">*</span>
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  {account.currency}
                                </span>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={deposit.amount}
                                  onChange={(e) => updateDeposit(account.id, { amount: e.target.value })}
                                  className="flex h-10 w-full rounded-md border border-input bg-background pl-12 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-medium text-muted-foreground">
                                Description (optional)
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Rent payment from tenant"
                                value={deposit.description}
                                onChange={(e) => updateDeposit(account.id, { description: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              />
                            </div>
                          </div>

                          {/* Pending notice */}
                          <div className="flex items-start gap-2 rounded-md bg-warning/10 border border-warning/20 p-3">
                            <Clock className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-warning">Pending verification</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Check deposits require admin review before funds are credited to your account. This typically takes 1–2 business days.
                              </p>
                            </div>
                          </div>

                          {/* Error */}
                          {deposit.error && (
                            <div className="flex items-center gap-1.5 text-xs text-destructive">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              {deposit.error}
                            </div>
                          )}

                          {/* Submit */}
                          <Button
                            onClick={() => handleSubmitDeposit(account)}
                            disabled={!deposit.file || !deposit.amount || deposit.uploading}
                            className="gap-2 w-full sm:w-auto sm:self-end"
                          >
                            {deposit.uploading ? (
                              <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Submitting…
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Submit Check Deposit
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}