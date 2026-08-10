export function formatDate(iso: string): string {
  // 서버가 UTC로 뜨면 timeZone 없이는 한국 사용자 기준 날짜가 최대 9시간 밀린다.
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
