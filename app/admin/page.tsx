"use client"

import { useEffect, useState } from "react"
import {
  Users,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Shield,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { createBrowserClient } from "@supabase/ssr"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stats {
  totalUsers: number
  activeUsers: number
  pendingKyc: number
  flaggedTx: number
  totalAum: number
}

interface AuditLog {
  id: string
  action: string
  target_user_name: string | null
  admin_name: string
  log_type: string
  created_at: string
}

interface MonthlyBar {
  month: string
  inflow: number
  outflow: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Bucket transactions into the last 6 calendar months */
function buildMonthlyData(
  transactions: { type: string; amount: number; created_at: string }[]
): MonthlyBar[] {
  const now = new Date()
  const months: MonthlyBar[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      month: d.toLocaleString("default", { month: "short" }),
      inflow: 0,
      outflow: 0,
    })
  }

  transactions.forEach(({ type, amount, created_at }) => {
    const d = new Date(created_at)
    const monthStr = d.toLocaleString("default", { month: "short" })
    const bar = months.find((m) => m.month === monthStr)
    if (!bar) return
    if (type === "credit") bar.inflow += amount
    else bar.outflow += amount
  })

  return months
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyBar[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function fetchAll() {
      const [
        profilesRes,
        walletsRes,
        flaggedRes,
        logsRes,
        txVolumeRes,
      ] = await Promise.all([
        // All profiles — admin RLS allows this
        supabase
          .from("profiles")
          .select("id, account_status, kyc_status"),

        // All wallets to sum AUM
        supabase
          .from("wallets")
          .select("balance"),

        // Count flagged transactions
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("status", "flagged"),

        // Recent audit logs
        supabase
          .from("audit_logs")
          .select("id, action, target_user_name, admin_name, log_type, created_at")
          .order("created_at", { ascending: false })
          .limit(5),

        // Last 6 months of transactions for the chart
        supabase
          .from("transactions")
          .select("type, amount, created_at")
          .gte(
            "created_at",
            new Date(
              new Date().getFullYear(),
              new Date().getMonth() - 5,
              1
            ).toISOString()
          ),
      ])

      // ── Stats
      const profiles = profilesRes.data ?? []
      const totalAum = (walletsRes.data ?? []).reduce(
        (sum, w) => sum + (w.balance ?? 0),
        0
      )

      setStats({
        totalUsers: profiles.length,
        activeUsers: profiles.filter((p) => p.account_status === "active").length,
        pendingKyc: profiles.filter((p) => p.kyc_status === "pending").length,
        flaggedTx: flaggedRes.count ?? 0,
        totalAum,
      })

      // ── Logs
      setLogs(logsRes.data ?? [])

      // ── Chart
      setMonthlyData(buildMonthlyData(txVolumeRes.data ?? []))

      setLoading(false)
    }

    fetchAll()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading admin dashboard…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Admin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Platform overview and system health
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total Users</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-foreground">
              {stats?.totalUsers ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats?.activeUsers ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total AUM</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-foreground">
              ${((stats?.totalAum ?? 0) / 1e6).toFixed(1)}M
            </p>
            <p className="flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" />
              Live from wallets
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Pending KYC</p>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-warning">
              {stats?.pendingKyc ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Requires review</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Flagged TXs</p>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-destructive">
              {stats?.flaggedTx ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Awaiting compliance</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Chart ── */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">
            Platform Transaction Volume — Last 6 Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.every((m) => m.inflow === 0 && m.outflow === 0) ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No transaction data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  tickFormatter={(v) => `$${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`]}
                />
                <Bar
                  dataKey="inflow"
                  fill="hsl(var(--chart-1))"
                  radius={[4, 4, 0, 0]}
                  name="Inflow"
                />
                <Bar
                  dataKey="outflow"
                  fill="hsl(var(--chart-5))"
                  radius={[4, 4, 0, 0]}
                  name="Outflow"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Audit Logs ── */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No audit logs yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {log.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.target_user_name ?? "—"} · by {log.admin_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {log.log_type}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}