import type { Metadata } from 'next';
import './globals.css';

const siteOrigin = process.env.SITE_URL ?? 'http://localhost:3000';
const socialImage = new URL('/og.png', siteOrigin).toString();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: 'Area Title Maker — ゲーム演出タイトルをすばやく作成',
  description:
    'ゲームやTRPG動画向けのエリア名・章タイトルを、ブラウザだけで作成してPNG保存できるローカルツール。',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    title: 'Area Title Maker',
    description: 'ゲーム演出タイトルを、すばやく。ブラウザ完結でPNG保存。',
    images: [{ url: socialImage, width: 1200, height: 630, alt: 'Area Title Maker' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Area Title Maker',
    description: 'ゲーム演出タイトルを、すばやく。ブラウザ完結でPNG保存。',
    images: [socialImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark">
      <body>{children}</body>
    </html>
  );
}
