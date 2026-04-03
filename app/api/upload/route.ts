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

    const formData = await request.formData()
    const file = formData.get("file") as File
    const bucket = formData.get("bucket") as string

    if (!file || !bucket) {
      return NextResponse.json(
        { error: "Missing file or bucket" },
        { status: 400 }
      )
    }

    const fileName = `${user.id}/${Date.now()}_${file.name}`
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, buffer, { upsert: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { data: publicUrl } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return NextResponse.json({
      path: data.path,
      publicUrl: publicUrl.publicUrl,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    )
  }
}
