import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      from_wallet_id,
      to_wallet_id,
      amount,
      currency,
      type, // "internal", "swift", "wire", "scheduled"
    } = body

    if (!from_wallet_id || !to_wallet_id || !amount || !currency || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Create transfer record
    const { data: transfer, error } = await supabase
      .from("transfers")
      .insert({
        user_id: user.id,
        from_wallet_id,
        to_wallet_id,
        amount,
        currency,
        type,
        status: "pending",
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create transaction record
    const { error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        wallet_id: from_wallet_id,
        type: "transfer_out",
        amount: -amount,
        currency,
        status: "pending",
        description: `Transfer to ${to_wallet_id}`,
      })

    if (txError) {
      console.error("Failed to create transaction:", txError)
    }

    return NextResponse.json(transfer)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Transfer failed" },
      { status: 500 }
    )
  }
}
