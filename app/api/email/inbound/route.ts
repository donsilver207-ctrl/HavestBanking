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
  // ── Verify the request is genuinely from Resend ──────────────────────────
  const rawBody = await req.text() // must use text(), not json()

  /*const svixHeaders = {
    "svix-id":        req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  }

  let payload: any
  try {
    payload = resend.webhooks.verify(rawBody, svixHeaders)
  } catch (err) {
    console.error("Webhook verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }*/
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
  // ── Process the verified payload ─────────────────────────────────────────
 /* if (payload.type !== "email.received") {
    return NextResponse.json({})
  }

  const { email_id, from, to, subject, attachments } = payload.data

  const { data: emailData } = await resend.emails.get(email_id)

  const body  = emailData?.text ?? emailData?.html ?? ""
  const files = (attachments ?? []).map((a: any) => ({
    name: a.filename,
    size: "—",
  }))

  await supabase.from("emails").insert({
    direction:    "received",
    from_address: from,
    to_address:   Array.isArray(to) ? to[0] : to,
    subject,
    body_text:    body,
    read:         false,
    starred:      false,
    attachments:  files,
  })*/


    if (payload.type !== "email.received") {
      return NextResponse.json({})
    }

    const { email_id, from, to, subject, text, html, attachments } = payload.data
    //                                          ^^^^  ^^^^
    //                                          These are in the payload already!

    const body  = text ?? html ?? ""   // no resend.emails.get() needed
    const files = (attachments ?? []).map((a: any) => ({
      name: a.filename,
      size: "—",
    }))

    await supabase.from("emails").insert({
      direction:    "received",
      from_address: from,
      to_address:   Array.isArray(to) ? to[0] : to,
      subject,
      body_text:    body,
      preview:      body.slice(0, 120),   // ← also populate preview while you're here
      read:         false,
      starred:      false,
      attachments:  files,
    })

  return NextResponse.json({ ok: true })
}