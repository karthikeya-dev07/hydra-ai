import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HYDRA AI — Behavior-Aware Adaptive Traffic Intelligence',
  description:
    'AI-powered adaptive traffic intelligence platform for Indian urban mobility. Real-time computer vision, predictive congestion analytics, and emergency corridor management for Hyderabad.',
  keywords: ['traffic AI', 'smart city', 'Hyderabad traffic', 'adaptive signal', 'computer vision'],
  openGraph: {
    title: 'HYDRA AI — Smart Traffic Intelligence',
    description: 'Behavior-Aware Adaptive Traffic Intelligence for Indian Urban Mobility',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="hydra-bg antialiased">
        <div className="scan-line" />
        {children}
      </body>
    </html>
  );
}
