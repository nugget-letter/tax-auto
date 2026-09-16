import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CustomerInput, CustomerRecord, CustomerStatus } from "./types";

type CustomerRow = {
  id: string;
  submitted_at: string;
  name: string;
  office: string;
  phone: string;
  email: string;
  consented: boolean;
  source: string;
  source_page_id: string | null;
  status: string;
  trial_started_on: string | null;
  kakao_admin_set_on: string | null;
  reminded_1_on: string | null;
  reminded_2_on: string | null;
  memo: string;
  created_at: string;
  updated_at: string;
};

function rowToRecord(row: CustomerRow): CustomerRecord {
  return {
    id: row.id,
    submittedAt: row.submitted_at,
    name: row.name,
    office: row.office,
    phone: row.phone,
    email: row.email,
    consented: row.consented,
    source: row.source,
    sourcePageId: row.source_page_id,
    status: row.status as CustomerStatus,
    trialStartedOn: row.trial_started_on,
    kakaoAdminSetOn: row.kakao_admin_set_on,
    reminded1On: row.reminded_1_on,
    reminded2On: row.reminded_2_on,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function inputToRow(input: CustomerInput) {
  return {
    name: input.name,
    office: input.office,
    phone: input.phone,
    email: input.email,
    consented: input.consented,
    source: input.source,
    status: input.status,
    trial_started_on: input.trialStartedOn,
    kakao_admin_set_on: input.kakaoAdminSetOn,
    reminded_1_on: input.reminded1On,
    reminded_2_on: input.reminded2On,
    memo: input.memo,
  };
}

// PostgREST의 or() 필터는 쉼표·괄호로 구문을 나누므로 검색어에서 제거한다.
function sanitizeSearchTerm(q: string): string {
  return q.replace(/[,()%]/g, "").trim();
}

export async function listCustomers(options: { q?: string } = {}): Promise<CustomerRecord[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase.from("customers").select("*").order("submitted_at", { ascending: false });

  const term = options.q ? sanitizeSearchTerm(options.q) : "";
  if (term) {
    const pattern = `%${term}%`;
    query = query.or(
      `name.ilike.${pattern},office.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as CustomerRow[]).map(rowToRecord);
}

export async function getCustomerById(id: string): Promise<CustomerRecord | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("customers").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as CustomerRow) : null;
}

export async function createCustomer(
  input: CustomerInput & { submittedAt?: string; sourcePageId?: string | null }
): Promise<CustomerRecord> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      ...inputToRow(input),
      submitted_at: input.submittedAt ?? new Date().toISOString(),
      source_page_id: input.sourcePageId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToRecord(data as CustomerRow);
}

/**
 * 체험 시작일이 "없음 → 있음"으로 바뀌는 저장에서, 상태가 아직 new이면 trial로
 * 올린다. 이미 다른 상태(전환/이탈)면 관리자가 의도한 것이므로 건드리지 않는다.
 */
function resolveStatus(current: CustomerRow, input: CustomerInput): CustomerStatus {
  const trialJustStarted = current.trial_started_on === null && input.trialStartedOn !== null;
  if (trialJustStarted && input.status === "new") return "trial";
  return input.status;
}

export async function updateCustomer(
  id: string,
  input: CustomerInput
): Promise<CustomerRecord | null> {
  const supabase = getSupabaseServerClient();
  const { data: current, error: readError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) return null;

  const { data, error } = await supabase
    .from("customers")
    .update({
      ...inputToRow(input),
      status: resolveStatus(current as CustomerRow, input),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToRecord(data as CustomerRow);
}

export async function deleteCustomer(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}
