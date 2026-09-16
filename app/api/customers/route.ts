import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { customerInputSchema } from "@/lib/customers/types";
import { createCustomer } from "@/lib/customers/repository";
import { requireAdminSession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = customerInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const customer = await createCustomer(parsed.data);
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("[customers] 생성 실패", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
