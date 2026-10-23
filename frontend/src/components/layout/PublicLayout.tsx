import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { WhatsAppFloatingButton } from './WhatsAppFloatingButton'

export function PublicLayout() {
  return (
    <div>
      <Navbar />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <WhatsAppFloatingButton />
    </div>
  )
}
