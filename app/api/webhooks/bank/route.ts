import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// This webhook would receive callbacks from payment processors
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transfer_id, status, transaction_hash } = body

    const supabase = await createClient()

    // Update transfer status
    const { error: updateError } = await supabase
      .from("transfers")
      .update({
        status,
        completed_at: status === "completed" ? new Date() : null,
        transaction_hash,
      })
      .eq("id", transfer_id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    // Get the transfer to update transactions
    const { data: transfer } = await supabase
      .from("transfers")
      .select("*")
      .eq("id", transfer_id)
      .single()

    if (transfer) {
      // Update transaction status
      await supabase
        .from("transactions")
        .update({
          status,
          completed_at: status === "completed" ? new Date() : null,
        })
        .eq("id", transfer.id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    )
  }
}
