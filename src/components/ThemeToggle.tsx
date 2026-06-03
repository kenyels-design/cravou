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
        'inline-flex h-7 w-14 items-center rounded-full border p-[2px] transition-all duration-300',
        'border-[#D0D0D8] bg-[#F5F5F5] text-[#0A0A0A] hover:scale-105 hover:bg-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A]',
        'dark:border-[#2A2A2A] dark:bg-[#141414] dark:text-white dark:hover:bg-[#1C1C1C] dark:focus-visible:ring-white',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={toggleTheme}
      type="button"
    >
      <span className="relative flex h-full w-full items-center justify-between px-[5px]">
        <span aria-hidden="true" className="text-xs leading-none text-[#555566] dark:text-gray-400">
          {'\u263E'}
        </span>
        <span aria-hidden="true" className="text-xs leading-none text-[#555566] dark:text-gray-400">
          {'\u2600'}
        </span>
        <span
          aria-hidden="true"
          className={`absolute top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full shadow-sm transition-all duration-300 ${
            isDark
              ? 'left-[2px] bg-[#0A0A0A] text-white dark:bg-[#F5F5F5] dark:text-[#0A0A0A]'
              : 'left-[calc(100%-22px)] bg-white text-[#0A0A0A]'
          }`}
        >
          {isDark ? '\u263E' : '\u2600'}
        </span>
      </span>
    </button>
  );
}
