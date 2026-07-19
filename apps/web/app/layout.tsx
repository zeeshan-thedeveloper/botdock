import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BotDock Dashboard',
  description: 'Configure, publish, and observe embeddable AI chatbots.',
};

const themeScript = `
try {
  const storedTheme = window.localStorage.getItem('botdock.theme');
  document.documentElement.dataset.theme = storedTheme === 'light' ? 'light' : 'dark';
} catch {
  document.documentElement.dataset.theme = 'dark';
}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
