import type { ReactNode } from 'react';

interface AuthShellProps {
  badge?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  subtitle?: string;
  title?: string;
}

export function AuthShell({ children, className = '', footer }: AuthShellProps) {
  return (
    <div className={`relative min-h-screen overflow-hidden bg-[#0A0A0A] px-4 py-8 text-white transition-opacity duration-300 ${className}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,0,127,0.12),_transparent_24%),linear-gradient(180deg,_rgba(16,18,38,0.9),_rgba(8,9,18,1))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="hidden min-h-[620px] rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(204,255,0,0.08),_transparent_38%),rgba(255,255,255,0.04)] p-10 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:flex lg:items-center lg:justify-center">
            <img
              alt="We Are Camerite"
              className="max-h-[460px] w-full max-w-[460px] object-contain"
              src="/logos/logo_we_are.png"
            />
          </section>

          <section className="rounded-[32px] border border-white/10 bg-[rgba(20,20,20,0.9)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-8">
            <div className="mb-8 flex justify-center">
              <img
                alt="Camerite na Copa"
                className="h-auto w-full max-w-[260px] object-contain"
                src="/logos/Camerite_horizontal.png"
              />
            </div>

            <div className="space-y-5">{children}</div>

            {footer ? <div className="mt-8 border-t border-white/10 pt-6 text-sm text-zinc-300">{footer}</div> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
