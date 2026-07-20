import type { Metadata } from "next";
import { Jua, Gowun_Dodum } from "next/font/google";
import "./globals.css";

const jua = Jua({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const gowunDodum = Gowun_Dodum({ weight: "400", subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "아침모임",
  description: "유치원 아침모임 웹앱",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${jua.variable} ${gowunDodum.variable}`}>{children}</body>
    </html>
  );
}
