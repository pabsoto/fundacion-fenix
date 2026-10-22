import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { ContactFooter } from './ContactFooter';

export function PublicLayout() {
  return (
    <div>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <ContactFooter />
      {/* WhatsAppFloat will be rendered here when implemented by team member */}
    </div>
  );
}
