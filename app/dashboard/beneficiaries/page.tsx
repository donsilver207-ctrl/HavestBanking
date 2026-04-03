"use client"

import { useEffect, useState } from "react"
import { UserPlus, Copy, Check, Search, Building2, Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

interface Beneficiary {
  id: string
  name: string
  bank: string
  swift: string | null
  iban: string | null
  country: string | null
}

type ValidationState = "idle" | "loading" | "valid" | "invalid"

// ── Offline IBAN checksum (mod-97) ────────────────────────────────────────────
function validateIbanFormat(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, "").toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(cleaned)) return false
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4)
  const numeric = rearranged
    .split("")
    .map((c) => (isNaN(Number(c)) ? (c.charCodeAt(0) - 55).toString() : c))
    .join("")
  let remainder = 0
  for (const chunk of numeric.match(/.{1,9}/g) ?? []) {
    remainder = parseInt(`${remainder}${chunk}`, 10) % 97
  }
  return remainder === 1
}

// ── Offline SWIFT/BIC format check ───────────────────────────────────────────
function validateSwiftFormat(swift: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(
    swift.replace(/\s/g, "").toUpperCase()
  )
}

function ValidationIcon({ state }: { state: ValidationState }) {
  if (state === "loading") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  if (state === "valid") return <CheckCircle2 className="h-4 w-4 text-success" />
  if (state === "invalid") return <XCircle className="h-4 w-4 text-destructive" />
  return null
}

