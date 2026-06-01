import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

const variantClasses = {
  primary:
    'bg-primary text-black shadow-glow-primary hover:bg-primary/90 focus-visible:ring-primary/70',
  secondary:
    'bg-secondary text-white shadow-glow-secondary hover:bg-secondary/90 focus-visible:ring-secondary/70',
  ghost:
    'bg-white/5 text-white hover:bg-white/10 focus-visible:ring-white/40',
};

export function Button({
  children,
  className = '',
  disabled,
  fullWidth = false,
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex min-h-12 items-center justify-center rounded-pill px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-60',
        fullWidth ? 'w-full' : '',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
