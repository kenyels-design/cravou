import { useCallback, useEffect, useMemo, useState } from 'react';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { FUTURE_TOP3_SCORING_RULES, type TeamRecord } from '../lib/types';
import { fetchTop3ResultPage, isMissingTop3SchemaError } from '../lib/top3';

function teamLabel(team: TeamRecord | null) {
  if (!team) {
    return 'Aguardando definicao';
  }

  return team.flag_emoji ? `${team.flag_emoji} ${team.name}` : team.name;
}

export default function Result() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [result, setResult] = useState<{
    champion_team_id: number | null;
    vice_team_id: number | null;
    third_place_team_id: number | null;
    updated_at: string;
  } | null>(null);
  const [lockAt, setLockAt] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchTop3ResultPage();
      setTeams(data.teams);
      setResult(data.result);
      setLockAt(data.lockAt);
      setIsOpen(data.isOpen);
    } catch (error) {
      const fallback = 'Nao foi possivel carregar o resultado agora.';
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : fallback;

      setErrorMessage(
        isMissingTop3SchemaError(error)
          ? 'As tabelas do Top 3 no schema cravou ainda nao foram criadas no Supabase. Aplique a migration antes de usar esta tela.'
          : message || fallback,
      );
      setTeams([]);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const hasOfficialResult = Boolean(
    result?.champion_team_id && result.vice_team_id && result.third_place_team_id,
  );

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Resultado</p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white">
              Top 3 oficial da Copa
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Esta tela mostra o Top 3 oficial assim que ele for publicado. Compare aqui o resultado final com a sua aposta.
            </p>
          </div>

          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Status da janela</p>
            <p className={`mt-4 text-3xl font-black ${isOpen ? 'text-primary' : 'text-secondary'}`}>
              {isOpen ? 'Apostas abertas' : 'Apostas encerradas'}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {lockAt
                ? `Travamento configurado para ${new Date(lockAt).toLocaleString('pt-BR')}.`
                : 'Sem travamento definido ate o momento.'}
            </p>
          </div>
        </header>

        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}

        {loading ? (
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-300 backdrop-blur-xl">
            Carregando resultado oficial...
          </div>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <article className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              {hasOfficialResult ? (
                <div className="space-y-4">
                  {[
                    { label: 'Campeao', team: teamById.get(result?.champion_team_id ?? 0) ?? null },
                    { label: 'Vice-campeao', team: teamById.get(result?.vice_team_id ?? 0) ?? null },
                    { label: 'Terceiro lugar', team: teamById.get(result?.third_place_team_id ?? 0) ?? null },
                  ].map(({ label, team }) => (
                    <div className="rounded-bento border border-white/10 bg-black/20 p-4" key={label}>
                      <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{label}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{teamLabel(team)}</p>
                    </div>
                  ))}
                  {result ? (
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Atualizado em {new Date(result.updated_at).toLocaleString('pt-BR')}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-bento border border-dashed border-white/15 bg-black/15 p-6 text-sm leading-6 text-zinc-300">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
                    Aguardando resultado oficial
                  </p>
                  <p className="mt-3">
                    O Top 3 oficial ainda nao foi publicado. Assim que campeao, vice e terceiro lugar forem definidos, esta tela sera atualizada.
                  </p>
                </div>
              )}
            </article>

            <article className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Regra futura de pontuacao</p>
              <div className="mt-6 space-y-3">
                {FUTURE_TOP3_SCORING_RULES.map((rule) => (
                  <div className="rounded-bento border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-200" key={rule}>
                    {rule}
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}
      </div>
    </div>
  );
}
