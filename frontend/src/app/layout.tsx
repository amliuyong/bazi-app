import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AntdRegistry from '@/providers/AntdRegistry';
import RootLayout from '@/components/RootLayout';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI 命理",
  description: "AI 命理分析系统",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
    other: [
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        url: '/icons/icon-192.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        url: '/icons/icon-512.png',
      },
    ],
  },
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        <AntdRegistry>
          <RootLayout>{children}</RootLayout>
        </AntdRegistry>
      </body>
    </html>
  );
}