export default function BeneficiariesPage() {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [copied, setCopied] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Form state
  const [name, setName] = useState("")
  const [bank, setBank] = useState("")
  const [swift, setSwift] = useState("")
  const [swiftState, setSwiftState] = useState<ValidationState>("idle")
  const [iban, setIban] = useState("")
  const [ibanState, setIbanState] = useState<ValidationState>("idle")
  const [country, setCountry] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // ── Fetch ─────────────────────────────────────────────────────────────────
  async function fetchBeneficiaries() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from("beneficiaries")
      .select("id, name, bank, swift, iban, country")
      .eq("user_id", user.id)
      .order("name")
    if (data) setBeneficiaries(data)
    setLoading(false)
  }

  useEffect(() => { fetchBeneficiaries() }, [])

  // ── IBAN validation ───────────────────────────────────────────────────────
  async function validateIban(raw: string) {
    const cleaned = raw.replace(/\s/g, "").toUpperCase()
    if (!cleaned) { setIbanState("idle"); return }
    if (!validateIbanFormat(cleaned)) {
      setIbanState("invalid")
      toast.error("IBAN format is invalid.")
      return
    }
    setIbanState("loading")
    try {
      const apiKey = process.env.NEXT_PUBLIC_APILAYER_KEY
      if (!apiKey) { setIbanState("valid"); return }
      const res = await fetch(
        `https://api.apilayer.com/bank_data/iban_validate?iban_number=${cleaned}`,
        { headers: { apikey: apiKey } }
      )
      const data = await res.json()
      if (data.valid) {
        setIbanState("valid")
        if (!bank && data.bank_data?.name) setBank(data.bank_data.name)
        if (!country && data.bank_data?.country) setCountry(data.bank_data.country)
      } else {
        setIbanState("invalid")
        toast.error("IBAN not found in banking network.")
      }
    } catch {
      setIbanState("valid") // format passed — accept on network failure
    }
  }

  // ── SWIFT validation ──────────────────────────────────────────────────────
  async function validateSwift(raw: string) {
    const cleaned = raw.replace(/\s/g, "").toUpperCase()
    if (!cleaned) { setSwiftState("idle"); return }
    if (!validateSwiftFormat(cleaned)) {
      setSwiftState("invalid")
      toast.error("SWIFT/BIC format is invalid.")
      return
    }
    setSwiftState("loading")
    try {
      const apiKey = process.env.NEXT_PUBLIC_APILAYER_KEY
      if (!apiKey) { setSwiftState("valid"); return }
      const res = await fetch(
        `https://api.apilayer.com/bank_data/swift_check?swift_code=${cleaned}`,
        { headers: { apikey: apiKey } }
      )
      const data = await res.json()
      if (data.valid) {
        setSwiftState("valid")
      } else {
        setSwiftState("invalid")
        toast.error("SWIFT/BIC code not found in banking network.")
      }
    } catch {
      setSwiftState("valid")
    }
  }

  // ── Save beneficiary ──────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (ibanState === "invalid") { toast.error("Fix the IBAN before saving."); return }
    if (swiftState === "invalid") { toast.error("Fix the SWIFT/BIC before saving."); return }
    if (!name || !bank) { toast.error("Name and bank are required."); return }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const { error } = await supabase.from("beneficiaries").insert({
        user_id: user.id,
        name,
        bank,
        swift: swift.replace(/\s/g, "").toUpperCase() || null,
        iban: iban.replace(/\s/g, "").toUpperCase() || null,
        country: country || null,
      })
      if (error) throw error

      toast.success(`${name} added to beneficiaries.`)
      setDialogOpen(false)
      resetForm()
      await fetchBeneficiaries()
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save beneficiary.")
    } finally {
      setSaving(false)
    }
  }

  // ── Delete beneficiary ────────────────────────────────────────────────────
  async function handleDelete(id: string, name: string) {
    const { error } = await supabase.from("beneficiaries").delete().eq("id", id)
    if (error) {
      toast.error("Failed to delete beneficiary.")
    } else {
      toast.success(`${name} removed.`)
      setBeneficiaries((prev) => prev.filter((b) => b.id !== id))
    }
  }

  function resetForm() {
    setName(""); setBank(""); setSwift(""); setIban(""); setCountry("")
    setSwiftState("idle"); setIbanState("idle")
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = beneficiaries.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.bank.toLowerCase().includes(search.toLowerCase()) ||
      (b.country ?? "").toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading beneficiaries…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Beneficiaries</h1>
          <p className="text-sm text-muted-foreground">Manage your saved transfer recipients</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm() }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Beneficiary
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Beneficiary</DialogTitle>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={handleSave}>
              <div className="flex flex-col gap-1.5">
                <Label>Beneficiary Name *</Label>
                <Input
                  placeholder="Full legal name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>IBAN</Label>
                <div className="relative">
                  <Input
                    placeholder="e.g. DE89370400440532013000"
                    value={iban}
                    onChange={(e) => { setIban(e.target.value); setIbanState("idle") }}
                    onBlur={(e) => validateIban(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <ValidationIcon state={ibanState} />
                  </span>
                </div>
                {ibanState === "valid" && <p className="text-xs text-success">IBAN verified ✓</p>}
                {ibanState === "invalid" && <p className="text-xs text-destructive">Invalid IBAN</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>SWIFT / BIC Code</Label>
                <div className="relative">
                  <Input
                    placeholder="e.g. DEUTDEFF"
                    value={swift}
                    onChange={(e) => { setSwift(e.target.value); setSwiftState("idle") }}
                    onBlur={(e) => validateSwift(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <ValidationIcon state={swiftState} />
                  </span>
                </div>
                {swiftState === "valid" && <p className="text-xs text-success">SWIFT/BIC verified ✓</p>}
                {swiftState === "invalid" && <p className="text-xs text-destructive">Invalid SWIFT/BIC</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Bank Name *</Label>
                <Input
                  placeholder="e.g. Deutsche Bank"
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Country</Label>
                <Input
                  placeholder="e.g. Germany"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={saving || ibanState === "invalid" || swiftState === "invalid"}
              >
                {saving ? "Saving…" : "Save Beneficiary"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, bank or country…"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {search ? "No beneficiaries match your search." : "No beneficiaries yet. Add one to get started."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ben) => (
            <Card key={ben.id} className="border-border">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{ben.name}</p>
                      <p className="text-xs text-muted-foreground">{ben.bank}</p>
                    </div>
                  </div>

                  {/* Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Delete ${ben.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove beneficiary?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove <strong>{ben.name}</strong> from your saved
                          beneficiaries. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(ben.id, ben.name)}
                        >
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                <div className="flex flex-col gap-2 text-sm">
                  {ben.swift && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">SWIFT</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-foreground">{ben.swift}</span>
                        <button
                          onClick={() => copyToClipboard(ben.swift!, `${ben.id}-swift`)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Copy SWIFT for ${ben.name}`}
                        >
                          {copied === `${ben.id}-swift`
                            ? <Check className="h-3.5 w-3.5 text-success" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {ben.iban && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">IBAN</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-foreground">
                          {ben.iban.slice(0, 12)}…
                        </span>
                        <button
                          onClick={() => copyToClipboard(ben.iban!, `${ben.id}-iban`)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Copy IBAN for ${ben.name}`}
                        >
                          {copied === `${ben.id}-iban`
                            ? <Check className="h-3.5 w-3.5 text-success" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {ben.country && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Country</span>
                      <span className="text-foreground">{ben.country}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}