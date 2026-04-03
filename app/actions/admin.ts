"use server"

import { createClient } from "@/lib/supabase/server"

async function checkAdminAccess() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.user_metadata?.is_admin !== true) {
    throw new Error("Unauthorized")
  }
}

export async function getAllUsers() {
  await checkAdminAccess()
  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return users || []
}

export async function getKYCPending() {
  await checkAdminAccess()
  const supabase = await createClient()

  const { data: kyc, error } = await supabase
    .from("kyc_documents")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })

  if (error) throw error
  return kyc || []
}

export async function approveKYC(kyc_id: string) {
  await checkAdminAccess()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("kyc_documents")
    .update({ status: "approved", reviewed_at: new Date() })
    .eq("id", kyc_id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function rejectKYC(kyc_id: string, reason: string) {
  await checkAdminAccess()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("kyc_documents")
    .update({ status: "rejected", reviewed_at: new Date(), rejection_reason: reason })
    .eq("id", kyc_id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTransactions(limit = 100) {
  await checkAdminAccess()
  const supabase = await createClient()

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return transactions || []
}

export async function getFXRates() {
  await checkAdminAccess()
  const supabase = await createClient()

  const { data: rates, error } = await supabase
    .from("fx_rates")
    .select("*")

  if (error) throw error
  return rates || []
}

export async function updateFXRate(pair: string, rate: number) {
  await checkAdminAccess()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("fx_rates")
    .update({ rate, updated_at: new Date() })
    .eq("pair", pair)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAuditLogs(limit = 100) {
  await checkAdminAccess()
  const supabase = await createClient()

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return logs || []
}
