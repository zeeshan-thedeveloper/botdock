import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BotDock Dashboard',
  description: 'Configure, publish, and observe embeddable AI chatbots.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
