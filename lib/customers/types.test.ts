import { describe, expect, it } from "vitest";
import { customerInputSchema, normalizePhone, submissionSchema } from "./types";

describe("normalizePhone", () => {
  it("숫자와 하이픈만 남긴다", () => {
    expect(normalizePhone(" 010 1234 5678 ")).toBe("01012345678");
    expect(normalizePhone("010-1234-5678")).toBe("010-1234-5678");
    expect(normalizePhone("+82 (10) 1234-5678")).toBe("82101234-5678");
  });
});

describe("submissionSchema", () => {
  const valid = {
    pageSlug: "abc123",
    name: " 김세무 ",
    office: "세무법인 A",
    phone: "010 1234 5678",
    email: "kim@a.com",
    consented: true,
  };

  it("정상 입력을 정규화해서 통과시킨다", () => {
    const result = submissionSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("김세무");
      expect(result.data.phone).toBe("01012345678");
    }
  });
  it("동의하지 않으면 거부", () => {
    expect(submissionSchema.safeParse({ ...valid, consented: false }).success).toBe(false);
  });
  it("이름·연락처 필수", () => {
    expect(submissionSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...valid, phone: "abc" }).success).toBe(false);
  });
  it("이메일은 비어도 되지만 형식이 틀리면 거부", () => {
    expect(submissionSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
    expect(submissionSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });
  it("사무실·이메일 생략 시 빈 문자열", () => {
    const result = submissionSchema.safeParse({ pageSlug: "x", name: "a", phone: "1", consented: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.office).toBe("");
      expect(result.data.email).toBe("");
    }
  });
});

describe("submissionSchema — 외부 유입", () => {
  const external = {
    name: "김세무",
    phone: "010-1234-5678",
    consented: true as const,
    source: "tax-sales",
  };

  it("pageSlug 없이도 통과한다", () => {
    const result = submissionSchema.safeParse(external);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pageSlug).toBeUndefined();
      expect(result.data.source).toBe("tax-sales");
    }
  });

  it("source는 생략할 수 있다", () => {
    const { source: _omitted, ...withoutSource } = external;
    const result = submissionSchema.safeParse(withoutSource);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.source).toBeUndefined();
  });

  it("지나치게 긴 source는 거부한다", () => {
    expect(submissionSchema.safeParse({ ...external, source: "x".repeat(101) }).success).toBe(false);
  });

  it("pageSlug가 빈 문자열이면 거부한다", () => {
    expect(submissionSchema.safeParse({ ...external, pageSlug: "" }).success).toBe(false);
  });
});

describe("customerInputSchema", () => {
  const valid = {
    name: "김세무",
    office: "",
    phone: "010-1234-5678",
    email: "",
    consented: true,
    source: "직접 추가",
    status: "new",
    trialStartedOn: null,
    kakaoAdminSetOn: null,
    reminded1On: null,
    reminded2On: null,
    memo: "",
  };

  it("정상 입력 통과", () => {
    expect(customerInputSchema.safeParse(valid).success).toBe(true);
  });
  it("날짜는 YYYY-MM-DD 또는 null", () => {
    expect(customerInputSchema.safeParse({ ...valid, trialStartedOn: "2026-09-01" }).success).toBe(true);
    expect(customerInputSchema.safeParse({ ...valid, trialStartedOn: "2026.09.01" }).success).toBe(false);
    expect(customerInputSchema.safeParse({ ...valid, trialStartedOn: "" }).success).toBe(false);
  });
  it("알 수 없는 상태 거부", () => {
    expect(customerInputSchema.safeParse({ ...valid, status: "vip" }).success).toBe(false);
  });
});
