import { PageHeader } from '../../layout/PageHeader';
import { adminStrings } from '../../lib/strings';

export function AnimalsPage() {
  return (
    <div>
      <PageHeader
        title={adminStrings.pageHeader.animals.title}
        description={adminStrings.pageHeader.animals.description}
      />
      <div className="rounded-surface border border-linea bg-blanco p-8 text-center">
        <p className="t-body">{adminStrings.empty.title}</p>
        <p className="t-small mt-2">{adminStrings.empty.description}</p>
      </div>
    </div>
  );
}
