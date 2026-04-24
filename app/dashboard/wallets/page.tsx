"use client"

import { useEffect, useState } from "react"
import { ArrowLeftRight, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"

interface Wallet {
  id: string
  currency: string
  symbol: string
  balance: number
  change_percent: number
}

interface FxRate {
  pair: string
  rate: number
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatUSD(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Convert `amount` in `fromCurrency` to `toCurrency` using the rate map.
 *
 * Strategy:
 *  1. Direct pair  → e.g. "CHF/USD" rate gives USD per 1 CHF
 *  2. Inverse pair → e.g. "USD/CHF" rate gives CHF per 1 USD, so invert it
 *  3. USD bridge   → convert via USD as intermediary (FROM→USD→TO)
 */
function convert(
  amount: number,
  from: string,
  to: string,
  rateMap: Record<string, number>
): number | null {
  if (from === to) return amount

  // 1. Direct
  const direct = rateMap[`${from}/${to}`]
  if (direct !== undefined) return amount * direct

  // 2. Inverse
  const inverse = rateMap[`${to}/${from}`]
  if (inverse !== undefined && inverse !== 0) return amount / inverse

  // 3. Bridge via USD
  if (from !== "USD" && to !== "USD") {
    const toUSD = convert(amount, from, "USD", rateMap)
    if (toUSD !== null) {
      const toTarget = convert(toUSD, "USD", to, rateMap)
      if (toTarget !== null) return toTarget
    }
  }

  return null
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [rateMap, setRateMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [convertOpen, setConvertOpen] = useState(false)

  // Conversion dialog state
  const [fromCurrency, setFromCurrency] = useState("")
  const [toCurrency, setToCurrency] = useState("")
  const [amount, setAmount] = useState("")
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [walletsRes, fxRes] = await Promise.all([
        supabase
          .from("wallets")
          .select("id, currency, symbol, balance, change_percent")
          .eq("user_id", user.id)
          .order("balance", { ascending: false }),

        supabase
          .from("fx_rates")
          .select("pair, rate"),
      ])

      if (walletsRes.data) {
        setWallets(walletsRes.data)
        setFromCurrency(walletsRes.data[0]?.currency ?? "")
        setToCurrency(walletsRes.data[1]?.currency ?? "")
      }

      if (fxRes.data) {
        const map: Record<string, number> = {}
        for (const row of fxRes.data as FxRate[]) {
          map[row.pair] = Number(row.rate)
        }
        setRateMap(map)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  // Total portfolio value converted to USD
  const totalUSD = wallets.reduce((sum, w) => {
    const usd = convert(w.balance, w.currency, "USD", rateMap)
    return usd !== null ? sum + usd : sum
  }, 0)

  // Conversion dialog: resolved rate between selected pair
  const convertedAmount =
    amount && fromCurrency && toCurrency
      ? convert(parseFloat(amount), fromCurrency, toCurrency, rateMap)
      : null

  // Effective display rate: 1 fromCurrency → X toCurrency
  const effectiveRate =
    fromCurrency && toCurrency
      ? convert(1, fromCurrency, toCurrency, rateMap)
      : null

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading wallets…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Wallets
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your multi-currency wallets
          </p>
        </div>

        <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              Convert Currency
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Currency Conversion</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>From</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => (
                      <SelectItem key={w.currency} value={w.currency}>
                        {w.currency} · {w.symbol} — {formatCurrency(w.balance, w.currency)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>To</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets
                      .filter((w) => w.currency !== fromCurrency)
                      .map((w) => (
                        <SelectItem key={w.currency} value={w.currency}>
                          {w.currency} · {w.symbol}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="rounded-md bg-muted p-3">
                <p className="text-xs text-muted-foreground">Exchange Rate</p>
                {effectiveRate !== null ? (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      1 {fromCurrency} = {effectiveRate.toFixed(4)} {toCurrency}
                    </p>
                    {convertedAmount !== null && amount && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {amount} {fromCurrency} ≈{" "}
                        {formatCurrency(convertedAmount, toCurrency)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Rate not available for {fromCurrency}/{toCurrency}
                  </p>
                )}
              </div>

              <Button onClick={() => setConvertOpen(false)}>Convert</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total balance in USD */}
      <Card className="border-border">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Total Portfolio Value (USD equiv.)
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-foreground">
            {formatUSD(totalUSD)}
          </p>
        </CardContent>
      </Card>

      {/* Individual wallets */}
      {wallets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No wallets found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {wallets.map((wallet) => {
            const usdEquiv = convert(wallet.balance, wallet.currency, "USD", rateMap)
            return (
              <Card key={wallet.currency} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base text-foreground">
                      {wallet.currency} Wallet
                    </CardTitle>
                    {wallet.change_percent >= 0 ? (
                      <span className="flex items-center gap-0.5 text-xs text-success">
                        <TrendingUp className="h-3 w-3" />
                        +{wallet.change_percent}%
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-xs text-destructive">
                        <TrendingDown className="h-3 w-3" />
                        {wallet.change_percent}%
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Native balance */}
                  <p className="font-serif text-2xl font-bold text-foreground">
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </p>

                  {/* USD equivalent */}
                  {wallet.currency !== "USD" && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      {usdEquiv !== null
                        ? `≈ ${formatUSD(usdEquiv)}`
                        : "Rate unavailable"}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push("/dashboard/transfers")}
                    >
                      Send
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push("/dashboard/accounts")}
                    >
                      Receive
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}