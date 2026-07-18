import { AuthGate } from './auth-gate';

export default function DashboardShell() {
  return <AuthGate />;
}
