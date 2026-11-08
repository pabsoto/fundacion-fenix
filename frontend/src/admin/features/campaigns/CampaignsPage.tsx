import { PageHeader } from '../../layout/PageHeader';
import { adminStrings } from '../../lib/strings';

export function CampaignsPage() {
  return (
    <div>
      <PageHeader
        title={adminStrings.pageHeader.campaigns.title}
        description={adminStrings.pageHeader.campaigns.description}
      />
      <div className="rounded-surface border border-linea bg-blanco p-8 text-center">
        <p className="t-body">{adminStrings.empty.title}</p>
        <p className="t-small mt-2">{adminStrings.empty.description}</p>
      </div>
    </div>
  );
}
