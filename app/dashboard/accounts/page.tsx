"use client"

import { useEffect, useState } from "react"
import { Copy, Download, Building2 } from "lucide-react"
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

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function fetchAccounts() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("accounts")
        .select("id, name, account_number, iban, swift, jurisdiction, account_type, balance, currency, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })

      if (data) setAccounts(data)
      setLoading(false)
    }

    fetchAccounts()
  }, [])

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
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
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Accounts
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your offshore banking accounts
        </p>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accounts found.</p>
      ) : (
        <div className="grid gap-6">
          {accounts.map((account) => (
            <Card key={account.id} className="border-border">
              <CardHeader className="flex flex-row items-start justify-between pb-4">
                <div>
                  <CardTitle className="text-lg text-foreground">
                    {account.name}
                  </CardTitle>
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
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Account Number</p>
                    <p className="mt-0.5 text-sm font-mono text-foreground">
                      {account.account_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">IBAN</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <p className="truncate text-sm font-mono text-foreground">
                        {account.iban ?? "—"}
                      </p>
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
                    <p className="mt-0.5 text-sm font-mono text-foreground">
                      {account.swift ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Jurisdiction</p>
                    <div className="mt-0.5 flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <p className="text-sm text-foreground">
                        {account.jurisdiction}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}