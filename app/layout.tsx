import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "吃什么？",
  description: "不知道吃什么？从自己的菜单里随机选一道。菜单只保存在当前浏览器。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F8FC",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
