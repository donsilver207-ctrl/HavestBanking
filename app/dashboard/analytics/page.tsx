"use client"

import { useState, useEffect, useMemo,useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from "recharts"
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
]

type Transaction = {
  type: "credit" | "debit"
  amount: number
  currency: string
  created_at: string
}

type FxRate = {
  pair: string
  rate: number
  change_percent: number
}

type MonthlyBar = { month: string; inflow: number; outflow: number; net: number }
type CurrencySlice = { name: string; value: number }

function shortMonth(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", year: "2-digit" })
}
const FX_PAIRS = [
  { pair: "USD/CHF", base: "USD", quote: "CHF" },
  { pair: "EUR/CHF", base: "EUR", quote: "CHF" },
  { pair: "GBP/CHF", base: "GBP", quote: "CHF" },
  { pair: "EUR/USD", base: "EUR", quote: "USD" },
  { pair: "GBP/USD", base: "GBP", quote: "USD" },
  { pair: "USD/JPY", base: "USD", quote: "JPY" },
  //{ pair: "USD/NGN", base: "USD", quote: "NGN" },
  //{ pair: "EUR/NGN", base: "EUR", quote: "NGN" },
]

async function fetchAndSyncFxRates(
  supabase: ReturnType<typeof createBrowserClient>
): Promise<FxRate[]> {
  // exchangerate-api.com free tier — no API key needed
  // One call per base currency, returns all quotes
  const bases = [...new Set(FX_PAIRS.map(p => p.base))]

  const ratesByCurrency: Record<string, Record<string, number>> = {}

  await Promise.all(
    bases.map(async (base) => {
      try {
        const res = await fetch(
          `https://open.er-api.com/v6/latest/${base}`
        )
        if (!res.ok) return
        const data = await res.json()
        if (data.result === "success") {
          ratesByCurrency[base] = data.rates
        }
      } catch {
        // silently skip failed base
      }
    })
  )

  if (!Object.keys(ratesByCurrency).length) return []

  const now = new Date().toISOString()
  const upsertRows = FX_PAIRS
    .filter(p => ratesByCurrency[p.base]?.[p.quote] !== undefined)
    .map(p => {
      const rate = ratesByCurrency[p.base][p.quote]
      return {
        pair: p.pair,
        rate,
        change_percent: 0, // updated below by comparing with existing
        updated_at: now,
      }
    })

  if (!upsertRows.length) return []

  // Fetch existing rates to compute change_percent
  const { data: existing } = await supabase
    .from("fx_rates")
    .select("pair, rate")
    .in("pair", upsertRows.map(r => r.pair))

  const prevByPair: Record<string, number> = {}
  for (const row of existing ?? []) {
    prevByPair[row.pair] = row.rate
  }

  const rowsWithChange = upsertRows.map(row => ({
    ...row,
    change_percent:
      prevByPair[row.pair] != null && prevByPair[row.pair] !== 0
        ? parseFloat(
            (((row.rate - prevByPair[row.pair]) / prevByPair[row.pair]) * 100).toFixed(2)
          )
        : 0,
  }))

  await supabase.from("fx_rates").upsert(rowsWithChange, { onConflict: "pair" })

  return rowsWithChange.map(r => ({
    pair: r.pair,
    rate: r.rate,
    change_percent: r.change_percent,
  }))
}
export default function AnalyticsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fxRates, setFxRates] = useState<FxRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /*useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Not authenticated"); setLoading(false); return }

      // Fetch last 6 months of transactions + all FX rates in parallel
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const [
        { data: txData, error: txErr },
        { data: fxData, error: fxErr },
      ] = await Promise.all([
        supabase
          .from("transactions")
          .select("type, amount, currency, created_at")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("created_at", sixMonthsAgo.toISOString())
          .order("created_at", { ascending: true }),
        supabase
          .from("fx_rates")
          .select("pair, rate, change_percent")
          .order("pair"),
      ])

      if (txErr || fxErr) { setError(txErr?.message ?? fxErr?.message ?? "Failed to load"); setLoading(false); return }
      setTransactions(txData ?? [])
      setFxRates(fxData ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])*/
// Tracks when we last synced so we only hit the API once per hour
const lastSyncRef = useRef<number>(0)

