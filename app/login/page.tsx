import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main
      data-seed=""
      data-seed-color-mode="light-only"
      className="admin-canvas font-admin flex min-h-screen items-center justify-center px-4"
    >
      <form action="/api/login" method="POST" className="glass-panel w-full max-w-sm space-y-5 p-8">
        <h1 className="font-display text-xl font-extrabold text-[#111827]">관리자 로그인</h1>
        <input type="hidden" name="next" value={params.next ?? "/admin"} />
        <TextField
          label="비밀번호"
          invalid={Boolean(params.error)}
          errorMessage={params.error ? "비밀번호가 올바르지 않아요." : undefined}
        >
          <TextFieldInput type="password" name="password" autoFocus />
        </TextField>
        <ActionButton type="submit" variant="neutralSolid" className="btn-flame focus-flame w-full">
          로그인
        </ActionButton>
      </form>
    </main>
  );
}
