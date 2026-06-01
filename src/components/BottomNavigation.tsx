interface BottomNavigationProps {
  currentRoute: string;
}

const navItems = [
  { hash: '#jogos', label: 'Jogos', icon: 'J' },
  { hash: '#meus-palpites', label: 'Meus Palpites', icon: 'M' },
  { hash: '#ranking', label: 'Ranking', icon: 'R' },
  { hash: '#perfil', label: 'Perfil', icon: 'P' },
];

export default function BottomNavigation({ currentRoute }: BottomNavigationProps) {
  return (
    <nav
      aria-label="Navegacao principal"
      className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 items-center justify-between gap-2 rounded-pill border border-white/10 bg-black/35 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
    >
      {navItems.map((item) => {
        const isActive = currentRoute === item.hash;

        return (
          <a
            aria-current={isActive ? 'page' : undefined}
            className={[
              'flex min-h-11 min-w-[84px] flex-1 items-center justify-center gap-2 rounded-pill px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
              isActive
                ? 'bg-primary text-black shadow-glow-primary'
                : 'text-zinc-300 hover:bg-white/10 hover:text-white',
            ].join(' ')}
            href={item.hash}
            key={item.hash}
          >
            <span
              aria-hidden="true"
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                isActive ? 'bg-black/15' : 'bg-white/10'
              }`}
            >
              {item.icon}
            </span>
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
