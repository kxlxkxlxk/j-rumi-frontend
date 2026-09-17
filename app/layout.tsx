import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "제루미 | 나에게 맞는 파운데이션 찾기",
  description: "사진 한 장으로 내 피부톤에 맞는 파운데이션을 추천받아보세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="text-jerumi-900 antialiased">{children}</body>
    </html>
  );
}
