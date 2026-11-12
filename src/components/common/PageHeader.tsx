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
        <nav className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-2 font-medium">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
              {crumb.path ? (
                <Link
                  to={crumb.path}
                  className="hover:text-[#143F73] transition-colors hover:underline"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-[#102A43] font-semibold">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {(actions || badge) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">{badge}</div>
          {actions && (
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">{actions}</div>
          )}
        </div>
      )}
    </div>
  );
};
