"use client"

import { useState, useEffect } from "react"
import {
  CreditCard,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Snowflake,
  Plus,
  Wallet,
  ArrowDownToLine,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createBrowserClient } from "@supabase/ssr"

type CardRow = {
  id: string
  card_type: string
  last_four: string
  card_holder: string
  expiry: string
  is_frozen: boolean
  spending_limit: number
  spent_this_month: number
  currency: string
}

type WalletRow = {
  id: string
  currency: string
  symbol: string
  balance: number
}

type FxRateRow = {
  pair: string
  rate: number
}

type BinInfo = {
  scheme?: string
  type?: string
  bank?: string
} | null

// ── Card network SVG logos ─────────────────────────────────────────────
function VisaLogo() {
  return (
    <svg viewBox="0 0 48 16" className="h-6 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.72 1.6L12.48 14.4H8.64L5.6 4.48C5.44 3.84 5.28 3.6 4.8 3.36 4.0 2.96 2.72 2.56 1.6 2.32L1.68 1.6H7.84C8.64 1.6 9.36 2.16 9.52 3.04L11.12 10.96 14.88 1.6H18.72ZM34.08 9.84C34.08 6.24 29.04 6.0 29.04 4.48 29.04 4.0 29.52 3.52 30.56 3.36 31.04 3.28 32.48 3.2 34.16 4.0L34.8 1.12C34.0 0.8 32.96 0.56 31.6 0.56 27.92 0.56 25.36 2.56 25.36 5.44 25.36 7.6 27.28 8.8 28.72 9.52 30.24 10.24 30.72 10.72 30.72 11.36 30.72 12.32 29.6 12.8 28.56 12.8 26.72 12.8 25.68 12.32 24.88 11.92L24.24 14.88C25.04 15.28 26.48 15.6 28.0 15.6 31.92 15.6 34.08 13.68 34.08 9.84ZM43.36 14.4H46.72L43.84 1.6H40.72C40.0 1.6 39.36 2.0 39.12 2.64L33.76 14.4H37.68L38.48 12.24H43.2L43.36 14.4ZM39.52 9.44L41.44 4.24 42.56 9.44H39.52ZM23.84 1.6L20.8 14.4H17.12L20.16 1.6H23.84Z" fill="white"/>
    </svg>
  )
}

function MastercardLogo() {
  return (
    <svg viewBox="0 0 48 30" className="h-8 w-auto" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="15" r="13" fill="#EB001B"/>
      <circle cx="30" cy="15" r="13" fill="#F79E1B"/>
      <path d="M24 5.8a13 13 0 0 1 0 18.4A13 13 0 0 1 24 5.8z" fill="#FF5F00"/>
    </svg>
  )
}

function AmexLogo() {
  return (
    <svg viewBox="0 0 60 20" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="20" rx="3" fill="white" fillOpacity="0.15"/>
      <text x="4" y="14" fontFamily="Arial" fontWeight="bold" fontSize="10" fill="white" letterSpacing="1">AMEX</text>
    </svg>
  )
}

function DiscoverLogo() {
  return (
    <svg viewBox="0 0 70 22" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
      <text x="2" y="15" fontFamily="Arial" fontWeight="bold" fontSize="11" fill="white" letterSpacing="0.5">DISCOVER</text>
      <circle cx="62" cy="11" r="9" fill="#F76F20"/>
    </svg>
  )
}

function CardNetworkLogo({ type }: { type: string }) {
  const t = type.toLowerCase()
  if (t === "visa") return <VisaLogo />
  if (t === "mastercard") return <MastercardLogo />
  if (t === "platinum" || t === "amex") return <AmexLogo />
  if (t === "discover") return <DiscoverLogo />
  return <CreditCard className="h-6 w-6 opacity-70" />
}

