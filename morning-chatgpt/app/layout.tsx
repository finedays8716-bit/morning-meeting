import type { Metadata } from "next";
import "@fontsource/gowun-dodum/400.css";
import "@fontsource/dongle/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리 반 아침모임",
  description: "유아들과 함께 시작하는 즐거운 아침모임",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
