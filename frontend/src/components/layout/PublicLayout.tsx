import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { ContactFooter } from './ContactFooter';
import { WhatsAppFloatingButton } from './WhatsAppFloatingButton';

export function PublicLayout() {
  return (
    <div>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <ContactFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
