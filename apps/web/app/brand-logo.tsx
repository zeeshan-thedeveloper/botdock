// BotDock brand mark: a chat-bubble robot docked in a cradle.
// Vector redraw of design/botdock-logo.png. The head/face use currentColor so
// they follow the theme foreground (white on dark, navy on light); the
// antenna, ears, dock and "Dock" wordmark stay in the fixed brand indigo.

const BRAND_INDIGO = '#6366F1';

type BrandMarkProps = {
  className?: string;
};

export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true" focusable="false">
      {/* Antenna */}
      <circle cx="32" cy="6" r="4.5" fill={BRAND_INDIGO} />
      <path d="M32 10v7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Ears */}
      <rect x="5" y="22" width="7" height="13" rx="3.5" fill={BRAND_INDIGO} />
      <rect x="52" y="22" width="7" height="13" rx="3.5" fill={BRAND_INDIGO} />
      {/* Head as a speech bubble */}
      <rect
        x="16.5"
        y="17.5"
        width="31"
        height="23"
        rx="6.5"
        stroke="currentColor"
        strokeWidth="5"
      />
      <path d="M20 42h9l-9 8z" fill="currentColor" />
      {/* Face */}
      <rect x="23.5" y="24" width="3.5" height="6" rx="1.75" fill="currentColor" />
      <rect x="37" y="24" width="3.5" height="6" rx="1.75" fill="currentColor" />
      <path d="M27 32.5q5 4 10 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* Dock */}
      <path
        d="M8 45v6a6 6 0 0 0 6 6h36a6 6 0 0 0 6-6v-6"
        stroke={BRAND_INDIGO}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
};

export function BrandLogo({
  className = '',
  markClassName = 'size-8',
  textClassName = 'text-[15px]',
}: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <BrandMark className={`shrink-0 text-foreground ${markClassName}`} />
      <span className={`font-bold tracking-tight text-foreground ${textClassName}`}>
        Bot<span style={{ color: BRAND_INDIGO }}>Dock</span>
      </span>
    </div>
  );
}
