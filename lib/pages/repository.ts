import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Block, PageInput, PageRecord, PageStatus } from "./types";

type PageRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  blocks: Block[];
  cta_label: string;
  cta_href: string;
  cta_color: string;
  created_at: string;
  updated_at: string;
};

function rowToRecord(row: PageRow): PageRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status as PageStatus,
    blocks: row.blocks,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    ctaColor: row.cta_color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listPages(): Promise<PageRecord[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as PageRow[]).map(rowToRecord);
}

export async function getPageBySlug(slug: string): Promise<PageRecord | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as PageRow) : null;
}

export async function getPageById(id: string): Promise<PageRecord | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("pages").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToRecord(data as PageRow) : null;
}

export async function createPage(input: PageInput): Promise<PageRecord> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .insert({
      slug: input.slug,
      title: input.title,
      status: input.status,
      blocks: input.blocks,
      cta_label: input.ctaLabel,
      cta_href: input.ctaHref,
      cta_color: input.ctaColor,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToRecord(data as PageRow);
}

export async function updatePage(id: string, input: PageInput): Promise<PageRecord> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .update({
      slug: input.slug,
      title: input.title,
      status: input.status,
      blocks: input.blocks,
      cta_label: input.ctaLabel,
      cta_href: input.ctaHref,
      cta_color: input.ctaColor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToRecord(data as PageRow);
}

export async function updatePageStatus(id: string, status: PageStatus): Promise<PageRecord> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("pages")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return rowToRecord(data as PageRow);
}
