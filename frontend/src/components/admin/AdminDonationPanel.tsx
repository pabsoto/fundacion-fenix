import { useEffect, useState, type FormEvent } from 'react';
import {
  deleteDonationQr,
  getAdminDonation,
  saveAdminDonation,
  uploadDonationQr,
  type SaveAdminDonation,
} from '@/services/admin-donations.service';

const EMPTY_FORM: SaveAdminDonation = {
  titular: '',
  banco: '',
  telefono: '',
  referencia: '',
  numeroCuenta: null,
  avisoEs: null,
  avisoEn: null,
};

export function AdminDonationPanel({ csrfToken }: { csrfToken: string }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [hasQr, setHasQr] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [expiration, setExpiration] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getAdminDonation()
      .then((donation) => {
        if (!donation) return;
        setForm({
          titular: donation.titular,
          banco: donation.banco,
          telefono: donation.telefono,
          referencia: donation.referencia,
          numeroCuenta: donation.numeroCuenta,
          avisoEs: donation.avisoEs,
          avisoEn: donation.avisoEn,
        });
        setHasQr(donation.qr.disponible);
        setExpiration(donation.qr.venceEl ?? '');
      })
      .catch((error: Error) => setMessage(error.message));
  }, []);

  function update(field: keyof SaveAdminDonation, value: string) {
    setForm((current) => ({ ...current, [field]: value || null }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await saveAdminDonation(form, csrfToken);
      setMessage('Datos de donación guardados.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      await uploadDonationQr(file, expiration, csrfToken);
      setHasQr(true);
      setMessage('QR subido correctamente.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo subir el QR.');
    } finally {
      setBusy(false);
    }
  }

  async function removeQr() {
    setBusy(true);
    setMessage('');
    try {
      await deleteDonationQr(csrfToken);
      setHasQr(false);
      setMessage('QR retirado correctamente.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo retirar el QR.');
    } finally {
      setBusy(false);
    }
  }

  const fields: Array<[keyof SaveAdminDonation, string, boolean]> = [
    ['titular', 'Titular', true],
    ['banco', 'Banco', true],
    ['telefono', 'Teléfono', true],
    ['referencia', 'Referencia', true],
    ['numeroCuenta', 'Número de cuenta', false],
    ['avisoEs', 'Aviso en español', false],
    ['avisoEn', 'Aviso en inglés', false],
  ];

  return (
    <section className="mt-10 border-t border-linea pt-8" aria-labelledby="admin-donaciones">
      <h2 id="admin-donaciones" className="t-heading-md">Donaciones</h2>
      <form className="mt-5 grid gap-4" onSubmit={(event) => void save(event)}>
        {fields.map(([field, label, required]) => (
          <label key={field} className="grid gap-1 t-small">
            {label}
            <input
              required={required}
              value={form[field] ?? ''}
              onChange={(event) => update(field, event.target.value)}
              className="min-h-11 rounded-btn border border-linea bg-blanco px-3 py-2 t-body"
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={busy}
          className="t-button min-h-11 rounded-btn bg-negro px-5 py-3 text-crema disabled:opacity-60"
        >
          Guardar datos
        </button>
      </form>

      <div className="mt-8 grid gap-4">
        <p className="t-body-strong">QR: {hasQr ? 'disponible' : 'no disponible'}</p>
        <label className="grid gap-1 t-small">
          Imagen PNG, JPG o WebP (máximo 2 MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="grid gap-1 t-small">
          Vencimiento opcional
          <input
            type="date"
            value={expiration}
            onChange={(event) => setExpiration(event.target.value)}
            className="min-h-11 rounded-btn border border-linea bg-blanco px-3 py-2 t-body"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!file || busy}
            onClick={() => void upload()}
            className="t-button min-h-11 rounded-btn bg-negro px-5 py-3 text-crema disabled:opacity-60"
          >
            Subir o reemplazar QR
          </button>
          <button
            type="button"
            disabled={!hasQr || busy}
            onClick={() => void removeQr()}
            className="t-button min-h-11 rounded-btn border border-negro px-5 py-3 disabled:opacity-60"
          >
            Retirar QR
          </button>
        </div>
      </div>
      {message && <p className="t-small mt-4" role="status">{message}</p>}
    </section>
  );
}
