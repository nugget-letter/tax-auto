import type { Metadata } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "너겟 랜딩페이지 생성기",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${notoSansKr.variable} ${notoSerifKr.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
