import { AppShell } from './app-shell';
import { AuthGate } from './auth-gate';

export default function DashboardShell() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  );
}
