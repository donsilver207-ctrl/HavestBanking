import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function getUserAccounts(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data
}

export async function getUserWallets(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data
}

export async function getUserTransactions(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function uploadDocument(
  userId: string,
  bucket: string,
  file: File
) {
  const supabase = await createClient()
  const fileName = `${userId}/${Date.now()}_${file.name}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, { upsert: false })

  if (error) throw error
  return data
}

export function getPublicUrl(bucket: string, path: string) {
  const supabase = await createClient()
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}
