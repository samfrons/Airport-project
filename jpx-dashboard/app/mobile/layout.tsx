import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'KJPX Mobile Dashboard',
  description: 'Mobile flight data dashboard for East Hampton Town Airport',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-page">
      {children}
    </div>
  );
}
