export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        action="/api/login"
        method="POST"
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-gray-900">관리자 로그인</h1>
        <input type="hidden" name="next" value={params.next ?? "/admin"} />
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          autoFocus
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        {params.error && <p className="text-sm text-red-600">비밀번호가 올바르지 않아요.</p>}
        <button
          type="submit"
          className="w-full rounded bg-gray-900 py-2 text-sm font-medium text-white"
        >
          로그인
        </button>
      </form>
    </main>
  );
}
