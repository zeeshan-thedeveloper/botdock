import type { Metadata } from 'next';
import { AppShell } from '../app-shell';
import { AuthGate } from '../auth-gate';

export const metadata: Metadata = {
  title: 'BotDock Dashboard',
};

export default function DashboardShell() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}
