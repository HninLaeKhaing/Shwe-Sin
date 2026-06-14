import type { Metadata } from 'next';
import { Noto_Sans, Noto_Sans_Myanmar } from 'next/font/google';
import './globals.css';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const notoSansMyanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  variable: '--font-myanmar',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'Shwe Sin Shopkeeper',
  description: 'Mobile-first bilingual inventory and price lookup for small shops.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${notoSans.variable} ${notoSansMyanmar.variable}`}>
        {children}
      </body>
    </html>
  );
}
