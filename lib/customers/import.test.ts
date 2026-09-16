import { describe, expect, it } from "vitest";
import { mapSheetRow, parseConsent, parseCsv, parseSheetDate, parseSheetDateTime } from "./import";

describe("parseCsv", () => {
  it("따옴표 안의 쉼표와 줄바꿈을 보존한다", () => {
    const text = 'a,b,c\n"x, y","line1\nline2",""\n';
    expect(parseCsv(text)).toEqual([
      ["a", "b", "c"],
      ["x, y", "line1\nline2", ""],
    ]);
  });
  it("이중 따옴표 이스케이프", () => {
    expect(parseCsv('"say ""hi"""')).toEqual([['say "hi"']]);
  });
  it("CRLF 처리", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
  // 시트를 내보낼 때 중간에 빈 줄이 섞이는 경우가 있다. 빈 줄은 셀이 하나뿐인
  // 행(공백 문자열 한 칸)으로 파싱되며, 그 자체로 유효한 데이터 행이 되지 않는다
  // (mapSheetRow에 넘기면 이름/연락처가 비어 있어 건너뛰게 된다).
  it("빈 줄은 빈 문자열 한 칸짜리 행이 된다", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      [""],
      ["1", "2"],
    ]);
  });
});

describe("parseSheetDate", () => {
  it("여러 시트 형식", () => {
    expect(parseSheetDate("2026. 9. 1")).toBe("2026-09-01");
    expect(parseSheetDate("2026.09.01")).toBe("2026-09-01");
    expect(parseSheetDate("2026-09-01")).toBe("2026-09-01");
    expect(parseSheetDate("2026/9/1")).toBe("2026-09-01");
    expect(parseSheetDate("2026. 9. 1 오후 3:24:10")).toBe("2026-09-01");
  });
  it("연도 없으면 올해", () => {
    const year = new Date().getFullYear();
    expect(parseSheetDate("9/1")).toBe(`${year}-09-01`);
    expect(parseSheetDate("9월 1일")).toBe(`${year}-09-01`);
  });
  it("못 읽으면 null", () => {
    expect(parseSheetDate("")).toBeNull();
    expect(parseSheetDate("완료")).toBeNull();
    expect(parseSheetDate("2026-13-01")).toBeNull();
  });
});

describe("parseSheetDateTime", () => {
  it("한국어 오전/오후 시각을 KST로 해석", () => {
    expect(parseSheetDateTime("2026. 9. 1 오후 3:24:10")).toBe("2026-09-01T06:24:10.000Z");
    expect(parseSheetDateTime("2026. 9. 1 오전 12:05:00")).toBe("2026-08-31T15:05:00.000Z");
    expect(parseSheetDateTime("2026. 9. 1 오후 12:00:00")).toBe("2026-09-01T03:00:00.000Z");
  });
  it("시각 없으면 KST 자정", () => {
    expect(parseSheetDateTime("2026-09-01")).toBe("2026-08-31T15:00:00.000Z");
  });
  it("못 읽으면 null", () => {
    expect(parseSheetDateTime("")).toBeNull();
  });
});

describe("parseConsent", () => {
  it("긍정 표현은 true", () => {
    for (const v of ["예", "네", "동의", "동의합니다", "TRUE", "true", "Y", "O", "✓", " 예 "]) {
      expect(parseConsent(v)).toBe(true);
    }
  });
  it("그 외 false", () => {
    for (const v of ["", "아니오", "FALSE", "X"]) expect(parseConsent(v)).toBe(false);
  });
});

