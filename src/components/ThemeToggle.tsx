import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className={[
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-wide transition',
        'border-[#E0E0E0] bg-white text-[#0A0A0A] hover:bg-[#F5F5F5]',
        'dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-white dark:hover:bg-[#1C1C1C]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={toggleTheme}
      type="button"
    >
      <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
      <span>{isDark ? 'Claro' : 'Escuro'}</span>
    </button>
  );
}
