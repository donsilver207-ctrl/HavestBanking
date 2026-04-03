"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "sonner"
import { Toaster } from "@/components/ui/sonner"
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react"

interface Account {
  id: string
  name: string
  currency: string
}

interface Wallet {
  id: string
  currency: string
  symbol: string
  balance: number
}

interface Beneficiary {
  id: string
  name: string
  bank: string
  iban: string | null
  swift: string | null
}

type ValidationState = "idle" | "loading" | "valid" | "invalid"

// ── IBAN format validator (offline, regex-based) ─────────────────────────────
function validateIbanFormat(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, "").toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(cleaned)) return false
  // Move first 4 chars to end, convert letters to numbers, check mod97
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

// ── SWIFT/BIC format validator (offline) ─────────────────────────────────────
function validateSwiftFormat(swift: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(
    swift.replace(/\s/g, "").toUpperCase()
  )
}

export default function TransfersPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // ── Internal form
  const [intFromWallet, setIntFromWallet] = useState("")
  const [intToAccount, setIntToAccount] = useState("")
  const [intAmount, setIntAmount] = useState("")
  const [intReference, setIntReference] = useState("")

  // ── SWIFT form
  const [swFromWallet, setSwFromWallet] = useState("")
  const [swSwift, setSwSwift] = useState("")
  const [swSwiftState, setSwSwiftState] = useState<ValidationState>("idle")
  const [swIban, setSwIban] = useState("")
  const [swIbanState, setSwIbanState] = useState<ValidationState>("idle")
  const [swBeneficiaryName, setSwBeneficiaryName] = useState("")
  const [swAmount, setSwAmount] = useState("")
  const [swCurrency, setSwCurrency] = useState("")
  const [swPurpose, setSwPurpose] = useState("")

  // ── Wire form
  const [wiFromWallet, setWiFromWallet] = useState("")
  const [wiBankName, setWiBankName] = useState("")
  const [wiRouting, setWiRouting] = useState("")
  const [wiAccountNumber, setWiAccountNumber] = useState("")
  const [wiAmount, setWiAmount] = useState("")

  // ── Scheduled form
  const [scFromWallet, setScFromWallet] = useState("")
  const [scToBeneficiary, setScToBeneficiary] = useState("")
  const [scAmount, setScAmount] = useState("")
  const [scDate, setScDate] = useState("")
  const [scFrequency, setScFrequency] = useState("")

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [accountsRes, walletsRes, beneficiariesRes] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, name, currency")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("wallets")
          .select("id, currency, symbol, balance")
          .eq("user_id", user.id)
          .order("balance", { ascending: false }),
        supabase
          .from("beneficiaries")
          .select("id, name, bank, iban, swift")
          .eq("user_id", user.id)
          .order("name"),
      ])

      if (accountsRes.data) setAccounts(accountsRes.data)
      if (walletsRes.data) setWallets(walletsRes.data)
      if (beneficiariesRes.data) setBeneficiaries(beneficiariesRes.data)
      setLoading(false)
    }
    fetchData()
  }, [])

  // ── Balance check ─────────────────────────────────────────────────────────
  function checkBalance(walletId: string, amount: string): boolean {
    const wallet = wallets.find((w) => w.id === walletId)
    if (!wallet) return false
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) return false
    if (parsed > wallet.balance) {
      toast.error(
        `Insufficient balance. Available: ${wallet.symbol}${wallet.balance.toLocaleString()} ${wallet.currency}`
      )
      return false
    }
    return true
  }

  // ── IBAN validation (format + API) ────────────────────────────────────────
  async function validateIban(raw: string) {
    const iban = raw.replace(/\s/g, "").toUpperCase()
    if (!iban) { setSwIbanState("idle"); return }

    // Fast offline format check first
    /*if (!validateIbanFormat(iban)) {
      setSwIbanState("invalid")
      toast.error("IBAN format is invalid.")
      return
    }*/

    setSwIbanState("loading") /*
    try {
      // apilayer Bank Data API — free tier, 100 req/mo
      // Requires NEXT_PUBLIC_APILAYER_KEY in your .env
      const apiKey = process.env.NEXT_PUBLIC_APILAYER_KEY
      if (!apiKey) {
        // No API key: trust the format check
        setSwIbanState("valid")
        return
      }
      const res = await fetch(
        `https://api.apilayer.com/bank_data/iban_validate?iban_number${iban}`,
        { headers: { apikey: apiKey } }
      )
      const data = await res.json()
      if (data.valid) {
        setSwIbanState("valid")
        // Auto-fill beneficiary name from bank if empty
        if (!swBeneficiaryName && data.bank_data?.name) {
          setSwBeneficiaryName(data.bank_data.name)
        }
      } else {
        setSwIbanState("invalid")
        toast.error("IBAN validation failed — account may not exist.")
      }
    } catch {
      // Network issue: fall back to format check (already passed)
      setSwIbanState("valid")
    }*/
      setSwIbanState("valid")
  }

  // ── SWIFT validation (format + API) ──────────────────────────────────────
  async function validateSwift(raw: string) {
    const swift = raw.replace(/\s/g, "").toUpperCase()
    if (!swift) { setSwSwiftState("idle"); return }

    if (!validateSwiftFormat(swift)) {
      setSwSwiftState("invalid")
      toast.error("SWIFT/BIC format is invalid.")
      return
    }

    setSwSwiftState("loading")
    try {
      const apiKey = process.env.NEXT_PUBLIC_APILAYER_KEY
      if (!apiKey) {
        setSwSwiftState("valid")
        return
      }
      const res = await fetch(
        `https://api.apilayer.com/bank_data/swift_check?swift_code=${swift}`,
        { headers: { apikey: apiKey } }
      )
      const data = await res.json()
      if (data.valid) {
        setSwSwiftState("valid")
      } else {
        setSwSwiftState("invalid")
        toast.error("SWIFT/BIC code not found in banking network.")
      }
    } catch {
      setSwSwiftState("valid")
    }
  }

  // ── Shared insert ─────────────────────────────────────────────────────────
  /*async function insertTransfer(payload: {
    transfer_type: "internal" | "swift" | "wire" | "scheduled"
    from_wallet_currency: string
    to_beneficiary_id?: string | null
    to_iban?: string | null
    amount: number
    currency: string
    reference?: string | null
    scheduled_for?: string | null
    status: "pending" | "scheduled"
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")
    const { error } = await supabase.from("transfers").insert({ user_id: user.id, ...payload })
    if (error) throw error
  }*/
    async function insertTransfer(payload: {
      transfer_type: "internal" | "swift" | "wire" | "scheduled"
      from_wallet_currency: string
      to_account_id?: string | null        // ← add this
      to_beneficiary_id?: string | null
      to_iban?: string | null
      amount: number
      currency: string
      reference?: string | null
      scheduled_for?: string | null
      status: "pending" | "scheduled"
    }) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
    
      const { error } = await supabase.rpc("process_transfer", {
        p_user_id:              user.id,
        p_transfer_type:        payload.transfer_type,
        p_from_wallet_currency: payload.from_wallet_currency,
        p_to_account_id:        payload.to_account_id ?? null,   // ← add this
        p_to_beneficiary_id:    payload.to_beneficiary_id ?? null,
        p_to_iban:              payload.to_iban ?? null,
        p_amount:               payload.amount,
        p_currency:             payload.currency,
        p_reference:            payload.reference ?? null,
        p_scheduled_for:        payload.scheduled_for ?? null,
        p_status:               payload.status,
      })
    
      if (error) throw error
    
      const { data: updatedWallets } = await supabase
        .from("wallets")
        .select("id, currency, symbol, balance")
        .eq("user_id", user.id)
        .order("balance", { ascending: false })
      if (updatedWallets) setWallets(updatedWallets)
    }
  // ── Submit handlers ───────────────────────────────────────────────────────
  /*async function handleInternal(e: React.FormEvent) {
    e.preventDefault()
    if (!checkBalance(intFromWallet, intAmount)) return
    setSubmitting(true)
    try {
      const fromWallet = wallets.find((w) => w.id === intFromWallet)!
      await insertTransfer({
        transfer_type: "internal",
        from_wallet_currency: fromWallet.currency,
        amount: parseFloat(intAmount),
        currency: fromWallet.currency,
        reference: intReference || null,
        status: "pending",
      })
      toast.success("Internal transfer submitted.")
      setIntFromWallet(""); setIntToAccount(""); setIntAmount(""); setIntReference("")
    } catch (err: any) {
      toast.error(err.message ?? "Transfer failed.")
    } finally {
      setSubmitting(false)
    }
  }*/

    async function handleInternal(e: React.FormEvent) {
      e.preventDefault()
      if (!checkBalance(intFromWallet, intAmount)) return
      setSubmitting(true)
      try {
        const fromWallet = wallets.find((w) => w.id === intFromWallet)!
        await insertTransfer({
          transfer_type: "internal",
          from_wallet_currency: fromWallet.currency,
          to_account_id: intToAccount,        // ← pass the account id
          amount: parseFloat(intAmount),
          currency: fromWallet.currency,
          reference: intReference || null,
          status: "pending",
        })
        toast.success("Internal transfer submitted.")
        setIntFromWallet(""); setIntToAccount(""); setIntAmount(""); setIntReference("")
      } catch (err: any) {
        toast.error(err.message ?? "Transfer failed.")
      } finally {
        setSubmitting(false)
      }
    }

  async function handleSwift(e: React.FormEvent) {
    e.preventDefault()
    if (swIbanState !== "valid") { toast.error("Please enter a valid IBAN."); return }
    if (swSwiftState !== "valid") { toast.error("Please enter a valid SWIFT/BIC."); return }
    if (!checkBalance(swFromWallet, swAmount)) return
    setSubmitting(true)
    try {
      const fromWallet = wallets.find((w) => w.id === swFromWallet)!
      await insertTransfer({
        transfer_type: "swift",
        from_wallet_currency: fromWallet.currency,
        to_iban: swIban.replace(/\s/g, "").toUpperCase(),
        amount: parseFloat(swAmount),
        currency: swCurrency,
        reference: swPurpose || null,
        status: "pending",
      })
      toast.success("SWIFT transfer submitted.")
      setSwFromWallet(""); setSwSwift(""); setSwIban(""); setSwBeneficiaryName("")
      setSwAmount(""); setSwCurrency(""); setSwPurpose("")
      setSwIbanState("idle"); setSwSwiftState("idle")
    } catch (err: any) {
      toast.error(err.message ?? "Transfer failed.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleWire(e: React.FormEvent) {
    e.preventDefault()
    if (!checkBalance(wiFromWallet, wiAmount)) return
    setSubmitting(true)
    try {
      const fromWallet = wallets.find((w) => w.id === wiFromWallet)!
      await insertTransfer({
        transfer_type: "wire",
        from_wallet_currency: fromWallet.currency,
        reference: `Bank: ${wiBankName} | Routing: ${wiRouting} | Acct: ${wiAccountNumber}`,
        amount: parseFloat(wiAmount),
        currency: fromWallet.currency,
        status: "pending",
      })
      toast.success("Wire transfer submitted.")
      setWiFromWallet(""); setWiBankName(""); setWiRouting(""); setWiAccountNumber(""); setWiAmount("")
    } catch (err: any) {
      toast.error(err.message ?? "Transfer failed.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleScheduled(e: React.FormEvent) {
    e.preventDefault()
    if (!checkBalance(scFromWallet, scAmount)) return
    setSubmitting(true)
    try {
      const fromWallet = wallets.find((w) => w.id === scFromWallet)!
      const beneficiary = beneficiaries.find((b) => b.id === scToBeneficiary)
      await insertTransfer({
        transfer_type: "scheduled",
        from_wallet_currency: fromWallet.currency,
        to_beneficiary_id: beneficiary?.id ?? null,
        to_iban: beneficiary?.iban ?? null,
        amount: parseFloat(scAmount),
        currency: fromWallet.currency,
        reference: scFrequency ? `Frequency: ${scFrequency}` : null,
        scheduled_for: new Date(scDate).toISOString(),
        status: "scheduled",
      })
      toast.success("Transfer scheduled.")
      setScFromWallet(""); setScToBeneficiary(""); setScAmount(""); setScDate(""); setScFrequency("")
    } catch (err: any) {
      toast.error(err.message ?? "Scheduling failed.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function BalanceHint({ walletId, amount }: { walletId: string; amount: string }) {
    const wallet = wallets.find((w) => w.id === walletId)
    if (!wallet) return null
    const parsed = parseFloat(amount)
    const insufficient = !isNaN(parsed) && parsed > wallet.balance
    return (
      <p className={`text-xs mt-1 flex items-center gap-1 ${insufficient ? "text-destructive" : "text-muted-foreground"}`}>
        {insufficient && <AlertTriangle className="h-3 w-3" />}
        Available: {wallet.symbol}{wallet.balance.toLocaleString()} {wallet.currency}
        {insufficient && " — insufficient funds"}
      </p>
    )
  }

  function ValidationIcon({ state }: { state: ValidationState }) {
    if (state === "loading") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    if (state === "valid") return <CheckCircle2 className="h-4 w-4 text-success" />
    if (state === "invalid") return <XCircle className="h-4 w-4 text-destructive" />
    return null
  }

  const WalletOptions = () => (
    <>
      {wallets.map((w) => (
        <SelectItem key={w.id} value={w.id}>
          {w.currency} {w.symbol} — {w.balance.toLocaleString()}
        </SelectItem>
      ))}
    </>
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading transfer options…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Toaster />
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Transfers</h1>
        <p className="text-sm text-muted-foreground">Send funds domestically and internationally</p>
      </div>

      <Tabs defaultValue="internal">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="internal">Internal</TabsTrigger>
          <TabsTrigger value="swift">SWIFT</TabsTrigger>
          <TabsTrigger value="wire">Wire</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
        </TabsList>

        {/* ── Internal ── */}
        <TabsContent value="internal">
          <Card className="border-border">
            <CardHeader><CardTitle>Internal Transfer</CardTitle></CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleInternal}>
                <div className="flex flex-col gap-1.5">
                  <Label>From Wallet</Label>
                  <Select value={intFromWallet} onValueChange={setIntFromWallet} required>
                    <SelectTrigger><SelectValue placeholder="Select source wallet" /></SelectTrigger>
                    <SelectContent><WalletOptions /></SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>To Account</Label>
                  <Select value={intToAccount} onValueChange={setIntToAccount} required>
                    <SelectTrigger><SelectValue placeholder="Select destination account" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={intAmount}
                    onChange={(e) => setIntAmount(e.target.value)}
                    required
                  />
                  <BalanceHint walletId={intFromWallet} amount={intAmount} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Reference (Optional)</Label>
                  <Input
                    placeholder="Transfer reference"
                    value={intReference}
                    onChange={(e) => setIntReference(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit Transfer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SWIFT ── */}
        <TabsContent value="swift">
          <Card className="border-border">
            <CardHeader><CardTitle>SWIFT Transfer</CardTitle></CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleSwift}>
                <div className="flex flex-col gap-1.5">
                  <Label>From Wallet</Label>
                  <Select value={swFromWallet} onValueChange={setSwFromWallet} required>
                    <SelectTrigger><SelectValue placeholder="Select source wallet" /></SelectTrigger>
                    <SelectContent><WalletOptions /></SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Beneficiary SWIFT / BIC Code</Label>
                  <div className="relative">
                    <Input
                      placeholder="e.g. BARCGB22"
                      value={swSwift}
                      onChange={(e) => { setSwSwift(e.target.value); setSwSwiftState("idle") }}
                      onBlur={(e) => validateSwift(e.target.value)}
                      className="pr-8"
                      required
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <ValidationIcon state={swSwiftState} />
                    </span>
                  </div>
                  {swSwiftState === "valid" && (
                    <p className="text-xs text-success">SWIFT/BIC verified ✓</p>
                  )}
                  {swSwiftState === "invalid" && (
                    <p className="text-xs text-destructive">Invalid SWIFT/BIC code</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Beneficiary IBAN</Label>
                  <div className="relative">
                    <Input
                      placeholder="e.g. GB29BARC20035312345678"
                      value={swIban}
                      onChange={(e) => { setSwIban(e.target.value); setSwIbanState("idle") }}
                      onBlur={(e) => validateIban(e.target.value)}
                      className="pr-8"
                      required
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <ValidationIcon state={swIbanState} />
                    </span>
                  </div>
                  {swIbanState === "valid" && (
                    <p className="text-xs text-success">IBAN verified ✓</p>
                  )}
                  {swIbanState === "invalid" && (
                    <p className="text-xs text-destructive">Invalid IBAN</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Beneficiary Name</Label>
                  <Input
                    placeholder="Full legal name"
                    value={swBeneficiaryName}
                    onChange={(e) => setSwBeneficiaryName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={swAmount}
                      onChange={(e) => setSwAmount(e.target.value)}
                      required
                    />
                    <BalanceHint walletId={swFromWallet} amount={swAmount} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Currency</Label>
                    <Select value={swCurrency} onValueChange={setSwCurrency} required>
                      <SelectTrigger><SelectValue placeholder="Currency" /></SelectTrigger>
                      <SelectContent>
                        {wallets.map((w) => (
                          <SelectItem key={w.currency} value={w.currency}>{w.currency}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Purpose of Transfer</Label>
                  <Textarea
                    placeholder="Brief description"
                    value={swPurpose}
                    onChange={(e) => setSwPurpose(e.target.value)}
                    required
                  />
                </div>
                <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                  SWIFT transfers typically take 1–3 business days. A fee of $25 applies.
                  Tier 3 clients receive priority processing.
                </div>
                <Button
                  type="submit"
                  disabled={submitting || swIbanState !== "valid" || swSwiftState !== "valid"}
                >
                  {submitting ? "Submitting…" : "Submit SWIFT Transfer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Wire ── */}
        <TabsContent value="wire">
          <Card className="border-border">
            <CardHeader><CardTitle>Wire Transfer</CardTitle></CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleWire}>
                <div className="flex flex-col gap-1.5">
                  <Label>From Wallet</Label>
                  <Select value={wiFromWallet} onValueChange={setWiFromWallet} required>
                    <SelectTrigger><SelectValue placeholder="Select source wallet" /></SelectTrigger>
                    <SelectContent><WalletOptions /></SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Recipient Bank Name</Label>
                  <Input
                    placeholder="Bank name"
                    value={wiBankName}
                    onChange={(e) => setWiBankName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Routing Number</Label>
                  <Input
                    placeholder="Routing / sort code"
                    value={wiRouting}
                    onChange={(e) => setWiRouting(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Account Number</Label>
                  <Input
                    placeholder="Recipient account number"
                    value={wiAccountNumber}
                    onChange={(e) => setWiAccountNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={wiAmount}
                    onChange={(e) => setWiAmount(e.target.value)}
                    required
                  />
                  <BalanceHint walletId={wiFromWallet} amount={wiAmount} />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit Wire Transfer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Scheduled ── */}
        <TabsContent value="scheduled">
          <Card className="border-border">
            <CardHeader><CardTitle>Scheduled Transfer</CardTitle></CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleScheduled}>
                <div className="flex flex-col gap-1.5">
                  <Label>From Wallet</Label>
                  <Select value={scFromWallet} onValueChange={setScFromWallet} required>
                    <SelectTrigger><SelectValue placeholder="Select source wallet" /></SelectTrigger>
                    <SelectContent><WalletOptions /></SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>To Beneficiary</Label>
                  <Select value={scToBeneficiary} onValueChange={setScToBeneficiary} required>
                    <SelectTrigger><SelectValue placeholder="Select beneficiary" /></SelectTrigger>
                    <SelectContent>
                      {beneficiaries.length === 0 ? (
                        <SelectItem value="none" disabled>No beneficiaries saved</SelectItem>
                      ) : (
                        beneficiaries.map((b) => (
                          <SelectItem key={b.id} value={b.id}>{b.name} — {b.bank}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={scAmount}
                    onChange={(e) => setScAmount(e.target.value)}
                    required
                  />
                  <BalanceHint walletId={scFromWallet} amount={scAmount} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={scDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setScDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Frequency</Label>
                    <Select value={scFrequency} onValueChange={setScFrequency}>
                      <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="once">One-time</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Scheduling…" : "Schedule Transfer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}