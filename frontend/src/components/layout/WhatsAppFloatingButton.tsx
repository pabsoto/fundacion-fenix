import { createPortal } from 'react-dom'
import { useWhatsAppContact } from '@/hooks/useWhatsAppContact'
import './WhatsAppFloatingButton.css'

const WHATSAPP_ARIA_LABEL = 'Contactar a Fundación FÉNIX LPB por WhatsApp'

// HU-06 / RF-04
export function WhatsAppFloatingButton() {
  const { data: whatsapp, isPending, isError } = useWhatsAppContact()

  if (isPending || isError || !whatsapp) {
    return null
  }

  return createPortal(
    <a
      className="wa-float"
      href={whatsapp.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={WHATSAPP_ARIA_LABEL}
    >
      <span className="wa-float__icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" focusable="false">
          <path
            d="M20 11.5a8 8 0 0 1-8 8 8.7 8.7 0 0 1-3.5-.7L4 20l1.2-3.8a8 8 0 1 1 14.8-4.7Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 11.5h.01m3.49 0h.01m3.49 0h.01"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="wa-float__tooltip">{whatsapp.texto.es || '¿Hablamos?'}</span>
    </a>,
    document.body,
  )
}
