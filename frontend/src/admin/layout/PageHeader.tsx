import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="t-heading-lg">{title}</h1>
        {description && <p className="t-body mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}