// ── Chip SVG ───────────────────────────────────────────────────────────
function ChipSVG() {
  return (
    <svg viewBox="0 0 50 40" className="h-9 w-auto" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="46" height="36" rx="6" fill="#D4AF37" stroke="#B8960C" strokeWidth="1"/>
      <rect x="17" y="2" width="2" height="36" fill="#B8960C" opacity="0.6"/>
      <rect x="31" y="2" width="2" height="36" fill="#B8960C" opacity="0.6"/>
      <rect x="2" y="13" width="46" height="2" fill="#B8960C" opacity="0.6"/>
      <rect x="2" y="25" width="46" height="2" fill="#B8960C" opacity="0.6"/>
      <rect x="17" y="13" width="16" height="14" rx="2" fill="#C9A227" stroke="#B8960C" strokeWidth="0.5"/>
    </svg>
  )
}

// ── Card background gradients per type ────────────────────────────────
function cardGradient(type: string, frozen: boolean): string {
  if (frozen) return "bg-gradient-to-br from-slate-400 to-slate-600"
  const t = type.toLowerCase()
  if (t === "visa") return "bg-gradient-to-br from-[#1a1f71] to-[#2563eb]"
  if (t === "mastercard") return "bg-gradient-to-br from-[#1a1a2e] to-[#16213e]"
  if (t === "platinum" || t === "amex") return "bg-gradient-to-br from-[#2d2d2d] to-[#4a4a4a]"
  if (t === "discover") return "bg-gradient-to-br from-[#7c3aed] to-[#c026d3]"
  return "bg-gradient-to-br from-[#1e3a5f] to-[#2563eb]"
}

// ── FX conversion helper ───────────────────────────────────────────────
// Looks up rate for FROM->TO using pairs stored as e.g. "USD/CHF" or "CHF/USD"
function convertAmount(
  amount: number,
  from: string,
  to: string,
  fxRates: FxRateRow[]
): number | null {
  if (from === to) return amount

  // Try direct pair
  const direct = fxRates.find(r => r.pair === `${from}/${to}`)
  if (direct) return amount * direct.rate

  // Try inverse pair
  const inverse = fxRates.find(r => r.pair === `${to}/${from}`)
  if (inverse) return amount / inverse.rate

  return null // rate not found
}

