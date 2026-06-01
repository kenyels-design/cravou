import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { useAuth } from '../context/AuthContext';
import { getMatches, getMyPredictions, upsertPrediction } from '../lib/matches';
import type { Sprint3MatchRecord, Sprint3MatchStatus, Sprint3PredictionRecord } from '../lib/types';

type MatchFilter = 'todos' | 'ao_vivo' | 'pendente' | 'finalizado';

const filterLabels: Record<MatchFilter, string> = {
  todos: 'Todos',
  ao_vivo: 'Ao Vivo',
  pendente: 'Pendentes',
  finalizado: 'Encerrados',
};

const statusLabels: Record<Sprint3MatchStatus, string> = {
  pendente: 'Pendente',
  ao_vivo: 'Ao vivo',
  finalizado: 'Finalizado',
  aguardando_resultado: 'Aguardando resultado',
};

function statusTone(status: Sprint3MatchStatus) {
  if (status === 'finalizado') {
    return 'border-primary/30 bg-primary/10 text-primary';
  }

  if (status === 'ao_vivo') {
    return 'border-secondary/30 bg-secondary/10 text-secondary';
  }

  if (status === 'aguardando_resultado') {
    return 'border-rose-400/30 bg-rose-500/10 text-rose-200';
  }

  return 'border-white/10 bg-white/10 text-zinc-300';
}

function groupMatchesByRound(matches: Sprint3MatchRecord[]) {
  return matches.reduce<Record<string, Sprint3MatchRecord[]>>((groups, match) => {
    groups[match.round] ??= [];
    groups[match.round].push(match);
    return groups;
  }, {});
}

function matchesFilter(match: Sprint3MatchRecord, filter: MatchFilter) {
  if (filter === 'todos') {
    return true;
  }

  if (filter === 'finalizado') {
    return match.status === 'finalizado' || match.status === 'aguardando_resultado';
  }

  return match.status === filter;
}

function scoreText(match: Sprint3MatchRecord) {
  if (match.status === 'pendente') {
    return new Date(match.match_time).toLocaleString('pt-BR');
  }

  if (match.home_score == null || match.away_score == null) {
    return 'Resultado em atualizacao';
  }

  return `${match.home_score} x ${match.away_score}`;
}

