import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ApexERP — Coaching & Academy Operating System',
  description:
    'All-in-one ERP solution for coaching centers: Students, Batches, Fees, Instant WhatsApp Alerts, Online Payments, Academics & Multi-Role Portals.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          rel="icon"
          href='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎓</text></svg>'
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
