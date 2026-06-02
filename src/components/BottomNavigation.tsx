import ThemeToggle from './ThemeToggle';

interface BottomNavigationProps {
  currentRoute: string;
}

const mobileNavItems = [
  { hash: '#home', label: 'Home', icon: 'H' },
  { hash: '#jogos', label: 'Jogos', icon: 'J' },
  { hash: '#meus-palpites', label: 'Meus Palpites', icon: 'M' },
  { hash: '#ranking', label: 'Ranking', icon: 'R' },
  { hash: '#perfil', label: 'Perfil', icon: 'P' },
];

const desktopNavItems = [
  { hash: '#jogos', label: 'Jogos' },
  { hash: '#meus-palpites', label: 'Meus Palpites' },
  { hash: '#ranking', label: 'Ranking' },
  { hash: '#perfil', label: 'Perfil' },
];

export default function BottomNavigation({ currentRoute }: BottomNavigationProps) {
  return (
    <>
      <nav
        aria-label="Navegacao principal desktop"
        className="fixed inset-x-0 top-0 z-40 hidden border-b border-[#E0E0E0] bg-[#F5F5F5]/95 backdrop-blur-xl dark:border-[#2A2A2A] dark:bg-[#0A0A0A]/95 md:block"
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-center gap-3 px-8">
          <div className="flex items-center gap-2 rounded-full border border-[#E0E0E0] bg-white p-2 shadow-[0_18px_40px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414]/95 dark:shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
            {desktopNavItems.map((item) => {
              const isActive = currentRoute === item.hash;

              return (
                <a
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wide transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]',
                    isActive
                      ? 'bg-[#CCFF00] text-black'
                      : 'text-zinc-600 hover:bg-[#F5F5F5] hover:text-[#0A0A0A] dark:text-gray-400 dark:hover:bg-[#1C1C1C] dark:hover:text-white',
                  ].join(' ')}
                  href={item.hash}
                  key={item.hash}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
          <ThemeToggle />
        </div>
      </nav>

      <nav
        aria-label="Navegacao principal mobile"
        className="fixed bottom-4 left-1/2 z-50 flex h-16 w-[calc(100%-1.5rem)] max-w-6xl -translate-x-1/2 items-center justify-between gap-2 rounded-full border border-[#E0E0E0] bg-white/95 px-2 py-1 shadow-[0_24px_60px_rgba(0,0,0,0.14)] backdrop-blur-2xl dark:border-[#2A2A2A] dark:bg-[#141414]/95 dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)] md:hidden"
      >
        {mobileNavItems.map((item) => {
          const isActive = currentRoute === item.hash;

          return (
            <a
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1 text-[10px] font-bold uppercase tracking-wide transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]',
                isActive
                  ? 'bg-[#CCFF00] text-black'
                  : 'text-zinc-600 hover:bg-[#F5F5F5] hover:text-[#0A0A0A] dark:text-gray-400 dark:hover:bg-[#1C1C1C] dark:hover:text-white',
              ].join(' ')}
              href={item.hash}
              key={item.hash}
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                  isActive ? 'bg-black/10' : 'bg-[#EFEFEF] dark:bg-[#1C1C1C]'
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate text-[10px] leading-none">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
