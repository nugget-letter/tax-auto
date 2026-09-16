import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { customerInputSchema } from "@/lib/customers/types";
import { updateCustomer, deleteCustomer } from "@/lib/customers/repository";
import { requireAdminSession } from "@/lib/auth/session";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = customerInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    const customer = await updateCustomer(id, parsed.data);
    if (!customer) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json(customer);
  } catch (error) {
    console.error("[customers] 수정 실패", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authorized = await requireAdminSession(request);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteCustomer(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[customers] 삭제 실패", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
}