describe("mapSheetRow", () => {
  const header = [
    "접수시각",
    "이름",
    "사무실",
    "연락처",
    "이메일",
    "동의",
    "유입경로",
    "한 달 무료 체험 시작일",
    "카카오 관리자 설정",
    "리마인드 1차",
    "리마인드 2차",
  ];
  const now = "2026-09-16T00:00:00.000Z";

  it("정상 행을 매핑하고 체험 시작일이 있으면 trial", () => {
    const cells = [
      "2026. 9. 1 오후 3:24:10",
      "김세무",
      "세무법인 A",
      "010 1234 5678",
      "kim@a.com",
      "예",
      "인스타",
      "2026. 9. 2",
      "2026. 9. 3",
      "",
      "",
    ];
    const { row, warnings } = mapSheetRow(header, cells, now, 2026);
    expect(warnings).toEqual([]);
    expect(row).toMatchObject({
      submittedAt: "2026-09-01T06:24:10.000Z",
      name: "김세무",
      office: "세무법인 A",
      phone: "01012345678",
      email: "kim@a.com",
      consented: true,
      source: "인스타",
      status: "trial",
      trialStartedOn: "2026-09-02",
      kakaoAdminSetOn: "2026-09-03",
      reminded1On: null,
      reminded2On: null,
      memo: "",
      sourcePageId: null,
    });
  });

  it("유입경로 비면 Google Form, 시작일 없으면 new", () => {
    const cells = ["2026. 9. 1", "박회계", "", "010-1", "", "", "", "", "", "", ""];
    const { row } = mapSheetRow(header, cells, now, 2026);
    expect(row?.source).toBe("Google Form");
    expect(row?.status).toBe("new");
  });

  // 실제 시트에서는 체험/카카오/리마인드 칼럼에 "완료", "o", "x" 같은 자유 텍스트가
  // 자주 들어있다. 날짜로 못 읽는 건 예상된 입력이므로 경고 없이 메모에만 남긴다.
  it("날짜가 아닌 값은 필드를 비우고 메모에 보존하며 경고는 내지 않는다", () => {
    const cells = ["2026. 9. 1", "박회계", "", "010-1", "", "", "", "완료", "", "", ""];
    const { row, warnings } = mapSheetRow(header, cells, now, 2026);
    expect(row?.trialStartedOn).toBeNull();
    expect(warnings).toEqual([]);
    expect(row?.memo).toBe("한 달 무료 체험 시작일: 완료");
  });

  it("날짜 형식처럼 보이는데 값이 잘못되면 경고를 남긴다", () => {
    const cells = ["2026. 9. 1", "박회계", "", "010-1", "", "", "", "2026-13-45", "", "", ""];
    const { row, warnings } = mapSheetRow(header, cells, now, 2026);
    expect(row?.trialStartedOn).toBeNull();
    expect(warnings.some((w) => w.includes("한 달 무료 체험 시작일"))).toBe(true);
  });

  it("접수시각 못 읽으면 now로 대체하고 경고", () => {
    const cells = ["", "박회계", "", "010-1", "", "", "", "", "", "", ""];
    const { row, warnings } = mapSheetRow(header, cells, now, 2026);
    expect(row?.submittedAt).toBe(now);
    expect(warnings.some((w) => w.includes("접수시각"))).toBe(true);
  });

  it("이름 또는 연락처가 비면 row null", () => {
    expect(mapSheetRow(header, ["", "", "", "010-1", "", "", "", "", "", "", ""], now, 2026).row).toBeNull();
    expect(mapSheetRow(header, ["", "박", "", "", "", "", "", "", "", "", ""], now, 2026).row).toBeNull();
  });

  // parseCsv는 빈 줄을 [""] (셀 하나짜리 행)로 돌려준다. 그 모양 그대로 넘어와도
  // 이름/연락처가 비어 있으니 정상 스킵 경로(row null)를 타지, 엉뚱한 고객 행으로
  // 만들어지지 않아야 한다.
  it("완전히 빈 행([\"\"])은 임포트 대상이 되지 않는다", () => {
    const { row, warnings } = mapSheetRow(header, [""], now, 2026);
    expect(row).toBeNull();
    expect(warnings).toEqual(["이름(없음) 또는 연락처(없음)가 비어 건너뜀"]);
  });

  // 시트 마지막 칼럼들이 비어 있으면 내보내기 결과 CSV 행 자체가 헤더보다 짧게
  // 끊기기도 한다. cells[i] ?? ""로 방어했는지 잠근다.
  it("데이터 행이 헤더보다 짧아도 뒤쪽 칼럼은 빈 값으로 처리된다", () => {
    const cells = ["2026. 9. 1", "박회계", "", "010-1"];
    const { row, warnings } = mapSheetRow(header, cells, now, 2026);
    expect(warnings).toEqual([]);
    expect(row).toMatchObject({
      name: "박회계",
      email: "",
      consented: false,
      source: "Google Form",
      status: "new",
      trialStartedOn: null,
      kakaoAdminSetOn: null,
      reminded1On: null,
      reminded2On: null,
      memo: "",
    });
  });

  it("헤더 앞뒤 공백 무시", () => {
    const spaced = header.map((h) => ` ${h} `);
    const { row } = mapSheetRow(spaced, ["", "박", "", "010-1", "", "", "", "", "", "", ""], now, 2026);
    expect(row?.name).toBe("박");
  });

  // 카카오 관리자 설정 칼럼의 실제 값: o / x / 답변 왔음 등.
  it.each(["o", "x", "답변 왔음"])("카카오 칼럼의 자유 텍스트 '%s'는 메모로 보존된다", (value) => {
    const cells = ["2026. 9. 1", "박회계", "", "010-1", "", "", "", "", value, "", ""];
    const { row, warnings } = mapSheetRow(header, cells, now, 2026);
    expect(row?.kakaoAdminSetOn).toBeNull();
    expect(warnings).toEqual([]);
    expect(row?.memo).toBe(`카카오 관리자 설정: ${value}`);
  });

  it("체험 시작일이 정확히 '이탈'이면 churned 상태와 메모를 남긴다", () => {
    const cells = ["2026. 9. 1", "박회계", "", "010-1", "", "", "", "이탈", "", "", ""];
    const { row, warnings } = mapSheetRow(header, cells, now, 2026);
    expect(row?.status).toBe("churned");
    expect(row?.trialStartedOn).toBeNull();
    expect(row?.memo).toBe("한 달 무료 체험 시작일: 이탈");
    expect(warnings).toEqual([]);
  });

  it("헤더보다 뒤에 있는 이름 없는 칼럼은 메모에 그대로 추가된다(앞뒤 공백은 정리)", () => {
    const cells = [
      "2026. 9. 1",
      "박회계",
      "",
      "010-1",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "  추가 메모입니다  ",
    ];
    const { row } = mapSheetRow(header, cells, now, 2026);
    expect(row?.memo).toBe("추가 메모입니다");
  });

  it("여러 칼럼에 자유 텍스트가 있으면 칼럼 순서대로 여러 줄 메모가 쌓인다", () => {
    const cells = [
      "2026. 9. 1",
      "박회계",
      "",
      "010-1",
      "",
      "",
      "",
      "이탈",
      "답변 왔음",
      "",
      "문의함",
    ];
    const { row } = mapSheetRow(header, cells, now, 2026);
    expect(row?.status).toBe("churned");
    expect(row?.memo).toBe("한 달 무료 체험 시작일: 이탈\n카카오 관리자 설정: 답변 왔음\n리마인드 2차: 문의함");
  });

  // 메모 줄 순서가 dateField() 호출 순서(체험→카카오→리마인드1→리마인드2)가 아니라
  // 실제 헤더 상의 칼럼 위치를 따르는지 확인한다. 시트가 재수출되며 칼럼 순서가
  // 바뀌어도(여기서는 카카오 칼럼을 체험 칼럼보다 앞으로 옮김) 메모는 새 헤더 순서를
  // 그대로 반영해야 한다.
  it("헤더 칼럼 순서가 바뀌면 메모 줄도 바뀐 순서를 따른다", () => {
    const reordered = [
      "접수시각",
      "이름",
      "사무실",
      "연락처",
      "이메일",
      "동의",
      "유입경로",
      "카카오 관리자 설정", // 원래 순서보다 앞으로 옮김
      "한 달 무료 체험 시작일",
      "리마인드 1차",
      "리마인드 2차",
    ];
    const cells = [
      "2026. 9. 1",
      "박회계",
      "",
      "010-1",
      "",
      "",
      "",
      "답변 왔음", // 카카오 관리자 설정 (인덱스 7)
      "이탈", // 한 달 무료 체험 시작일 (인덱스 8)
      "",
      "문의함", // 리마인드 2차 (인덱스 10)
    ];
    const { row } = mapSheetRow(reordered, cells, now, 2026);
    expect(row?.status).toBe("churned");
    // 호출 순서대로였다면 "체험→카카오→리마인드2"였겠지만, 헤더 순서를 따르므로
    // "카카오→체험→리마인드2"가 된다.
    expect(row?.memo).toBe("카카오 관리자 설정: 답변 왔음\n한 달 무료 체험 시작일: 이탈\n리마인드 2차: 문의함");
  });
});
