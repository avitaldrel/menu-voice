import type { Metadata } from 'next';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'MenuVoice',
  description: 'Voice-first menu navigation for blind and visually impaired users',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-black focus:text-white focus:rounded"
        >
          Skip to content
        </a>
        <Header />
        <main id="main-content" role="main" className="px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