export default function Matches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Sprint3MatchRecord[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Sprint3PredictionRecord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<MatchFilter>('todos');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalMatch, setModalMatch] = useState<Sprint3MatchRecord | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const loadData = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const [matchRows, predictionRows] = await Promise.all([getMatches(), getMyPredictions()]);

      setMatches(matchRows);
      setPredictions(
        predictionRows.reduce<Record<string, Sprint3PredictionRecord>>((accumulator, prediction) => {
          accumulator[prediction.match_id] = prediction;
          return accumulator;
        }, {}),
      );
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel carregar os jogos agora.';
      setErrorMessage(message);
      setMatches([]);
      setPredictions({});
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const groupedMatches = useMemo(
    () => groupMatchesByRound(matches.filter((match) => matchesFilter(match, activeFilter))),
    [activeFilter, matches],
  );

  const openPredictionModal = (match: Sprint3MatchRecord) => {
    const prediction = predictions[match.id];
    setModalMatch(match);
    setHomeScore(prediction ? String(prediction.home_score) : '');
    setAwayScore(prediction ? String(prediction.away_score) : '');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const closePredictionModal = () => {
    setModalMatch(null);
    setHomeScore('');
    setAwayScore('');
  };

  const handleConfirmPrediction = async () => {
    if (!modalMatch) {
      return;
    }

    if (homeScore === '' || awayScore === '') {
      setErrorMessage('Informe os dois placares antes de confirmar.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const prediction = await upsertPrediction(modalMatch.id, Number(homeScore), Number(awayScore));
      const isEditing = Boolean(predictions[modalMatch.id]);

      setPredictions((current) => ({
        ...current,
        [modalMatch.id]: prediction,
      }));
      setSuccessMessage(isEditing ? 'Seu palpite foi atualizado com sucesso.' : 'Seu palpite foi salvo com sucesso.');
      closePredictionModal();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel salvar o palpite agora.';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.10),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,0,127,0.12),_transparent_24%),linear-gradient(180deg,_rgba(16,18,38,0.95),_rgba(7,10,24,1))] px-4 pb-28 pt-6 text-white md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Jogos</p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white">
              Neon Bento Box Sports
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Acompanhe todos os confrontos, filtre por status e registre seus palpites placar a placar.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-bento-lg border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Jogos listados</p>
              <p className="mt-4 text-4xl font-black text-primary">{matches.length}</p>
            </div>
            <div className="rounded-bento-lg border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Palpites salvos</p>
              <p className="mt-4 text-4xl font-black text-secondary">{Object.keys(predictions).length}</p>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap gap-2 rounded-pill border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
          {(Object.keys(filterLabels) as MatchFilter[]).map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <button
                className={[
                  'rounded-pill px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                  isActive
                    ? 'bg-primary text-black shadow-[0_0_30px_rgba(204,255,0,0.32)]'
                    : 'text-zinc-300 hover:bg-white/10 hover:text-white',
                ].join(' ')}
                key={filter}
                onClick={() => setActiveFilter(filter)}
                type="button"
              >
                {filterLabels[filter]}
              </button>
            );
          })}
        </div>

        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}
        {successMessage ? <FeedbackBanner message={successMessage} tone="success" /> : null}

        {loading ? (
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-300 backdrop-blur-xl">
            Carregando jogos e palpites...
          </div>
        ) : Object.keys(groupedMatches).length === 0 ? (
          <div className="rounded-bento-lg border border-dashed border-white/15 bg-white/5 p-10 text-center text-sm leading-6 text-zinc-300 backdrop-blur-xl">
            Nenhum jogo encontrado para este filtro.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMatches).map(([round, roundMatches]) => (
              <section className="space-y-4" key={round}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Rodada</p>
                    <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-white">{round}</h2>
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{roundMatches.length} jogos</p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {roundMatches.map((match) => {
                    const prediction = predictions[match.id] ?? null;
                    const canEditPrediction = match.status === 'pendente';
                    const showRealScore = match.status === 'ao_vivo' || match.status === 'finalizado';

                    return (
                      <article
                        className="rounded-bento-lg border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
                        key={match.id}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                              {match.group_name ? `${match.group_name} · ` : ''}
                              {new Date(match.match_time).toLocaleString('pt-BR')}
                            </p>
                            <h3 className="mt-2 text-lg font-bold text-white">
                              {match.home_team} x {match.away_team}
                            </h3>
                          </div>

                          <span
                            className={`rounded-pill border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${statusTone(match.status)}`}
                          >
                            {statusLabels[match.status]}
                          </span>
                        </div>

                        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                          <div className="text-center">
                            <div className="text-4xl">{match.home_flag ?? 'H'}</div>
                            <p className="mt-2 text-sm font-semibold text-zinc-200">{match.home_team}</p>
                          </div>

                          <div className="rounded-bento border border-white/10 bg-black/25 px-4 py-3 text-center">
                            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                              {showRealScore ? 'Placar real' : 'Horario'}
                            </p>
                            <p className="mt-2 text-2xl font-black text-white">{scoreText(match)}</p>
                          </div>

                          <div className="text-center">
                            <div className="text-4xl">{match.away_flag ?? 'A'}</div>
                            <p className="mt-2 text-sm font-semibold text-zinc-200">{match.away_team}</p>
                          </div>
                        </div>

                        <div className="mt-6 rounded-bento border border-white/10 bg-black/20 p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Seu palpite</p>

                          {prediction ? (
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                              <p className="text-lg font-semibold text-white">
                                {prediction.home_score} x {prediction.away_score}
                              </p>
                              {prediction.points != null ? (
                                <span className="rounded-pill bg-primary px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-black">
                                  {prediction.points} pts
                                </span>
                              ) : (
                                <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">Sem pontuacao</span>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-zinc-400">Nenhum palpite salvo para este jogo.</p>
                          )}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm text-zinc-400">
                            {canEditPrediction
                              ? prediction
                                ? 'Seu palpite pode ser ajustado enquanto o jogo estiver pendente.'
                                : 'O jogo esta pendente e pronto para receber seu palpite.'
                              : showRealScore
                                ? 'Jogo em andamento ou encerrado. Compare o placar real com seu palpite.'
                                : 'Aguardando a definicao oficial do resultado deste jogo.'}
                          </p>

                          {canEditPrediction ? (
                            <Button onClick={() => openPredictionModal(match)} type="button">
                              {prediction ? 'Editar' : 'Palpitar'}
                            </Button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {modalMatch ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-bento-lg border border-white/10 bg-surface p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
            <p className="text-xs uppercase tracking-[0.25em] text-secondary">Palpite</p>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-[0.08em] text-white">
              {modalMatch.home_team} x {modalMatch.away_team}
            </h3>
            <p className="mt-2 text-sm text-zinc-300">
              Informe o placar previsto para confirmar seu palpite neste confronto.
            </p>

            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-end gap-4">
              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{modalMatch.home_team}</span>
                <input
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-center text-2xl font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => setHomeScore(event.target.value)}
                  type="number"
                  value={homeScore}
                />
              </label>

              <span className="pb-3 text-2xl font-black text-zinc-500">x</span>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{modalMatch.away_team}</span>
                <input
                  className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 px-4 text-center text-2xl font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  inputMode="numeric"
                  min="0"
                  onChange={(event) => setAwayScore(event.target.value)}
                  type="number"
                  value={awayScore}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button onClick={closePredictionModal} type="button" variant="ghost">
                Cancelar
              </Button>
              <Button disabled={saving} onClick={() => void handleConfirmPrediction()} type="button">
                {saving ? 'Confirmando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
