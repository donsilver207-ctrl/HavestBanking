import { createClient as createServerClient } from '@/util/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json()
    
    // 1. Verify the admin using the new server client
    const supabase = await createServerClient()
    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rest of your validation logic remains the same...
    const { data: adminProfile, error: adminCheckError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', adminUser.id)
      .single()

    if (adminCheckError || !adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Admin privileges required' }, { status: 403 })
    }

    // 2. Get target user email
    let targetEmail = email
    if (!targetEmail && userId) {
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single()
      
      if (userError || !targetUser?.email) {
        return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
      }
      targetEmail = targetUser.email
    }

    // 3. Generate magic link and verify OTP (remains the same)
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail!,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (linkError || !data) {
      console.error('GenerateLink error:', linkError)
      return NextResponse.json({ error: 'Failed to generate login link' }, { status: 500 })
    }

    const hashedToken = data.properties.hashed_token
    const { data: sessionData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: hashedToken,
      type: 'email',
    })

    if (verifyError || !sessionData.session) {
      console.error('VerifyOtp error:', verifyError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // 4. Log the impersonation (remains the same)
    await supabase.from('audit_logs').insert({
      action: `Admin ${adminUser.email} impersonated user ${targetEmail}`,
      target_user_id: userId,
      target_user_name: targetEmail,
      admin_name: adminUser.email,
      log_type: 'system',
    })

    return NextResponse.json({
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
    })
  } catch (err: any) {
    console.error('Impersonation error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}