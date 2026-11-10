type AdminSeccionVaciaProps = {
  titulo: string;
};

/** Título de página y panel en blanco, hasta que llegue el contenido de la pestaña. */
export function AdminSeccionVacia({ titulo }: AdminSeccionVaciaProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-(--spacing-bloque-gap-admin)">
      <h1 className="t-pagina text-negro">{titulo}</h1>
      <div
        className="rounded-admin border-linea bg-blanco shadow-panel-admin min-h-(--size-panel-vacio-admin) flex-1 border"
        aria-hidden="true"
      />
    </div>
  );
}
