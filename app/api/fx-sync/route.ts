// app/api/fx-sync/route.ts
// Fetches live FX rates at most once per calendar day.
// On subsequent calls within the same day, returns cached DB rates immediately.

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const FX_PAIRS = [
  { pair: "USD/CHF", base: "USD", quote: "CHF" },
  { pair: "EUR/CHF", base: "EUR", quote: "CHF" },
  { pair: "GBP/CHF", base: "GBP", quote: "CHF" },
  { pair: "EUR/USD", base: "EUR", quote: "USD" },
  { pair: "GBP/USD", base: "GBP", quote: "USD" },
  { pair: "USD/JPY", base: "USD", quote: "JPY" },
  { pair: "EUR/GBP", base: "EUR", quote: "GBP" },
]

/** Returns "YYYY-MM-DD" in UTC */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // ── 1. Read whatever is already in the DB ──────────────────────────────────
  const { data: existingRates, error: readError } = await supabase
    .from("fx_rates")
    .select("pair, rate, updated_at")

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 })
  }

  // Build current rate map from DB rows
  const rateMap: Record<string, number> = {}
  for (const row of existingRates ?? []) {
    rateMap[row.pair] = Number(row.rate)
  }

  // ── 2. Check if any row was already updated today (UTC) ───────────────────
  // All pairs are synced together so checking one is enough.
  const alreadySyncedToday = (existingRates ?? []).some(
    (row) => row.updated_at?.slice(0, 10) === todayUTC()
  )

  if (alreadySyncedToday) {
    // Return cached DB rates — no external API call needed
    return NextResponse.json({
      rates: rateMap,
      synced: 0,
      source: "cache",
    })
  }

  // ── 3. Fetch live rates from external API (once per day) ───────────────────
  const bases = [...new Set(FX_PAIRS.map((p) => p.base))]
  const ratesByCurrency: Record<string, Record<string, number>> = {}

  await Promise.all(
    bases.map(async (base) => {
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${base}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.result === "success") {
          ratesByCurrency[base] = data.rates as Record<string, number>
        }
      } catch {
        // Silently skip — if all bases fail we return the existing DB rates
      }
    })
  )

  // ── 4. Build rows (canonical + inverse) ────────────────────────────────────
  const now = new Date().toISOString()
  const rows: { pair: string; rate: number; updated_at: string }[] = []
  const freshRateMap: Record<string, number> = {}

  for (const { pair, base, quote } of FX_PAIRS) {
    const rate = ratesByCurrency[base]?.[quote]
    if (rate === undefined || rate === 0) continue

    rows.push({ pair, rate, updated_at: now })
    freshRateMap[pair] = rate

    const inversePair = `${quote}/${base}`
    const inverseRate = 1 / rate
    rows.push({ pair: inversePair, rate: inverseRate, updated_at: now })
    freshRateMap[inversePair] = inverseRate
  }

  // If the external API returned nothing at all, fall back to DB rates
  if (rows.length === 0) {
    return NextResponse.json({
      rates: rateMap,
      synced: 0,
      source: "cache_fallback",
    })
  }

  // ── 5. Upsert fresh rates into DB ──────────────────────────────────────────
  const { error: upsertError } = await supabase
    .from("fx_rates")
    .upsert(rows, { onConflict: "pair" })

  return NextResponse.json({
    rates: freshRateMap,
    synced: rows.length,
    source: "live",
    dbError: upsertError?.message ?? null,
  })
}