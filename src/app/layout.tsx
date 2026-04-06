import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'MenuVoice - Scan a Menu',
  description: 'Voice-first menu navigation for blind and visually impaired users',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-foreground focus:rounded-lg"
        >
          Skip to content
        </a>
        <Header />
        <main id="main-content" role="main" className="px-5 py-8 max-w-lg mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
