import type { ReactNode } from 'react';

interface AuthShellProps {
  badge?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ badge, children, footer, subtitle, title }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,0,127,0.12),_transparent_24%),linear-gradient(180deg,_rgba(16,18,38,0.9),_rgba(8,9,18,1))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="hidden min-h-[620px] rounded-bento-lg border border-white/10 bg-white/5 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-5">
              <span className="inline-flex w-fit rounded-pill border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                Camerite na Copa!
              </span>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-bento border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Pontuacao</p>
                  <p className="mt-4 text-4xl font-black text-primary">10 / 5 / 0</p>
                  <p className="mt-2 text-sm text-zinc-300">Placar exato, desfecho correto ou erro.</p>
                </div>
                <div className="rounded-bento border border-white/10 bg-black/20 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Status pronto</p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em]">
                    {['pendente', 'ao_vivo', 'finalizado', 'aguardando_resultado'].map((status) => (
                      <span
                        className="rounded-pill border border-secondary/25 bg-secondary/10 px-3 py-1 text-secondary"
                        key={status}
                      >
                        {status}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: 'Acesso', value: 'Corporativo' },
                { label: 'Visual', value: 'Neon Bento' },
                { label: 'Base', value: 'Supabase' },
              ].map((item) => (
                <div className="rounded-bento border border-white/10 bg-black/20 p-4" key={item.label}>
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">{item.label}</p>
                  <p className="mt-3 text-lg font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
            <div className="mb-8 space-y-3">
              {badge ? (
                <span className="inline-flex rounded-pill border border-secondary/25 bg-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                  {badge}
                </span>
              ) : null}
              <div>
                <h1 className="text-4xl font-black uppercase tracking-[0.08em] text-white sm:text-5xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-md text-sm leading-6 text-zinc-300">{subtitle}</p>
              </div>
            </div>

            <div className="space-y-5">{children}</div>

            {footer ? <div className="mt-8 border-t border-white/10 pt-6 text-sm text-zinc-300">{footer}</div> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
