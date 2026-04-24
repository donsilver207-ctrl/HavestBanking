import { Webhook } from "svix"
import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!)
  let payload: any
  try {
    payload = wh.verify(rawBody, {
      "svix-id":        req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    })
  } catch (err) {
    console.error("Webhook verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  if (payload.type !== "email.received") {
    return NextResponse.json({})
  }

  const { email_id, from, to, subject, attachments } = payload.data

  // ✅ Correct method for inbound emails
  const { data: email, error } = await resend.emails.receiving.get(email_id)

  if (error || !email) {
    console.error("Failed to fetch received email:", error)
    return NextResponse.json({ error: "Failed to fetch email" }, { status: 500 })
  }

  const body  = email.text ?? email.html ?? ""
  const files = (attachments ?? []).map((a: any) => ({
    name: a.filename ?? a.name,
    size: "—",
  }))

  const { error: dbError } = await supabase.from("emails").insert({
    direction:    "received",
    from_address: from,
    to_address:   Array.isArray(to) ? to[0] : to,
    subject,
    body_text:    body,
    preview:      body.slice(0, 120),
    read:         false,
    starred:      false,
    attachments:  files,
  })

  if (dbError) {
    console.error("Supabase insert error:", dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}