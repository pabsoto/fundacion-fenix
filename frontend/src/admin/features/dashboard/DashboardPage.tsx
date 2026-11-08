import { PageHeader } from '../../layout/PageHeader';
import { adminStrings } from '../../lib/strings';

export function DashboardPage() {
  return (
    <div>
      <PageHeader
        title={adminStrings.pageHeader.summary.title}
        description={adminStrings.pageHeader.summary.description}
      />
      <div className="rounded-surface border border-linea bg-blanco p-8 text-center">
        <p className="t-body">{adminStrings.empty.title}</p>
        <p className="t-small mt-2">{adminStrings.empty.description}</p>
      </div>
    </div>
  );
}
