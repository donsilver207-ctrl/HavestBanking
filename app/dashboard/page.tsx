"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Shield,
  DollarSign,
  RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { createBrowserClient } from "@supabase/ssr"

// ── Types ────────────────────────────────────────────────────────────────────

interface Wallet {
  id: string
  currency: string
  symbol: string
  balance: number
  change_percent: number
}

interface Transaction {
  id: string
  type: "credit" | "debit"
  description: string
  amount: number
  currency: string
  status: "completed" | "pending" | "flagged" | "cancelled"
  created_at: string
}

interface Profile {
  tier: number
  kyc_status: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Convert `amount` in `currency` → USD.
 *
 * Because /api/fx-sync stores BOTH directions (e.g. "USD/CHF" AND "CHF/USD"),
 * this is a simple direct lookup: find "CURRENCY/USD" and multiply.
 *
 *   CHF/USD = 1.111  →  500 CHF * 1.111 = 555.55 USD  ✓
 *   EUR/USD = 1.08   →  200 EUR * 1.08  = 216.00 USD  ✓
 *   JPY/USD = 0.0067 →  10000 JPY * 0.0067 = 67 USD   ✓
 */
function toUSD(
  amount: number,
  currency: string,
  rateMap: Record<string, number>
): number | null {
  if (currency === "USD") return amount
  const rate = rateMap[`${currency}/USD`]
  if (rate !== undefined) return amount * rate
  return null
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rateMap, setRateMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [fxLastUpdated, setFxLastUpdated] = useState<Date | null>(null)

  async function loadData() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    // 1. Hit our API route (service-role key, bypasses RLS) to fetch + save rates.
    //    Run in parallel with user data queries.
    const [fxRes, walletsRes, txRes, profileRes] = await Promise.all([
      fetch("/api/fx-sync").then((r) => r.json()).catch(() => ({ rates: {} })),

      supabase
        .from("wallets")
        .select("id, currency, symbol, balance, change_percent")
        .eq("user_id", user.id)
        .order("balance", { ascending: false }),

      supabase
        .from("transactions")
        .select("id, type, description, amount, currency, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),

      supabase
        .from("profiles")
        .select("tier, kyc_status")
        .eq("id", user.id)
        .single(),
    ])

    // 2. Use live rates from API route; fall back to DB read if route failed
    let finalRateMap: Record<string, number> = fxRes.rates ?? {}

    if (Object.keys(finalRateMap).length === 0) {
      const { data: dbRates } = await supabase
        .from("fx_rates")
        .select("pair, rate")

      if (dbRates) {
        for (const row of dbRates as { pair: string; rate: number }[]) {
          finalRateMap[row.pair] = Number(row.rate)
        }
      }
    }

    if (walletsRes.data) setWallets(walletsRes.data)
    if (txRes.data) setTransactions(txRes.data)
    if (profileRes.data) setProfile(profileRes.data)
    setRateMap(finalRateMap)
    setFxLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Derived values ───────────────────────────────────────────────────────

  const walletsWithUSD = wallets.map((w) => ({
    ...w,
    usdEquivalent: toUSD(w.balance, w.currency, rateMap),
  }))

  const totalUSD = walletsWithUSD.reduce(
    (sum, w) => (w.usdEquivalent !== null ? sum + w.usdEquivalent : sum),
    0
  )

  const hasUnresolvableWallet = walletsWithUSD.some(
    (w) => w.usdEquivalent === null && w.currency !== "USD"
  )

  const isKycApproved = profile?.kyc_status === "approved"
  const tierLabel =
    profile?.tier === 3
      ? "Private Banking"
      : profile?.tier === 2
      ? "Premium"
      : "Standard"

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Loading your portfolio…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of your offshore portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          {fxLastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              FX updated {fxLastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={loadData}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Link href="/dashboard/transfers">
            <Button className="gap-2">
              <ArrowRight className="h-4 w-4" />
              Quick Transfer
            </Button>
          </Link>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">
              Total Balance (USD equiv.)
            </p>
            <p className="mt-1 font-serif text-2xl font-bold text-foreground">
              {formatUSD(totalUSD)}
            </p>
            {hasUnresolvableWallet ? (
              <p className="mt-1 text-xs text-amber-500">
                * Some wallets excluded (no rate)
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1 text-xs text-success">
                <TrendingUp className="h-3 w-3" />
                Live FX rates applied
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Risk Score</p>
            <p className="mt-1 font-serif text-2xl font-bold text-foreground">
              Low
            </p>
            <Progress value={15} className="mt-2 h-1.5" />
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Account Tier</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">
                Tier {profile?.tier ?? "—"}
              </Badge>
              <span className="text-sm text-foreground">{tierLabel}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {profile?.tier === 3 ? "No balance cap" : "Standard limits apply"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Compliance Status</p>
            <div className="mt-1 flex items-center gap-2">
              <Shield
                className={`h-5 w-5 ${
                  isKycApproved ? "text-success" : "text-muted-foreground"
                }`}
              />
              <span className="text-sm font-medium text-foreground">
                {isKycApproved ? "Fully Verified" : "Pending Review"}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              KYC {profile?.kyc_status ?? "unknown"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-currency wallets */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Currency Wallets
          </h2>
          <Link href="/dashboard/wallets" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>

        {walletsWithUSD.length === 0 ? (
          <p className="text-sm text-muted-foreground">No wallets found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {walletsWithUSD.map((wallet) => (
              <Card key={wallet.currency} className="border-border">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {wallet.currency}
                    </span>
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

                  <p className="mt-2 text-xl font-bold text-foreground">
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </p>

                  {wallet.currency !== "USD" && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      {wallet.usdEquivalent !== null
                        ? `≈ ${formatUSD(wallet.usdEquivalent)}`
                        : "Rate unavailable"}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-lg font-semibold text-foreground">
            Recent Transactions
          </CardTitle>
          <Link href="/dashboard/transactions" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {transactions.map((tx) => {
                const txUSD = toUSD(Math.abs(tx.amount), tx.currency, rateMap)
                return (
                  <div key={tx.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          tx.type === "credit"
                            ? "bg-success/10 text-success"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {tx.type === "credit" ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {tx.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          tx.type === "credit" ? "text-success" : "text-foreground"
                        }`}
                      >
                        {tx.type === "credit" ? "+" : ""}
                        {formatCurrency(Math.abs(tx.amount), tx.currency)}
                      </p>

                      {tx.currency !== "USD" && txUSD !== null && (
                        <p className="text-xs text-muted-foreground">
                          ≈ {formatUSD(txUSD)}
                        </p>
                      )}

                      <Badge
                        variant={
                          tx.status === "completed"
                            ? "secondary"
                            : tx.status === "pending"
                            ? "outline"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {tx.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}