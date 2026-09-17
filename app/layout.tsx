import type { Metadata } from "next";
import {
  Noto_Sans_KR,
  Noto_Serif_KR,
  Nanum_Gothic,
  Nanum_Myeongjo,
  Gothic_A1,
  IBM_Plex_Sans_KR,
  IBM_Plex_Mono,
} from "next/font/google";
import "./globals.css";
import "@seed-design/css/all.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-kr",
});

const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-noto-serif-kr",
});

// 본문 텍스트 블록의 리치 에디터 폰트 선택지 (components/editor/RichTextEditor.tsx).
// var(--font-...)로 참조하므로 공개 페이지(app/c/[slug])에도 같은 변수가 있어야
// 저장된 글꼴이 그대로 렌더링된다 — 그래서 다른 폰트처럼 body에 항상 로드한다.
const nanumGothic = Nanum_Gothic({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-nanum-gothic",
});

const nanumMyeongjo = Nanum_Myeongjo({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-nanum-myeongjo",
});

const gothicA1 = Gothic_A1({
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: "--font-gothic-a1",
});

// 어드민 전용 글꼴. 세일즈 랜딩(tax-brending-message)과 같은 체계를 쓴다.
// body가 아니라 어드민 껍데기에만 거는 이유는 globals.css의 --font-sans를
// 공개 랜딩페이지가 함께 쓰기 때문이다.
const plexKr = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-kr",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "너겟 랜딩페이지 생성기",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} ${notoSerifKr.variable} ${nanumGothic.variable} ${nanumMyeongjo.variable} ${gothicA1.variable} ${plexKr.variable} ${plexMono.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
