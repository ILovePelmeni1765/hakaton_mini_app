type PulseBrandMarkProps = {
  className?: string;
};

export function PulseBrandMark({ className = '' }: PulseBrandMarkProps) {
  return (
    <span className={`pulse-brand-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        <path d="M9 23.5V8.5h14v15" />
        <path d="M16 9v14.5" />
        <circle cx="9" cy="8.5" r="1.7" />
        <circle cx="23" cy="23.5" r="1.7" />
      </svg>
    </span>
  );
}
