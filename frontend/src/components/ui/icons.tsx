export function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <ellipse cx="4.3" cy="11.4" rx="2.1" ry="2.9" transform="rotate(-24 4.3 11.4)" />
      <ellipse cx="8.7" cy="6.1" rx="2.3" ry="3.2" transform="rotate(-9 8.7 6.1)" />
      <ellipse cx="15.3" cy="6.1" rx="2.3" ry="3.2" transform="rotate(9 15.3 6.1)" />
      <ellipse cx="19.7" cy="11.4" rx="2.1" ry="2.9" transform="rotate(24 19.7 11.4)" />
      <path d="M12 11.6c-2.9 0-5.6 2.6-5.6 5.3 0 2 1.5 3.2 3.3 3.2.9 0 1.6-.4 2.3-.4s1.4.4 2.3.4c1.8 0 3.3-1.2 3.3-3.2 0-2.7-2.7-5.3-5.6-5.3z" />
    </svg>
  );
}

export function FlameIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 4c2.5 7-1 12-1 17 0 4 2.5 6 5.5 6 6.5 0 11-6.5 11-14 0-4.5-2.5-9-5-12 4.5 5.5 9 13 9 19.5 0 9.5-7.5 17-18.5 17S5.5 30 5.5 20.5c0-6.5 4.5-13 8.5-17-1.5 5.5 1 9.5 3 13 1.5-4.5 4.5-8.5 7-11Z"
        fill="var(--color-naranja)"
        stroke="var(--color-negro)"
        strokeWidth="2"
        strokeLinejoin="round"
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

