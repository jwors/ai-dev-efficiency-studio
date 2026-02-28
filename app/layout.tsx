import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import RouteShell from './components/RouteShell';
import Providers from './components/Providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 开发效率工作室",
  description: "基于 AI 的任务规划与执行工具 - 支持任务拆解、流程可视化与自动化执行",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="page">
            <RouteShell>{children}</RouteShell>
          </div>
        </Providers>
      </body>
    </html>
  );
}
