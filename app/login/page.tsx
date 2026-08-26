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
      className="flex min-h-screen items-center justify-center bg-gray-50 px-4"
    >
      <form
        action="/api/login"
        method="POST"
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-gray-900">관리자 로그인</h1>
        <input type="hidden" name="next" value={params.next ?? "/admin"} />
        <TextField
          label="비밀번호"
          invalid={Boolean(params.error)}
          errorMessage={params.error ? "비밀번호가 올바르지 않아요." : undefined}
        >
          <TextFieldInput type="password" name="password" placeholder="비밀번호" autoFocus />
        </TextField>
        <ActionButton type="submit" variant="neutralSolid">
          로그인
        </ActionButton>
      </form>
    </main>
  );
}
