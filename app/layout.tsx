import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Write & Remember | 英単語学習',
  description: '見て、思い出して、書いて身につける英単語学習アプリ',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '英単語' },
  icons: { icon: '/favicon.svg', apple: '/app-icon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>;
}
