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

function BrandIcon({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <BrandIcon className={className}>
      <path
        d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6L16 12h-3V10c0-.6.4-1 1-1Z"
        fill="currentColor"
      />
    </BrandIcon>
  );
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <BrandIcon className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </BrandIcon>
  );
}

export function TikTokIcon({ className }: { className?: string }) {
  return (
    <BrandIcon className={className}>
      <path
        d="M14.5 4v9.2a3.7 3.7 0 1 1-2.6-3.5V12a1.4 1.4 0 1 0 1.3 1.4V4h1.3Zm2.2 0c.4 2.4 2.1 4.2 4.3 4.6v2.2c-1.6-.1-3.1-.7-4.3-1.7v6.3A5.9 5.9 0 1 1 9.4 9.7v2.3a3.7 3.7 0 1 0 3.8 3.7V4h3.5Z"
        fill="currentColor"
      />
    </BrandIcon>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <BrandIcon className={className}>
      <path
        d="M12 3.5A8.5 8.5 0 0 0 5.1 16.4L4 20.5l4.2-1.1A8.5 8.5 0 1 0 12 3.5Zm4.7 12c-.2.6-1.1 1.1-1.8 1.2-.5.1-1.1.2-3.5-.7-3-1.2-4.9-4.2-5-4.4-.2-.2-1.3-1.7-1.3-3.3 0-1.6.8-2.3 1.1-2.6.3-.3.7-.4 1-.4h.7c.2 0 .5 0 .7.6.3.7.9 2.4 1 2.5.1.2.1.4 0 .6-.1.2-.2.4-.4.6-.2.2-.4.4-.2.7.2.4.9 1.5 2 2.4 1.3 1.1 2.4 1.4 2.8 1.6.3.1.6.1.8-.1.2-.2.9-.9 1.1-1.2.2-.3.5-.3.8-.2.3.1 2 .9 2.3 1.1.3.2.5.3.6.4.1.2.1.9-.3 1.5Z"
        fill="currentColor"
      />
    </BrandIcon>
  );
}

