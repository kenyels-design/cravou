import ThemeToggle from './ThemeToggle';

interface BottomNavigationProps {
  currentRoute: string;
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function GamesIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7 2.6 1.8-1 3.1h-3.2l-1-3.1L12 7Z" />
      <path d="m8.5 16 1.8-2.1h3.4l1.8 2.1" />
    </svg>
  );
}

function PredictionsIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="m4 6 1.5 1.5L8 5" />
      <path d="m4 12 1.5 1.5L8 11" />
      <path d="m4 18 1.5 1.5L8 17" />
    </svg>
  );
}

function RankingIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 20V10" />
      <path d="M12 20V6" />
      <path d="M19 20v-8" />
      <path d="M3 20h18" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

const mobileNavItems = [
  { hash: '#home', label: 'Home', icon: <HomeIcon /> },
  { hash: '#jogos', label: 'Jogos', icon: <GamesIcon /> },
  { hash: '#meus-palpites', label: 'Meus Palpites', icon: <PredictionsIcon /> },
  { hash: '#ranking', label: 'Ranking', icon: <RankingIcon /> },
  { hash: '#perfil', label: 'Perfil', icon: <ProfileIcon /> },
];

const desktopNavItems = [
  { hash: '#home', label: 'Home' },
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
        className="fixed inset-x-0 top-0 z-40 hidden border-b border-[#D0D0D8] bg-[#EEEEF2]/95 backdrop-blur-xl dark:border-[#2A2A2A] dark:bg-[#0A0A0A]/95 md:block"
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-center gap-3 px-8">
          <div className="flex items-center gap-2 rounded-full border border-[#D0D0D8] bg-white p-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)] dark:border-[#2A2A2A] dark:bg-[#141414]/95 dark:shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
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
                      : 'text-[#555566] hover:bg-[#F1F1F6] hover:text-[#0A0A0A] dark:text-gray-400 dark:hover:bg-[#1C1C1C] dark:hover:text-white',
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
        className="fixed bottom-4 left-1/2 z-50 flex h-16 w-[calc(100%-1.5rem)] max-w-6xl -translate-x-1/2 items-center justify-between gap-2 rounded-full border border-[#D0D0D8] bg-white/95 px-2 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)] backdrop-blur-2xl dark:border-[#2A2A2A] dark:bg-[#141414]/95 dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)] md:hidden"
      >
        {mobileNavItems.map((item) => {
          const isActive = currentRoute === item.hash;

          return (
            <a
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex h-full min-w-0 flex-1 items-center justify-center rounded-full px-1 py-1 transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]',
                isActive
                  ? 'bg-[#CCFF00] text-black'
                  : 'text-[#555566] hover:bg-[#F1F1F6] hover:text-[#0A0A0A] dark:text-gray-400 dark:hover:bg-[#1C1C1C] dark:hover:text-white',
              ].join(' ')}
              href={item.hash}
              key={item.hash}
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                  isActive ? 'bg-black/10' : 'bg-[#E8E8F0] dark:bg-[#1C1C1C]'
                }`}
              >
                {item.icon}
              </span>
              <span className="sr-only">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
