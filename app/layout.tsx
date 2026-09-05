import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Frostmarch · 霜境远征',
  description: '指挥你的北境军团。原创 3D 冰雪奇幻即时战略游戏。',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/icon-192.png' },
  appleWebApp: {
    capable: true,
    title: '霜境远征',
    statusBarStyle: 'black-translucent',
  },
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#101d27',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
