import fullLogo from '../../../assets/logo-laundry.png';
import iconLogo from '../../../assets/logo-laundry-lav.png';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({
  variant = 'full',
  size = 'md',
  className = '',
}: LogoProps) {
  const dimensions =
    variant === 'icon'
      ? { sm: 'w-6', md: 'w-8', lg: 'w-10' }
      : { sm: 'w-36', md: 'w-48', lg: 'w-56' };
  return (
    <img
      src={variant === 'icon' ? iconLogo : fullLogo}
      alt={
        variant === 'icon'
          ? 'CFL: lavadora con hoja verde'
          : 'CFL LAUNDRY CLEAN FRESH'
      }
      className={`block h-auto object-contain ${dimensions[size]} ${className}`}
    />
  );
}
