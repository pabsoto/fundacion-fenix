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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" focusable="false">
          <path
            fillRule="evenodd"
            d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.35 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.87 9.87 0 0 0 12.04 2Zm5.83 14c-.25.7-1.44 1.34-2.01 1.42-.51.08-1.16.11-1.87-.12-.43-.14-.98-.32-1.69-.63-2.98-1.29-4.93-4.49-5.08-4.69-.15-.2-1.21-1.61-1.21-3.07 0-1.47.77-2.19 1.04-2.49.27-.3.59-.37.79-.37h.57c.18.01.43-.07.67.51.25.6.84 2.06.92 2.21.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.45.52-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.06 1.14 1.01 2.09 1.33 2.39 1.48.3.15.47.12.64-.08.18-.2.75-.87.94-1.16.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.35.08.12.08.72-.17 1.41Z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <span className="wa-float__tooltip">{whatsapp.texto.es || '¿Hablamos?'}</span>
    </a>,
    document.body,
  )
}
