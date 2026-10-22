export function PawIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <ellipse cx="12" cy="14" rx="5" ry="7" fill="currentColor" />
      <ellipse cx="24" cy="10" rx="5" ry="7" fill="currentColor" />
      <ellipse cx="36" cy="14" rx="5" ry="7" fill="currentColor" />
      <ellipse cx="8" cy="26" rx="5" ry="7" fill="currentColor" />
      <ellipse cx="40" cy="26" rx="5" ry="7" fill="currentColor" />
    </svg>
  );
}

export function FlameIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M24 4C24 4 16 16 16 24C16 30.6274 21.3726 36 28 36C34.6274 36 40 30.6274 40 24C40 16 32 4 32 4C32 4 28 8 24 8C20 8 16 4 16 4C16 4 20 8 24 4Z"
        fill="#ffc200"
        stroke="#1c1c1c"
        strokeWidth="2"
      />
    </svg>
  );
}

