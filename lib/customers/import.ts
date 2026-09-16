import { normalizePhone, type CustomerInput } from "./types";

// RFC 4180: 따옴표로 감싼 필드 안의 쉼표·줄바꿈·""를 처리한다.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

type Ymd = { y: number; m: number; d: number; rest: string };

// "2026. 9. 1", "2026-09-01", "2026/9/1", "9/1", "9월 1일" 등에서 연월일을 뽑는다.
// 뒤에 남는 문자열(시각)은 rest로 돌려준다.
function extractYmd(raw: string, currentYear: number): Ymd | null {
  const s = raw.trim();
  if (!s) return null;

  let match = s.match(/^(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\.?\s*(.*)$/);
  if (match) {
    const [, y, m, d, rest] = match;
    return { y: Number(y), m: Number(m), d: Number(d), rest };
  }
  match = s.match(/^(\d{1,2})\s*[/.]\s*(\d{1,2})\.?\s*(.*)$/);
  if (match) {
    const [, m, d, rest] = match;
    return { y: currentYear, m: Number(m), d: Number(d), rest };
  }
  match = s.match(/^(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일\s*(.*)$/);
  if (match) {
    const [, y, m, d, rest] = match;
    return { y: y ? Number(y) : currentYear, m: Number(m), d: Number(d), rest };
  }
  return null;
}

export function parseSheetDate(raw: string, currentYear = new Date().getFullYear()): string | null {
  const ymd = extractYmd(raw, currentYear);
  if (!ymd || !isValidYmd(ymd.y, ymd.m, ymd.d)) return null;
  return `${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}`;
}

// 시트의 타임스탬프는 한국 시간이다. "오후 3:24:10" 같은 꼬리를 24시간제로 바꿔
// +09:00 오프셋으로 해석한다. 시각이 없으면 그날 KST 자정.
export function parseSheetDateTime(raw: string, currentYear = new Date().getFullYear()): string | null {
  const ymd = extractYmd(raw, currentYear);
  if (!ymd || !isValidYmd(ymd.y, ymd.m, ymd.d)) return null;

  let hh = 0;
  let mm = 0;
  let ss = 0;
  const time = ymd.rest.match(/(오전|오후|AM|PM)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(오전|오후|AM|PM)?/i);
  if (time) {
    const meridiem = (time[1] ?? time[5] ?? "").toUpperCase();
    hh = Number(time[2]);
    mm = Number(time[3]);
    ss = Number(time[4] ?? 0);
    if (meridiem === "오후" || meridiem === "PM") {
      if (hh < 12) hh += 12;
    } else if (meridiem === "오전" || meridiem === "AM") {
      if (hh === 12) hh = 0;
    }
  }

  const iso = `${ymd.y}-${pad(ymd.m)}-${pad(ymd.d)}T${pad(hh)}:${pad(mm)}:${pad(ss)}+09:00`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const CONSENT_YES = new Set(["예", "네", "동의", "동의합니다", "동의함", "true", "y", "yes", "o", "✓", "✔"]);

export function parseConsent(raw: string): boolean {
  return CONSENT_YES.has(raw.trim().toLowerCase());
}

const COLUMN_KEYS = {
  접수시각: "submittedAt",
  이름: "name",
  사무실: "office",
  연락처: "phone",
  이메일: "email",
  동의: "consented",
  유입경로: "source",
  "한 달 무료 체험 시작일": "trialStartedOn",
  "카카오 관리자 설정": "kakaoAdminSetOn",
  "리마인드 1차": "reminded1On",
  "리마인드 2차": "reminded2On",
} as const;

type ColumnKey = (typeof COLUMN_KEYS)[keyof typeof COLUMN_KEYS];
type DateColumnKey = Extract<
  ColumnKey,
  "trialStartedOn" | "kakaoAdminSetOn" | "reminded1On" | "reminded2On"
>;

export type ImportRow = CustomerInput & { submittedAt: string; sourcePageId: null };
export type ImportResult = { row: ImportRow | null; warnings: string[] };

export function mapSheetRow(
  header: string[],
  cells: string[],
  nowIso: string,
  currentYear: number
): ImportResult {
  const byKey: Partial<Record<ColumnKey, string>> = {};
  const labelByKey: Partial<Record<ColumnKey, string>> = {};
  const columnIndexByKey: Partial<Record<ColumnKey, number>> = {};
  header.forEach((rawLabel, i) => {
    const label = rawLabel.trim() as keyof typeof COLUMN_KEYS;
    const key = COLUMN_KEYS[label];
    if (key) {
      byKey[key] = (cells[i] ?? "").trim();
      labelByKey[key] = label;
      columnIndexByKey[key] = i;
    }
  });

  const warnings: string[] = [];
  const name = byKey.name ?? "";
  const phone = normalizePhone(byKey.phone ?? "");
  if (!name || !phone) {
    return { row: null, warnings: [`이름(${name || "없음"}) 또는 연락처(${phone || "없음"})가 비어 건너뜀`] };
  }

  // 실제 시트의 체험/카카오/리마인드 칼럼은 "이탈", "o", "x", "답변 왔음"처럼
  // 날짜가 아닌 자유 텍스트를 담고 있는 경우가 흔하다. 이런 값은 필드는 비우고
  // 원본을 메모 후보로 돌려준다(경고는 내지 않는다 — 예상된 입력이라서). 다만
  // "2026-13-45"처럼 날짜 형식처럼 보이는데 값이 잘못된 경우는 시트 작성 실수일
  // 가능성이 커서 경고는 그대로 남긴다.
  function dateField(key: DateColumnKey): { value: string | null; memoLine: string | null } {
    const raw = byKey[key] ?? "";
    if (!raw) return { value: null, memoLine: null };
    const parsed = parseSheetDate(raw, currentYear);
    if (parsed) return { value: parsed, memoLine: null };
    if (extractYmd(raw, currentYear)) {
      warnings.push(`${name}: "${labelByKey[key]}" 값 "${raw}"을(를) 날짜로 읽지 못해 비움`);
    }
    return { value: null, memoLine: `${labelByKey[key]}: ${raw}` };
  }

  let submittedAt = parseSheetDateTime(byKey.submittedAt ?? "", currentYear);
  if (!submittedAt) {
    warnings.push(`${name}: "접수시각" 값 "${byKey.submittedAt ?? ""}"을(를) 읽지 못해 현재 시각으로 대체`);
    submittedAt = nowIso;
  }

  const trialRaw = byKey.trialStartedOn ?? "";
  const trial = dateField("trialStartedOn");
  const kakao = dateField("kakaoAdminSetOn");
  const reminded1 = dateField("reminded1On");
  const reminded2 = dateField("reminded2On");

  // 메모 줄 순서는 호출 순서가 아니라 헤더에서 실제 칼럼이 놓인 위치로 정한다.
  // 시트가 재수출되며 칼럼 순서가 바뀌어도 메모가 여전히 칼럼 순서를 따르게 하기 위해서다.
  const dateFields: { key: DateColumnKey; result: { value: string | null; memoLine: string | null } }[] = [
    { key: "trialStartedOn", result: trial },
    { key: "kakaoAdminSetOn", result: kakao },
    { key: "reminded1On", result: reminded1 },
    { key: "reminded2On", result: reminded2 },
  ];
  const memoLines = dateFields
    .slice()
    .sort((a, b) => (columnIndexByKey[a.key] ?? 0) - (columnIndexByKey[b.key] ?? 0))
    .map((f) => f.result.memoLine)
    .filter((line): line is string => line !== null);

  // 헤더보다 뒤에 붙은 이름 없는 칼럼(시트에 수동으로 덧붙인 내용)은 그대로 메모 줄로 추가한다.
  // 다른 메모 값들과 마찬가지로 앞뒤 공백은 정리한다.
  for (let i = header.length; i < cells.length; i++) {
    const extra = (cells[i] ?? "").trim();
    if (extra !== "") memoLines.push(extra);
  }

  // 상태 우선순위: 이탈 표시 > 체험 시작일 있음 > 신규.
  const status = trialRaw === "이탈" ? "churned" : trial.value ? "trial" : "new";

  return {
    row: {
      submittedAt,
      name,
      office: byKey.office ?? "",
      phone,
      email: byKey.email ?? "",
      consented: parseConsent(byKey.consented ?? ""),
      source: byKey.source || "Google Form",
      sourcePageId: null,
      status,
      trialStartedOn: trial.value,
      kakaoAdminSetOn: kakao.value,
      reminded1On: reminded1.value,
      reminded2On: reminded2.value,
      memo: memoLines.join("\n"),
    },
    warnings,
  };
}
