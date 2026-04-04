"use client"

import { useEffect, useState } from "react"
import { ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react"
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

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [fxRates, setFxRates] = useState<FxRate[]>([])
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
        // Default conversion selects to first two wallets
        setFromCurrency(walletsRes.data[0]?.currency ?? "")
        setToCurrency(walletsRes.data[1]?.currency ?? "")
      }
      if (fxRes.data) setFxRates(fxRes.data)

      setLoading(false)
    }

    fetchData()
  }, [])

  const totalUSD = wallets.reduce((sum, w) => sum + w.balance, 0)

  // Look up rate for the selected pair (e.g. "USD/EUR")
  const activePair = `${fromCurrency}/${toCurrency}`
  const activeRate = fxRates.find((r) => r.pair === activePair)?.rate ?? null

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
                {activeRate ? (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      1 {fromCurrency} = {activeRate.toFixed(4)} {toCurrency}
                    </p>
                    {amount && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {amount} {fromCurrency} ≈{" "}
                        {(parseFloat(amount) * activeRate).toFixed(2)} {toCurrency}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Rate not available for {activePair}
                  </p>
                )}
              </div>

              <Button onClick={() => setConvertOpen(false)}>Convert</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total balance */}
      <Card className="border-border">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Total Portfolio Value (est. USD)
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-foreground">
            ${totalUSD.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Individual wallets */}
      {wallets.length === 0 ? (
        <p className="text-sm text-muted-foreground">No wallets found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {wallets.map((wallet) => (
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
                <p className="font-serif text-2xl font-bold text-foreground">
                  {formatCurrency(wallet.balance, wallet.currency)}
                </p>
                <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1"
                  onClick={() => router.push("/dashboard/transfers")}>
                  Send
                </Button>
                <Button variant="outline" size="sm" className="flex-1"
                  onClick={() => router.push("/dashboard/accounts")}>
                  Receive
                </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}