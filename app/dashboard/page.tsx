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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase =  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const [walletsRes, txRes, profileRes] = await Promise.all([
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

      if (walletsRes.data) setWallets(walletsRes.data)
      if (txRes.data) setTransactions(txRes.data)
      if (profileRes.data) setProfile(profileRes.data)

      setLoading(false)
    }

    fetchData()
  }, [supabase])

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0)
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
        <Link href="/dashboard/transfers">
          <Button className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Quick Transfer
          </Button>
        </Link>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Balance</p>
            <p className="mt-1 font-serif text-2xl font-bold text-foreground">
              ${totalBalance.toLocaleString()}
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-success">
              <TrendingUp className="h-3 w-3" />
              +2.4% this month
            </p>
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
          <Link
            href="/dashboard/wallets"
            className="text-sm text-primary hover:underline"
          >
            View All
          </Link>
        </div>

        {wallets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No wallets found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {wallets.map((wallet) => (
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
          <Link
            href="/dashboard/transactions"
            className="text-sm text-primary hover:underline"
          >
            View All
          </Link>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transactions yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-3"
                >
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
                        tx.type === "credit"
                          ? "text-success"
                          : "text-foreground"
                      }`}
                    >
                      {tx.type === "credit" ? "+" : ""}
                      {formatCurrency(Math.abs(tx.amount), tx.currency)}
                    </p>
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}