import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamerGraph - 主播圈层关系图",
  description: "直播主播圈层关系可视化工具",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f0f1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#0f0f1a] text-[#e0e0e0] antialiased">{children}</body>
    </html>
  );
}
