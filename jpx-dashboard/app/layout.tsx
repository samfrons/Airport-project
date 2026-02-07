import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JPX Dashboard — East Hampton Airport',
  description: 'Airport operations monitoring for KJPX',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
