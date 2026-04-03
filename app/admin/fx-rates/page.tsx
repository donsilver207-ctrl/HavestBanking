"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, RefreshCw, Save } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fxRates } from "@/lib/mock-data"

export default function AdminFxRatesPage() {
  const [rates, setRates] = useState(fxRates)
  const [editing, setEditing] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setEditing(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">
            FX Rate Management
          </h1>
          <p className="text-sm text-muted-foreground">
            View and override foreign exchange rates
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Sync Market Rates
        </Button>
      </div>

      {saved && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-center text-sm font-medium text-success">
          FX rates updated successfully.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rates.map((fx) => (
          <Card key={fx.pair} className="border-border">
            <CardContent className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                  {fx.pair}
                </h3>
                <Badge
                  variant={fx.change >= 0 ? "secondary" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {fx.change >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {fx.change >= 0 ? "+" : ""}
                  {fx.change}%
                </Badge>
              </div>

              {editing === fx.pair ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.0001"
                    defaultValue={fx.rate}
                    className="font-mono"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      if (!isNaN(val)) {
                        setRates((prev) =>
                          prev.map((r) =>
                            r.pair === fx.pair ? { ...r, rate: val } : r
                          )
                        )
                      }
                    }}
                  />
                  <Button size="icon" onClick={handleSave}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-end justify-between">
                  <p className="font-mono text-2xl font-bold text-foreground">
                    {fx.rate.toFixed(4)}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(fx.pair)}
                  >
                    Override
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Last updated: Feb 16, 2026 09:30 CET
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-muted/50">
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            Rate overrides take effect immediately and apply a fixed spread of
            0.15% for Tier 1, 0.10% for Tier 2, and 0.05% for Tier 3 Private
            Banking clients. Market rates are synced automatically every 15
            minutes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
