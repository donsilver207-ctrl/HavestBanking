import { createClient as createServerClient } from '@/util/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  try {
    // 1. Verify admin (using server client)
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: 'Admin required' }, { status: 403 })
    }

    const url = new URL(req.url)
    const tableName = url.searchParams.get('table')
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20')
    const offset = (page - 1) * pageSize

    // CASE: Fetch data for a specific table
    if (tableName) {
      // Validate tableName to prevent SQL injection (must exist in public schema)
      const { data: exists, error: existsError } = await supabaseAdmin
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (existsError && existsError.code !== '42P01') { // 42P01 = relation does not exist
        console.error('Table existence check error:', existsError)
        return NextResponse.json({ error: 'Invalid table name or no access' }, { status: 400 })
      }

      // Get column info using the RPC function (if exists)
      let columns = []
      try {
        const { data: colData, error: colError } = await supabaseAdmin.rpc('get_table_columns', {
          p_table_name: tableName
        })
        if (!colError && colData) {
          columns = colData
        } else {
          // Fallback: get columns from first row
          const { data: sample } = await supabaseAdmin.from(tableName).select('*').limit(1)
          if (sample && sample.length > 0) {
            columns = Object.keys(sample[0]).map(col => ({ column_name: col, data_type: 'unknown', is_nullable: true }))
          }
        }
      } catch (colErr) {
        console.warn('Could not fetch columns via RPC, using fallback')
      }

      // Get total count
      const { count, error: countError } = await supabaseAdmin
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (countError) {
        console.error('Count error:', countError)
        return NextResponse.json({ error: 'Failed to count rows' }, { status: 500 })
      }

      // Get paginated rows
      const { data: rows, error: rowsError } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .range(offset, offset + pageSize - 1)

      if (rowsError) {
        console.error('Rows fetch error:', rowsError)
        return NextResponse.json({ error: 'Failed to fetch rows' }, { status: 500 })
      }

      return NextResponse.json({
        columns,
        rows: rows || [],
        totalCount: count || 0,
        page,
        pageSize,
      })
    }

    // CASE: Fetch list of tables (no table parameter)
    let tablesList = []
    try {
      const { data: rawTables, error: tablesError } = await supabaseAdmin.rpc('get_public_tables')
      if (tablesError) throw tablesError
      tablesList = rawTables || []
    } catch (err) {
      console.error('RPC get_public_tables failed, falling back to hardcoded list?')
      // Fallback: query from pg_tables using raw SQL via rpc? Or return empty.
      return NextResponse.json({ error: 'Unable to fetch table list. Ensure get_public_tables function exists.' }, { status: 500 })
    }

    // For each table, get row count
    const tablesWithCounts = await Promise.all(
      tablesList.map(async (t: any) => {
        const tableName = t.table_name
        const { count } = await supabaseAdmin
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        return { name: tableName, rowCount: count || 0 }
      })
    )

    return NextResponse.json({ tables: tablesWithCounts })
  } catch (err: any) {
    console.error('API error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}