export default function CardsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [cards, setCards] = useState<CardRow[]>([])
  const [wallets, setWallets] = useState<WalletRow[]>([])
  const [fxRates, setFxRates] = useState<FxRateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({})

  // ── Link card state ────────────────────────────────────────────────
  const [linkOpen, setLinkOpen] = useState(false)
  const [fullCardNumber, setFullCardNumber] = useState("")
  const [cvv, setCvv] = useState("")
  const [showCvv, setShowCvv] = useState(false)
  const [cardHolder, setCardHolder] = useState("")
  const [expiry, setExpiry] = useState("")
  const [cardType, setCardType] = useState<"Visa" | "Mastercard" | "Platinum">("Visa")
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [binInfo, setBinInfo] = useState<BinInfo>(null)
  const [binLoading, setBinLoading] = useState(false)
  const [binChecked, setBinChecked] = useState(false)

  // ── Load balance state ─────────────────────────────────────────────
  const [loadOpen, setLoadOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CardRow | null>(null)
  const [loadAmount, setLoadAmount] = useState("")
  const [fromWalletId, setFromWalletId] = useState("")
  const [loadPending, setLoadPending] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadSuccess, setLoadSuccess] = useState(false)
  const [convertedPreview, setConvertedPreview] = useState<{ amount: number; rate: number } | null>(null)

  // ── Fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Not authenticated"); setLoading(false); return }

      const [
        { data: cardsData, error: cardsErr },
        { data: walletsData, error: walletsErr },
        { data: fxData, error: fxErr },
      ] = await Promise.all([
        supabase.from("cards").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("wallets").select("id, currency, symbol, balance").eq("user_id", user.id),
        supabase.from("fx_rates").select("pair, rate"),
      ])

      if (cardsErr || walletsErr || fxErr) {
        setError(cardsErr?.message ?? walletsErr?.message ?? fxErr?.message ?? "Failed to load data")
      }
      setCards(cardsData ?? [])
      setWallets(walletsData ?? [])
      setFxRates(fxData ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  // ── Recompute conversion preview when wallet or amount changes ─────
  useEffect(() => {
    if (!selectedCard || !fromWalletId || !loadAmount) {
      setConvertedPreview(null)
      return
    }
    const amt = parseFloat(loadAmount)
    if (isNaN(amt) || amt <= 0) { setConvertedPreview(null); return }

    const wallet = wallets.find(w => w.id === fromWalletId)
    if (!wallet) { setConvertedPreview(null); return }

    // First load — no conversion needed, card will take wallet's currency
    const isFirstLoad = !selectedCard.currency || selectedCard.currency === ""
    if (isFirstLoad || wallet.currency === selectedCard.currency) {
      setConvertedPreview(null)
      return
    }

    const converted = convertAmount(amt, wallet.currency, selectedCard.currency, fxRates)
    if (converted === null) { setConvertedPreview(null); return }

    setConvertedPreview({ amount: converted, rate: converted / amt })
  }, [fromWalletId, loadAmount, selectedCard, wallets, fxRates])

  // ── Card number helpers ────────────────────────────────────────────
  function luhnCheck(num: string): boolean {
    const digits = num.replace(/\s/g, "")
    if (!/^\d+$/.test(digits)) return false
    let sum = 0
    let shouldDouble = false
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = parseInt(digits[i])
      if (shouldDouble) { d *= 2; if (d > 9) d -= 9 }
      sum += d
      shouldDouble = !shouldDouble
    }
    return sum % 10 === 0
  }

  function detectCardType(num: string): "Visa" | "Mastercard" | "Platinum" | null {
    const n = num.replace(/\s/g, "")
    if (/^4/.test(n)) return "Visa"
    if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard"
    if (/^3[47]/.test(n)) return "Platinum"
    return null
  }

  function formatCardInput(val: string): string {
    return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim()
  }

  async function lookupBin(cardNum: string) {
    const digits = cardNum.replace(/\s/g, "")
    if (digits.length < 6) { setBinInfo(null); setBinChecked(false); return }
    setBinLoading(true)
    setBinChecked(false)
    try {
      const res = await fetch(`https://api.apilayer.com/bincheck/${digits.slice(0, 6)}`, {
        headers: { apikey: process.env.NEXT_PUBLIC_APILAYER_KEY ?? "" },
      })
      if (res.ok) {
        const data = await res.json()
        setBinInfo({ scheme: data.scheme, type: data.type, bank: data.bank?.name })
        const s = (data.scheme ?? "").toLowerCase()
        if (s === "visa") setCardType("Visa")
        else if (s === "mastercard") setCardType("Mastercard")
        else if (data.scheme) setCardType("Platinum")
      } else {
        setBinInfo(null)
      }
    } catch {
      setBinInfo(null)
    }
    setBinChecked(true)
    setBinLoading(false)
  }

  function resetLinkDialog() {
    setFullCardNumber(""); setCvv(""); setCardHolder(""); setExpiry("")
    setCardType("Visa"); setBinInfo(null); setBinChecked(false)
    setLinkError(null); setShowCvv(false)
  }

  // ── Freeze / Unfreeze ──────────────────────────────────────────────
  async function toggleFreeze(card: CardRow) {
    const newVal = !card.is_frozen
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, is_frozen: newVal } : c))
    const { error } = await supabase.from("cards").update({ is_frozen: newVal }).eq("id", card.id)
    if (error) setCards(prev => prev.map(c => c.id === card.id ? { ...c, is_frozen: card.is_frozen } : c))
  }

  // ── Toggle show/hide card details ──────────────────────────────────
  function toggleDetails(id: string) {
    setShowDetails(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // ── Link Card ──────────────────────────────────────────────────────
  async function handleLinkCard() {
    setLinkError(null)
    const rawNumber = fullCardNumber.replace(/\s/g, "")

    if (rawNumber.length < 13 || rawNumber.length > 19) {
      setLinkError("Enter a valid card number (13–19 digits)"); return
    }
    if (!luhnCheck(rawNumber)) {
      setLinkError("Invalid card number — failed checksum verification"); return
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setLinkError("CVV must be 3 or 4 digits"); return
    }
    if (!cardHolder.trim()) {
      setLinkError("Card holder name required"); return
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      setLinkError("Expiry must be MM/YY"); return
    }
    const [mm, yy] = expiry.split("/").map(Number)
    if (new Date(2000 + yy, mm - 1, 1) < new Date()) {
      setLinkError("This card has expired"); return
    }

    setLinking(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from("cards").insert({
      user_id: user!.id,
      card_type: cardType,
      last_four: `${rawNumber}/${cvv}`,
      card_holder: cardHolder.trim(),
      expiry,
      is_frozen: false,
      spending_limit: 0,
      spent_this_month: 0,
      // Currency intentionally empty — locked in on first load
      currency: "",
    }).select().single()

    setLinking(false)
    if (error) { setLinkError(error.message); return }
    setCards(prev => [...prev, data])
    setLinkOpen(false)
    resetLinkDialog()
  }

  // ── Load Balance ───────────────────────────────────────────────────
  function openLoad(card: CardRow) {
    setSelectedCard(card)
    setLoadAmount("")
    setFromWalletId(wallets[0]?.id ?? "")
    setLoadError(null)
    setLoadSuccess(false)
    setConvertedPreview(null)
    setLoadOpen(true)
  }

  function parseCardData(raw: string): { number: string; cvv: string; lastFour: string } {
    const [number = "", cvv = ""] = raw.split("/")
    const lastFour = number.slice(-4)
    const formatted = number.replace(/(.{4})/g, "$1 ").trim()
    return { number: formatted, cvv, lastFour }
  }

  async function handleLoad() {
    if (!selectedCard) return
    const amt = parseFloat(loadAmount)
    if (isNaN(amt) || amt <= 0) { setLoadError("Enter a valid amount"); return }

    const wallet = wallets.find(w => w.id === fromWalletId)
    if (!wallet) { setLoadError("Select a wallet"); return }
    if (amt > wallet.balance) { setLoadError("Insufficient wallet balance"); return }

    // Is this the very first load? If so, lock in the wallet's currency as base
    const isFirstLoad = !selectedCard.currency || selectedCard.currency === ""

    let creditAmount: number
    let cardCurrency: string

    if (isFirstLoad) {
      // Lock in the wallet's currency as the card's base currency
      creditAmount = amt
      cardCurrency = wallet.currency
    } else if (wallet.currency === selectedCard.currency) {
      // Same currency — no conversion needed
      creditAmount = amt
      cardCurrency = selectedCard.currency
    } else {
      // Different currency — convert to card's base currency
      const converted = convertAmount(amt, wallet.currency, selectedCard.currency, fxRates)
      if (converted === null) {
        setLoadError(`No FX rate found for ${wallet.currency} → ${selectedCard.currency}`)
        return
      }
      creditAmount = converted
      cardCurrency = selectedCard.currency
    }

    setLoadPending(true)
    setLoadError(null)

    // Deduct from wallet
    const { error: walletErr } = await supabase
      .from("wallets").update({ balance: wallet.balance - amt }).eq("id", wallet.id)
    if (walletErr) { setLoadError(walletErr.message); setLoadPending(false); return }

    // Update card spending_limit in base currency; set currency on first load
    const newLimit = selectedCard.spending_limit + creditAmount
    const cardUpdate: Record<string, unknown> = { spending_limit: newLimit }
    if (isFirstLoad) cardUpdate.currency = cardCurrency

    const { error: cardErr } = await supabase
      .from("cards").update(cardUpdate).eq("id", selectedCard.id)
    if (cardErr) { setLoadError(cardErr.message); setLoadPending(false); return }

    // Log transaction in wallet's currency (what was actually debited)
    const { data: { user } } = await supabase.auth.getUser()
    const { lastFour } = parseCardData(selectedCard.last_four)
    const conversionNote =
      !isFirstLoad && wallet.currency !== cardCurrency
        ? ` (converted to ${creditAmount.toFixed(2)} ${cardCurrency})`
        : ""
    await supabase.from("transactions").insert({
      user_id: user!.id,
      type: "debit",
      description: `Loaded pre-paid card ••••${lastFour}${conversionNote}`,
      amount: amt,
      currency: wallet.currency,
      status: "completed",
    })

    // Update local state
    setCards(prev => prev.map(c =>
      c.id === selectedCard.id
        ? { ...c, spending_limit: newLimit, currency: cardCurrency }
        : c
    ))
    setWallets(prev => prev.map(w =>
      w.id === wallet.id ? { ...w, balance: w.balance - amt } : w
    ))
    setLoadPending(false)
    setLoadSuccess(true)
  }

  // ── Derived for link dialog ────────────────────────────────────────
  const rawDigits = fullCardNumber.replace(/\s/g, "")
  const showLuhnIndicator = !binLoading && binChecked && rawDigits.length >= 13
  const luhnValid = luhnCheck(rawDigits)

  // ── Render ─────────────────────────────────────────────────────────
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

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Cards</h1>
          <p className="text-sm text-muted-foreground">Manage your linked pre-paid cards</p>
        </div>
        <Button className="gap-2" onClick={() => setLinkOpen(true)}>
          <Plus className="h-4 w-4" />
          Link Card
        </Button>
      </div>

      {/* Empty state */}
      {cards.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <CreditCard className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No cards linked yet.<br />Link a pre-paid card to get started.
          </p>
          <Button variant="outline" size="sm" onClick={() => setLinkOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Link Card
          </Button>
        </div>
      )}

      {/* Card grid */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const revealed = showDetails[card.id] === true
          const isFrozen = card.is_frozen
          const { number: fullNumber, cvv: storedCvv, lastFour } = parseCardData(card.last_four)
          const utilization = card.spending_limit > 0
            ? (card.spent_this_month / card.spending_limit) * 100
            : 0
          const availableBalance = Math.max(0, card.spending_limit - card.spent_this_month)
          const isUnloaded = !card.currency || card.currency === ""

          return (
            <div key={card.id} className="flex flex-col gap-4">

              {/* ── Realistic card visual ── */}
              <div
                className={`relative overflow-hidden rounded-2xl p-6 shadow-2xl select-none transition-all duration-500 ${cardGradient(card.card_type, isFrozen)}`}
                style={{ aspectRatio: "1.586 / 1", minHeight: 0 }}
              >
                {/* Glossy shine overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
                  }}
                />

                {/* Frozen overlay */}
                {isFrozen && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px] bg-slate-900/50">
                    <Snowflake className="h-10 w-10 text-blue-200" />
                    <span className="text-sm font-bold tracking-widest text-blue-100">FROZEN</span>
                  </div>
                )}

                {/* Top row: Pre-paid label + network logo */}
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-semibold tracking-[0.2em] text-white/60 uppercase">
                    Pre-paid
                  </span>
                  <CardNetworkLogo type={card.card_type} />
                </div>

                {/* Chip */}
                <div className="mt-4">
                  <ChipSVG />
                </div>

                {/* Card number */}
                <div className="mt-4">
                  <p className="font-mono text-base tracking-[0.22em] text-white/90 tabular-nums">
                    {revealed ? fullNumber : `•••• •••• •••• ${lastFour}`}
                  </p>
                </div>

                {/* Bottom row */}
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-[9px] font-medium tracking-widest text-white/40 uppercase mb-0.5">
                      Card Holder
                    </p>
                    <p className="text-sm font-semibold tracking-wide text-white truncate max-w-[140px]">
                      {card.card_holder.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium tracking-widest text-white/40 uppercase mb-0.5">Available</p>
                    <p className="text-sm font-semibold tracking-widest text-white">
                      {isUnloaded
                        ? "—"
                        : `${card.currency} ${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-medium tracking-widest text-white/40 uppercase mb-0.5">
                      Expires
                    </p>
                    <p className="text-sm font-semibold tracking-widest text-white">
                      {card.expiry}
                    </p>
                  </div>
                </div>

                {/* CVV reveal badge */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2">
                  {revealed && (
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                      <div className="rounded-lg bg-black/30 backdrop-blur-sm border border-white/10 px-2.5 py-1 text-right">
                        <p className="text-[9px] text-white/50 uppercase tracking-widest">CVV</p>
                        <p className="text-sm font-bold font-mono text-white tracking-widest">{storedCvv}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Controls */}
              <Card className="border-border">
                <CardContent className="flex flex-col gap-4 p-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Loaded Balance</span>
                      <span className="font-medium text-foreground">
                        {isUnloaded
                          ? <span className="text-muted-foreground text-xs italic">Load to set currency</span>
                          : `${card.currency} ${card.spent_this_month.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ${card.spending_limit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                        }
                      </span>
                    </div>
                    <Progress value={utilization} className="mt-2 h-1.5" />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => toggleDetails(card.id)}
                    >
                      {revealed
                        ? <><EyeOff className="h-3.5 w-3.5" /> Hide</>
                        : <><Eye className="h-3.5 w-3.5" /> Show</>}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => openLoad(card)}
                      disabled={isFrozen}
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      Load
                    </Button>
                    <Button
                      variant={isFrozen ? "default" : "outline"}
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => toggleFreeze(card)}
                    >
                      {isFrozen
                        ? <><Unlock className="h-3.5 w-3.5" /> Unfreeze</>
                        : <><Lock className="h-3.5 w-3.5" /> Freeze</>}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor={`online-${card.id}`} className="text-sm text-muted-foreground">
                      Online transactions
                    </Label>
                    <Switch id={`online-${card.id}`} defaultChecked={!isFrozen} disabled={isFrozen} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`intl-${card.id}`} className="text-sm text-muted-foreground">
                      International transactions
                    </Label>
                    <Switch id={`intl-${card.id}`} defaultChecked={!isFrozen} disabled={isFrozen} />
                  </div>
                </CardContent>
              </Card>

            </div>
          )
        })}
      </div>

      {/* ── Link Card Dialog ────────────────────────────────────────── */}
      <Dialog open={linkOpen} onOpenChange={(o) => { setLinkOpen(o); if (!o) resetLinkDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link a Pre-paid Card</DialogTitle>
            <DialogDescription>
              Card number is verified via BIN lookup or Luhn checksum. Only the last 4 digits are stored.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">

            {/* Card Number */}
            <div className="flex flex-col gap-1.5">
              <Label>Card Number</Label>
              <div className="relative">
                <Input
                  placeholder="1234 5678 9012 3456"
                  value={fullCardNumber}
                  onChange={e => {
                    const fmt = formatCardInput(e.target.value)
                    setFullCardNumber(fmt)
                    const detected = detectCardType(fmt)
                    if (detected) setCardType(detected)
                    lookupBin(fmt)
                  }}
                  className="pr-24 font-mono tracking-widest"
                  maxLength={19}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  {binLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  {!binLoading && binInfo?.scheme && (
                    <span className="text-xs font-semibold text-muted-foreground capitalize">{binInfo.scheme}</span>
                  )}
                  {showLuhnIndicator && (
                    luhnValid
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      : <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  )}
                </div>
              </div>
              {binInfo?.bank && (
                <p className="text-xs text-muted-foreground">
                  {binInfo.bank}{binInfo.type ? ` · ${binInfo.type}` : ""}
                </p>
              )}
              {binChecked && !binInfo && rawDigits.length >= 6 && (
                <p className="text-xs text-muted-foreground">
                  BIN lookup unavailable — using offline checksum verification
                </p>
              )}
            </div>

            {/* Expiry + CVV */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Expiry (MM/YY)</Label>
                <Input
                  placeholder="09/28"
                  maxLength={5}
                  value={expiry}
                  onChange={e => {
                    let v = e.target.value.replace(/[^\d/]/g, "")
                    if (v.length === 2 && !v.includes("/")) v = v + "/"
                    setExpiry(v)
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>CVV</Label>
                <div className="relative">
                  <Input
                    type={showCvv ? "text" : "password"}
                    placeholder="•••"
                    maxLength={4}
                    value={cvv}
                    onChange={e => setCvv(e.target.value.replace(/\D/g, ""))}
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCvv(p => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showCvv ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Card Holder */}
            <div className="flex flex-col gap-1.5">
              <Label>Card Holder Name</Label>
              <Input
                placeholder="Jane Smith"
                value={cardHolder}
                onChange={e => setCardHolder(e.target.value)}
              />
            </div>

            {/* Card Type */}
            <div className="flex flex-col gap-1.5">
              <Label>
                Card Type{" "}
                <span className="text-xs text-muted-foreground font-normal">(auto-detected)</span>
              </Label>
              <Select value={cardType} onValueChange={(v) => setCardType(v as typeof cardType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visa">Visa</SelectItem>
                  <SelectItem value="Mastercard">Mastercard</SelectItem>
                  <SelectItem value="Platinum">Platinum / Amex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {linkError && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {linkError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setLinkOpen(false); resetLinkDialog() }}>Cancel</Button>
            <Button onClick={handleLinkCard} disabled={linking}>
              {linking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Link Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Load Balance Dialog ──────────────────────────────────────── */}
      <Dialog open={loadOpen} onOpenChange={setLoadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Card Balance</DialogTitle>
            <DialogDescription>
              {selectedCard && (!selectedCard.currency || selectedCard.currency === "")
                ? "First load sets this card's base currency. All future loads will be converted to it."
                : `Card balance is held in ${selectedCard?.currency}. Other wallet currencies will be auto-converted.`
              }
            </DialogDescription>
          </DialogHeader>

          {loadSuccess ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
              <p className="font-medium text-foreground">Card loaded successfully!</p>
              <p className="text-sm text-muted-foreground">
                {(() => {
                  const wallet = wallets.find(w => w.id === fromWalletId)
                  const lf = selectedCard ? parseCardData(selectedCard.last_four).lastFour : ""
                  const fmtAmt = parseFloat(loadAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })
                  if (convertedPreview && wallet && selectedCard?.currency) {
                    return `${wallet.currency} ${fmtAmt} → ${selectedCard.currency} ${convertedPreview.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} added to card ••••${lf}`
                  }
                  const displayCcy = selectedCard?.currency || wallet?.currency || ""
                  return `${displayCcy} ${fmtAmt} added to card ••••${lf}`
                })()}
              </p>
              <Button className="mt-2" onClick={() => setLoadOpen(false)}>Done</Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>From Wallet</Label>
                  <Select value={fromWalletId} onValueChange={setFromWalletId}>
                    <SelectTrigger><SelectValue placeholder="Select wallet" /></SelectTrigger>
                    <SelectContent>
                      {wallets.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.symbol} {w.currency} — {w.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fromWalletId && (() => {
                    const w = wallets.find(w => w.id === fromWalletId)
                    return w ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Wallet className="h-3 w-3" />
                        Available: {w.currency} {w.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    ) : null
                  })()}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={loadAmount}
                    onChange={e => setLoadAmount(e.target.value)}
                  />
                </div>

                {/* FX conversion preview */}
                {convertedPreview && (() => {
                  const wallet = wallets.find(w => w.id === fromWalletId)
                  return wallet ? (
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                      <RefreshCw className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {wallet.currency} {parseFloat(loadAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        {" "}→{" "}
                        <span className="font-medium text-foreground">
                          {selectedCard?.currency} {convertedPreview.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="ml-1.5 text-muted-foreground">
                          @ {convertedPreview.rate.toFixed(4)}
                        </span>
                      </p>
                    </div>
                  ) : null
                })()}

                {/* No FX rate warning */}
                {(() => {
                  const wallet = wallets.find(w => w.id === fromWalletId)
                  const amt = parseFloat(loadAmount)
                  const isFirstLoad = !selectedCard?.currency || selectedCard.currency === ""
                  if (
                    wallet &&
                    selectedCard?.currency &&
                    !isFirstLoad &&
                    wallet.currency !== selectedCard.currency &&
                    !isNaN(amt) && amt > 0 &&
                    convertedPreview === null
                  ) {
                    return (
                      <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        No FX rate available for {wallet.currency} → {selectedCard.currency}. Load from a matching wallet or contact support.
                      </p>
                    )
                  }
                  return null
                })()}

                {loadError && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" /> {loadError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLoadOpen(false)}>Cancel</Button>
                <Button onClick={handleLoad} disabled={loadPending}>
                  {loadPending
                    ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    : <ArrowDownToLine className="h-4 w-4 mr-2" />}
                  Load Balance
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}