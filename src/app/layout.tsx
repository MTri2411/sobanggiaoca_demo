import type { Metadata } from "next";
import { Be_Vietnam_Pro, Plus_Jakarta_Sans } from "next/font/google";
import "./tokens.css";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-be-vietnam",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sổ Bàn Giao Ca Điện Tử - Dưỡng Lão Bình Mỹ",
  description: "Hệ thống quản lý bàn giao ca trực điện tử tích hợp AI cho Dưỡng Lão Bình Mỹ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${plusJakartaSans.variable} ${beVietnamPro.variable}`} suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
