import type { ComponentPropsWithoutRef } from 'react';

export function StatusBadge({
  status,
  ...props
}: ComponentPropsWithoutRef<'span'> & { status: 'Implemented' | 'In Progress' | 'Planned' }) {
  return <span {...props}>{status}</span>;
}
