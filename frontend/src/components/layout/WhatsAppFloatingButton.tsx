import './WhatsAppFloatingButton.css';
import { WHATSAPP_URL } from '@/lib/constants';

const WHATSAPP_ARIA_LABEL =
  'Contactar a Fundación FÉNIX LPB por WhatsApp';

// HU-06 / RF-04
export function WhatsAppFloatingButton() {
  return (
    <a
      className="wa-float"
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={WHATSAPP_ARIA_LABEL}
    >
      <span className="wa-float__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path
            fill="currentColor"
            d="M12 2a9.8 9.8 0 0 0-8.4 14.8L2.3 22l5.4-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3.2.8.9-3.1-.2-.3A8 8 0 1 1 12 20Z"
          />
          <path
            fill="currentColor"
            d="M16.6 13.8c-.3-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.6.2-.2.3-.6.8-.8 1-.1.2-.3.2-.6.1-.3-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.4-1.7-.1-.3 0-.4.1-.6l.4-.4c.1-.1.2-.3.3-.4.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.2-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.8.6.3 1.1.4 1.5.5.6.2 1.2.1 1.6.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .2-1.1-.1-.2-.3-.3-.6-.5Z"
          />
        </svg>
      </span>
      <span className="wa-float__tooltip">¿Hablamos?</span>
    </a>
  );
}
