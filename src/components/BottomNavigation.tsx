interface BottomNavigationProps {
  currentRoute: string;
}

const navItems = [
  { hash: '#home', label: 'Home', icon: 'H' },
  { hash: '#jogos', label: 'Jogos', icon: 'J' },
  { hash: '#meus-palpites', label: 'Meus Palpites', icon: 'M' },
  { hash: '#ranking', label: 'Ranking', icon: 'R' },
  { hash: '#perfil', label: 'Perfil', icon: 'P' },
];

export default function BottomNavigation({ currentRoute }: BottomNavigationProps) {
  return (
    <>
      <nav
        aria-label="Navegacao principal desktop"
        className="sticky top-0 z-40 mx-auto hidden w-full max-w-6xl items-center justify-between gap-3 px-8 py-5 md:flex"
      >
        <div className="text-sm font-bold uppercase tracking-[0.35em] text-white">Cravou</div>
        <div className="flex items-center gap-2 rounded-full border border-[#2A2A2A] bg-[#141414]/95 p-2 backdrop-blur-xl">
          {navItems.map((item) => {
            const isActive = currentRoute === item.hash;

            return (
              <a
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]',
                  isActive ? 'bg-[#CCFF00] text-black' : 'text-gray-400 hover:bg-[#1C1C1C] hover:text-white',
                ].join(' ')}
                href={item.hash}
                key={item.hash}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </nav>

      <nav
        aria-label="Navegacao principal mobile"
        className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-6xl -translate-x-1/2 items-center justify-between gap-2 rounded-full border border-[#2A2A2A] bg-[#141414]/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl md:hidden"
      >
        {navItems.map((item) => {
          const isActive = currentRoute === item.hash;

          return (
            <a
              aria-current={isActive ? 'page' : undefined}
              className={[
                'flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-[10px] font-bold uppercase tracking-wide transition',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]',
                isActive ? 'bg-[#CCFF00] text-black' : 'text-gray-400 hover:bg-[#1C1C1C] hover:text-white',
              ].join(' ')}
              href={item.hash}
              key={item.hash}
            >
              <span
                aria-hidden="true"
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                  isActive ? 'bg-black/10' : 'bg-[#1C1C1C]'
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </a>
          );
        })}
      </nav>
    </>
  );
}