useEffect(() => {
  async function fetchData() {
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Not authenticated"); setLoading(false); return }

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Always load transactions from DB
    const { data: txData, error: txErr } = await supabase
      .from("transactions")
      .select("type, amount, currency, created_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .gte("created_at", sixMonthsAgo.toISOString())
      .order("created_at", { ascending: true })

    if (txErr) { setError(txErr.message); setLoading(false); return }
    setTransactions(txData ?? [])

    // Check if we need to sync FX rates (once per hour)
    const now = Date.now()
    const ONE_HOUR = 60 * 60 * 1000
    const needsSync = now - lastSyncRef.current > ONE_HOUR

    if (needsSync) {
      const synced = await fetchAndSyncFxRates(supabase)
      if (synced.length > 0) {
        setFxRates(synced)
        lastSyncRef.current = now
      } else {
        // Sync failed — fall back to whatever is already in the DB
        const { data: fxData } = await supabase
          .from("fx_rates")
          .select("pair, rate, change_percent")
          .order("pair")
        setFxRates(fxData ?? [])
      }
    } else {
      // Within the hour — just read from DB
      const { data: fxData, error: fxErr } = await supabase
        .from("fx_rates")
        .select("pair, rate, change_percent")
        .order("pair")
      if (fxErr) { setError(fxErr.message); setLoading(false); return }
      setFxRates(fxData ?? [])
    }

    setLoading(false)
  }

  fetchData()

  // Re-run every hour to keep rates fresh while the page is open
  const interval = setInterval(fetchData, 60 * 60 * 1000)
  return () => clearInterval(interval)
}, [])
  // ── Derived analytics ──────────────────────────────────────────────
  const { monthlyData, currencyBreakdown, summaryStats } = useMemo(() => {
    if (!transactions.length) return { monthlyData: [], currencyBreakdown: [], summaryStats: null }

    // Group by month
    const byMonth: Record<string, { inflow: number; outflow: number }> = {}
    const byCurrency: Record<string, number> = {}
    let totalInflow = 0
    let totalOutflow = 0

    for (const tx of transactions) {
      const month = shortMonth(tx.created_at)
      if (!byMonth[month]) byMonth[month] = { inflow: 0, outflow: 0 }

      if (tx.type === "credit") {
        byMonth[month].inflow += tx.amount
        totalInflow += tx.amount
        byCurrency[tx.currency] = (byCurrency[tx.currency] ?? 0) + tx.amount
      } else {
        byMonth[month].outflow += tx.amount
        totalOutflow += tx.amount
      }
    }

    const monthlyData: MonthlyBar[] = Object.entries(byMonth).map(([month, v]) => ({
      month,
      inflow: Math.round(v.inflow),
      outflow: Math.round(v.outflow),
      net: Math.round(v.inflow - v.outflow),
    }))

    // Currency breakdown as percentages of total credit volume
    const totalCredit = Object.values(byCurrency).reduce((a, b) => a + b, 0)
    const currencyBreakdown: CurrencySlice[] = Object.entries(byCurrency).map(([name, val]) => ({
      name,
      value: totalCredit > 0 ? Math.round((val / totalCredit) * 100) : 0,
    }))

    const netPosition = totalInflow - totalOutflow
    const avgTx = transactions.length > 0
      ? (totalInflow + totalOutflow) / transactions.length
      : 0

    return {
      monthlyData,
      currencyBreakdown,
      summaryStats: { totalInflow, totalOutflow, netPosition, avgTx, count: transactions.length },
    }
  }, [transactions])

  function fmt(n: number, currency = "USD") {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
  }

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

  const noData = !summaryStats || transactions.length === 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">Financial insights and portfolio breakdown</p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Inflow (6M)</p>
            <p className="mt-1 font-serif text-xl font-bold text-foreground">
              {noData ? "—" : fmt(summaryStats.totalInflow)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" />
              from completed credits
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Outflow (6M)</p>
            <p className="mt-1 font-serif text-xl font-bold text-foreground">
              {noData ? "—" : fmt(summaryStats.totalOutflow)}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-destructive">
              <TrendingDown className="h-3 w-3" />
              from completed debits
            </p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Net Position</p>
            <p className={`mt-1 font-serif text-xl font-bold ${!noData && summaryStats.netPosition >= 0 ? "text-success" : "text-destructive"}`}>
              {noData ? "—" : `${summaryStats.netPosition >= 0 ? "+" : ""}${fmt(summaryStats.netPosition)}`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Across all currencies</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Avg Transaction</p>
            <p className="mt-1 font-serif text-xl font-bold text-foreground">
              {noData ? "—" : fmt(summaryStats.avgTx)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {noData ? "No data" : `${summaryStats.count} transaction${summaryStats.count !== 1 ? "s" : ""}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {noData ? (
        <Card className="border-border">
          <CardContent className="flex h-48 items-center justify-center">
            <p className="text-sm text-muted-foreground">No completed transactions in the last 6 months.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Inflow / Outflow bar chart */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Monthly Inflow vs Outflow</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`]}
                    />
                    <Bar dataKey="inflow" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Inflow" />
                    <Bar dataKey="outflow" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Outflow" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Currency breakdown pie */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">Currency Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                {currencyBreakdown.length === 0 ? (
                  <div className="flex h-[280px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">No credit data available.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={currencyBreakdown}
                        cx="50%" cy="50%"
                        innerRadius={65} outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`}
                      >
                        {currencyBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                        formatter={(v: number) => [`${v}%`]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Net flow area chart */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base">Net Cash Flow Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`]}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.15}
                    name="Net Flow"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      {/* FX Rates */}
      <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Live FX Rates</CardTitle>
        {fxRates.length > 0 && (
          <span className="text-xs text-muted-foreground">
            Updates hourly
          </span>
        )}
      </CardHeader>
        <CardContent>
          {fxRates.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No FX rates available.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fxRates.map((fx) => (
                <div key={fx.pair} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{fx.pair}</p>
                    <p className="font-mono text-lg font-bold text-foreground">{fx.rate.toFixed(4)}</p>
                  </div>
                  <Badge
                    variant={fx.change_percent >= 0 ? "secondary" : "destructive"}
                    className="flex items-center gap-1"
                  >
                    {fx.change_percent >= 0
                      ? <TrendingUp className="h-3 w-3" />
                      : <TrendingDown className="h-3 w-3" />}
                    {fx.change_percent >= 0 ? "+" : ""}{fx.change_percent}%
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