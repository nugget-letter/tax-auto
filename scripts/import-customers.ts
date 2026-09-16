/**
 * Google Sheet에서 내려받은 CSV를 customers 테이블로 1회 임포트한다.
 *
 * npx tsx --env-file=.env.local --tsconfig tsconfig.json scripts/import-customers.ts <csv> [--dry-run] [--force]
 *
 * --dry-run : insert 없이 행별 결과만 출력
 * --force   : customers에 이미 행이 있어도 진행 (기본은 중복 임포트를 막기 위해 중단)
 */
import { readFileSync } from "node:fs";
import { mapSheetRow, parseCsv, type ImportRow } from "@/lib/customers/import";
import { getSupabaseServerClient } from "@/lib/supabase/server";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");

  if (!file) {
    console.error("사용법: import-customers.ts <csv> [--dry-run] [--force]");
    process.exit(1);
  }

  const [header, ...body] = parseCsv(readFileSync(file, "utf8"));
  if (!header) {
    console.error("CSV가 비어 있어요.");
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  const currentYear = new Date().getFullYear();
  const rows: ImportRow[] = [];
  let skipped = 0;
  // 완전히 빈 행(시트 내보내기 시 흔히 섞여 들어옴)은 "이름/연락처 없어 건너뜀"과
  // 다른 원인이라 별도 카운트로 분리한다 — 안 그러면 읽은 행 수가 임포트 대상 +
  // 건너뜀 합계와 안 맞아 보여서 헷갈린다.
  let blank = 0;

  body.forEach((cells, i) => {
    if (cells.every((c) => c.trim() === "")) {
      blank++;
      return;
    }
    const { row, warnings } = mapSheetRow(header, cells, nowIso, currentYear);
    for (const w of warnings) console.warn(`[행 ${i + 2}] ${w}`);
    if (row) {
      rows.push(row);
    } else {
      skipped++;
    }
  });

  console.log(
    `\n읽은 행: ${body.length}, 임포트 대상: ${rows.length}, 건너뜀: ${skipped}, 공백 행: ${blank}`
  );

  const statusCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log("상태별 건수:", statusCounts);

  if (dryRun) {
    console.log("\n--dry-run: 처음 3행 미리보기");
    console.log(JSON.stringify(rows.slice(0, 3), null, 2));
    process.exit(0);
  }

  const supabase = getSupabaseServerClient();
  const { count, error: countError } = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true });
  if (countError) throw countError;
  if ((count ?? 0) > 0 && !force) {
    console.error(
      `\ncustomers에 이미 ${count}행이 있어요. 중복 임포트를 막기 위해 중단합니다. 정말 추가하려면 --force.`
    );
    process.exit(1);
  }

  const payload = rows.map((r) => ({
    submitted_at: r.submittedAt,
    name: r.name,
    office: r.office,
    phone: r.phone,
    email: r.email,
    consented: r.consented,
    source: r.source,
    source_page_id: null,
    status: r.status,
    trial_started_on: r.trialStartedOn,
    kakao_admin_set_on: r.kakaoAdminSetOn,
    reminded_1_on: r.reminded1On,
    reminded_2_on: r.reminded2On,
    memo: r.memo,
  }));

  const { error } = await supabase.from("customers").insert(payload);
  if (error) throw error;
  console.log(`\n${payload.length}행 임포트 완료`);
}

// package.json에 "type": "module"이 없어 top-level await를 쓸 수 없다.
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
