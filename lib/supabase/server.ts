import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다. .env.local을 확인하세요."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
