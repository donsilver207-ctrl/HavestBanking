import { Resend } from "resend"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { to, subject, body, from = "support@crestmontintl.com" } = await req.json()

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    text: body,
  })

  if (error) return NextResponse.json({ error }, { status: 400 })

  await supabase.from("emails").insert({
    direction:    "sent",
    from_address: from,
    to_address:   to,
    subject,
    body_text:    body,
    read:         true,
    starred:      false,
    attachments:  [],
  })

  return NextResponse.json({ success: true, id: data?.id })
}