import type { Metadata } from 'next';
import { THEME_BOOTSTRAP_SCRIPT } from '@/src/state/theme';
import './globals.css';

const siteOrigin = process.env.SITE_URL ?? 'http://localhost:3000';
const siteBaseUrl = siteOrigin.endsWith('/') ? siteOrigin : `${siteOrigin}/`;
const favicon = new URL('favicon.svg', siteBaseUrl).toString();
const socialImage = new URL('og.png', siteBaseUrl).toString();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  icons: { icon: favicon },
  title: 'Area Title Maker — ゲーム演出タイトルをすばやく作成',
  description:
    'ゲームやTRPG動画向けのエリア名・章タイトルを、ブラウザだけで作成してPNG保存できるローカルツール。',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    title: 'Area Title Maker',
    description: 'ゲーム演出タイトルを、すばやく。ブラウザ完結でPNG保存。',
    images: [
      { url: socialImage, width: 1200, height: 630, alt: 'Area Title Maker' },
    ],
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
    <html lang="ja" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
