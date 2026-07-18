import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

function cx(...classes: Array<false | null | undefined | string>) {
  return classes.filter(Boolean).join(' ');
}

const toneStyles: Record<Tone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  primary: 'border-primary/30 bg-primary-muted text-primary',
  success: 'border-success/30 bg-success-muted text-success',
  warning: 'border-warning/30 bg-warning-muted text-warning',
  danger: 'border-danger/30 bg-danger-muted text-danger',
  info: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300',
};

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const variantStyles: Record<ButtonVariant, string> = {
    primary:
      'border-primary bg-primary text-primary-foreground shadow-surface-sm hover:bg-primary/90',
    secondary:
      'border-border bg-surface-raised text-foreground shadow-surface-sm hover:border-primary/50 hover:bg-muted',
    ghost:
      'border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
    danger:
      'border-danger/50 bg-danger-muted text-danger hover:border-danger hover:bg-danger hover:text-danger-foreground',
  };
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-5 text-sm',
  };

  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition disabled:cursor-not-allowed disabled:opacity-55',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        sizeStyles[size],
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: Omit<ComponentPropsWithoutRef<'button'>, 'aria-label'> & {
  'aria-label': string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'size-8',
    md: 'size-9',
    lg: 'size-10',
  };

  return (
    <Button
      type={type}
      variant={variant}
      className={cx(sizeStyles[size], 'px-0', className)}
      {...props}
    />
  );
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: ComponentPropsWithoutRef<'span'> & { tone?: Tone }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase leading-none',
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}

const statusTone: Record<string, Tone> = {
  Active: 'primary',
  Done: 'success',
  Implemented: 'success',
  'In Progress': 'primary',
  Live: 'success',
  Planned: 'neutral',
  Queued: 'warning',
  Ready: 'success',
  Failed: 'danger',
  Disabled: 'neutral',
};

export function StatusBadge({
  status,
  tone,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof Badge>, 'children'> & {
  status: string;
}) {
  return (
    <Badge tone={tone ?? statusTone[status] ?? 'neutral'} {...props}>
      {status}
    </Badge>
  );
}

export function Panel({ className, ...props }: ComponentPropsWithoutRef<'section'>) {
  return (
    <section
      className={cx('rounded-lg border border-border bg-surface/95 shadow-surface-sm', className)}
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cx('border-b border-border px-5 py-4', className)} {...props} />;
}

export function PanelTitle({ className, ...props }: ComponentPropsWithoutRef<'h2'>) {
  return (
    <h2 className={cx('text-base font-semibold leading-6 text-foreground', className)} {...props} />
  );
}

export function PanelDescription({ className, ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={cx('mt-1 text-sm leading-6 text-muted-foreground', className)} {...props} />;
}

export function PanelBody({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cx('p-5', className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('grid gap-2 text-sm', className)}>
      <span className="font-medium text-foreground">{label}</span>
      {children}
      {error ? (
        <span className="text-xs leading-5 text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs leading-5 text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput({ className, ...props }: ComponentPropsWithoutRef<'input'>) {
  return (
    <input
      className={cx(
        'h-9 w-full rounded-md border border-input bg-surface-raised px-3 text-sm text-foreground shadow-surface-sm transition',
        'placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: ComponentPropsWithoutRef<'textarea'>) {
  return (
    <textarea
      className={cx(
        'min-h-28 w-full resize-y rounded-md border border-input bg-surface-raised px-3 py-2 text-sm leading-6 text-foreground shadow-surface-sm transition',
        'placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...props}
    />
  );
}

export function Tabs({ className, ...props }: ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      role="tablist"
      className={cx('flex items-center gap-1 border-b border-border', className)}
      {...props}
    />
  );
}

export function Tab({
  active = false,
  className,
  type = 'button',
  ...props
}: ComponentPropsWithoutRef<'button'> & { active?: boolean }) {
  return (
    <button
      type={type}
      role="tab"
      aria-selected={active}
      className={cx(
        'border-b-2 px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function DataTable({
  className,
  wrapperClassName,
  ...props
}: ComponentPropsWithoutRef<'table'> & { wrapperClassName?: string }) {
  return (
    <div className={cx('overflow-hidden rounded-lg border border-border', wrapperClassName)}>
      <div className="overflow-x-auto">
        <table
          className={cx('min-w-full border-collapse text-left text-sm', className)}
          {...props}
        />
      </div>
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentPropsWithoutRef<'thead'>) {
  return (
    <thead
      className={cx(
        'border-b border-border bg-muted text-xs font-semibold uppercase text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr
      className={cx('border-b border-border last:border-b-0 hover:bg-muted/55', className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentPropsWithoutRef<'th'>) {
  return <th className={cx('whitespace-nowrap px-4 py-3 font-semibold', className)} {...props} />;
}

export function TableCell({ className, ...props }: ComponentPropsWithoutRef<'td'>) {
  return (
    <td className={cx('whitespace-nowrap px-4 py-3 text-muted-foreground', className)} {...props} />
  );
}

export function MetricCard({
  label,
  value,
  trend,
  tone = 'neutral',
  className,
}: {
  label: string;
  value: string;
  trend?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Panel className={cx('p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {trend ? <Badge tone={tone}>{trend}</Badge> : null}
      </div>
      <p className="mt-3 text-2xl font-semibold leading-none text-foreground">{value}</p>
    </Panel>
  );
}

export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  label?: string;
  className?: string;
}) {
  const boundedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cx('grid gap-2', className)}>
      {label ? (
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{label}</span>
          <span>{boundedValue}%</span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={boundedValue}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${boundedValue}%` }}
        />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/70 px-6 py-10 text-center',
        className,
      )}
    >
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function CodeBlock({ children, className, ...props }: ComponentPropsWithoutRef<'pre'>) {
  return (
    <pre
      className={cx(
        'overflow-x-auto rounded-lg border border-border bg-background p-4 font-mono text-xs leading-6 text-muted-foreground shadow-inner',
        className,
      )}
      {...props}
    >
      <code>{children}</code>
    </pre>
  );
}
