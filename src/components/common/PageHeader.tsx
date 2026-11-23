import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSetPageHeader } from '../../context/PageTitleContext';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

// El título y la descripción se muestran en el header de la aplicación (TopBar);
// aquí solo quedan las migas, la insignia y las acciones propias de la página.
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  badge,
}) => {
  useSetPageHeader({ title, subtitle });

  const hasCrumbs = !!breadcrumbs && breadcrumbs.length > 0;
  if (!hasCrumbs && !actions && !badge) return null;

  return (
    <div className="mb-6">
      {hasCrumbs && (
        <nav
          aria-label="Ruta de navegación"
          className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-subtle"
        >
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-400"
                  aria-hidden
                />
              )}
              {crumb.path ? (
                <Link
                  to={crumb.path}
                  className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-slate-100 hover:text-primary"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current="page"
                  className="rounded-md bg-slate-100/80 px-2 py-0.5 font-semibold text-ink"
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {(actions || badge) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">{badge}</div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
              {actions}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
