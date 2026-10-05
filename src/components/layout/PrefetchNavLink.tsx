import { NavLink, type NavLinkProps } from 'react-router-dom';
import { prefetchRoute } from './routePages';

export function PrefetchNavLink({
  to,
  onFocus,
  onPointerEnter,
  ...props
}: Omit<NavLinkProps, 'to'> & { to: string }) {
  return (
    <NavLink
      {...props}
      to={to}
      onFocus={(event) => {
        prefetchRoute(to);
        onFocus?.(event);
      }}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') prefetchRoute(to);
        onPointerEnter?.(event);
      }}
    />
  );
}
