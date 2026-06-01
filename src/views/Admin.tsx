import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Sprint3MatchStatus } from '../lib/types';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { InputField, SelectField } from '../components/ui/InputField';
import { useAuth } from '../context/AuthContext';
import { calculateMatchPoints, createMatch, getMatches, updateMatch } from '../lib/matches';
import type { Sprint3MatchRecord } from '../lib/types';

const statusOptions = [
  { label: 'Pendente', value: 'pendente' },
  { label: 'Ao vivo', value: 'ao_vivo' },
  { label: 'Finalizado', value: 'finalizado' },
  { label: 'Aguardando resultado', value: 'aguardando_resultado' },
] as const;

const emptyForm = {
  home_team: '',
  away_team: '',
  home_flag: '',
  away_flag: '',
  match_time: '',
  round: '',
  group_name: '',
  status: 'pendente' as Sprint3MatchStatus,
};

export default function Admin() {
  const { isAdmin } = useAuth();
  const [matches, setMatches] = useState<Sprint3MatchRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [savingNewMatch, setSavingNewMatch] = useState(false);
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);
  const [calculatingMatchId, setCalculatingMatchId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, { home: string; away: string; status: Sprint3MatchRecord['status'] }>>({});

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const rows = await getMatches();
      setMatches(rows);
      setScoreDrafts(
        rows.reduce<Record<string, { home: string; away: string; status: Sprint3MatchRecord['status'] }>>((accumulator, match) => {
          accumulator[match.id] = {
            home: match.home_score != null ? String(match.home_score) : '',
            away: match.away_score != null ? String(match.away_score) : '',
            status: match.status,
          };
          return accumulator;
        }, {}),
      );
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel carregar os jogos do admin.';
      setErrorMessage(message);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadMatches();
    } else {
      setLoading(false);
    }
  }, [isAdmin, loadMatches]);

  const matchesByRound = useMemo(
    () =>
      matches.reduce<Record<string, Sprint3MatchRecord[]>>((groups, match) => {
        groups[match.round] ??= [];
        groups[match.round].push(match);
        return groups;
      }, {}),
    [matches],
  );

  const handleCreateMatch = async () => {
    if (!form.home_team || !form.away_team || !form.match_time || !form.round) {
      setErrorMessage('Preencha mandante, visitante, horario e rodada antes de cadastrar o jogo.');
      return;
    }

    setSavingNewMatch(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await createMatch({
        home_team: form.home_team.trim(),
        away_team: form.away_team.trim(),
        home_flag: form.home_flag.trim() || null,
        away_flag: form.away_flag.trim() || null,
        match_time: new Date(form.match_time).toISOString(),
        round: form.round.trim(),
        group_name: form.group_name.trim() || null,
        status: form.status,
      });
      setForm(emptyForm);
      setSuccessMessage('Jogo cadastrado com sucesso.');
      await loadMatches();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel cadastrar o jogo agora.';
      setErrorMessage(message);
    } finally {
      setSavingNewMatch(false);
    }
  };

  const handleUpdateMatch = async (matchId: string) => {
    const draft = scoreDrafts[matchId];

    if (!draft) {
      return;
    }

    setUpdatingMatchId(matchId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await updateMatch(matchId, {
        status: draft.status,
        home_score: draft.home === '' ? null : Number(draft.home),
        away_score: draft.away === '' ? null : Number(draft.away),
      });
      setSuccessMessage('Jogo atualizado com sucesso.');
      await loadMatches();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel atualizar o jogo agora.';
      setErrorMessage(message);
    } finally {
      setUpdatingMatchId(null);
    }
  };

  const handleCalculatePoints = async (matchId: string) => {
    setCalculatingMatchId(matchId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await calculateMatchPoints(matchId);
      setSuccessMessage('Pontuacao calculada com sucesso para este jogo.');
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : 'Nao foi possivel calcular os pontos agora.';
      setErrorMessage(message);
    } finally {
      setCalculatingMatchId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background px-4 pb-28 pt-6 text-white md:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-300 backdrop-blur-xl">
            Esta area e exclusiva para administradores.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-6 text-white md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-bento-lg border border-secondary/20 bg-secondary/10 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Admin</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white">Gestao de jogos</h1>
        </header>

        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}
        {successMessage ? <FeedbackBanner message={successMessage} tone="success" /> : null}

        <section className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Cadastrar novo jogo</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <InputField id="admin-home-team" label="Mandante" onChange={(event) => setForm((current) => ({ ...current, home_team: event.target.value }))} value={form.home_team} />
            <InputField id="admin-away-team" label="Visitante" onChange={(event) => setForm((current) => ({ ...current, away_team: event.target.value }))} value={form.away_team} />
            <InputField id="admin-home-flag" label="Bandeira mandante" onChange={(event) => setForm((current) => ({ ...current, home_flag: event.target.value }))} value={form.home_flag} />
            <InputField id="admin-away-flag" label="Bandeira visitante" onChange={(event) => setForm((current) => ({ ...current, away_flag: event.target.value }))} value={form.away_flag} />
            <InputField id="admin-match-time" label="Horario" onChange={(event) => setForm((current) => ({ ...current, match_time: event.target.value }))} type="datetime-local" value={form.match_time} />
            <InputField id="admin-round" label="Rodada" onChange={(event) => setForm((current) => ({ ...current, round: event.target.value }))} value={form.round} />
            <InputField id="admin-group-name" label="Grupo" onChange={(event) => setForm((current) => ({ ...current, group_name: event.target.value }))} value={form.group_name} />
            <SelectField
              id="admin-status"
              label="Status"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as Sprint3MatchRecord['status'],
                }))
              }
              options={statusOptions.map((option) => ({ label: option.label, value: option.value }))}
              value={form.status}
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button disabled={savingNewMatch} onClick={() => void handleCreateMatch()} type="button">
              {savingNewMatch ? 'Cadastrando...' : 'Cadastrar jogo'}
            </Button>
          </div>
        </section>

        {loading ? (
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-300 backdrop-blur-xl">
            Carregando jogos...
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(matchesByRound).map(([round, roundMatches]) => (
              <section className="space-y-4" key={round}>
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Rodada</p>
                  <h2 className="mt-1 text-2xl font-black uppercase tracking-[0.08em] text-white">{round}</h2>
                </div>

                <div className="space-y-4">
                  {roundMatches.map((match) => {
                    const draft = scoreDrafts[match.id];

                    return (
                      <article
                        className="rounded-bento-lg border border-white/10 bg-white/5 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl"
                        key={match.id}
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                              {new Date(match.match_time).toLocaleString('pt-BR')}
                            </p>
                            <h3 className="mt-2 text-lg font-bold text-white">
                              {match.home_team} x {match.away_team}
                            </h3>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[620px]">
                            <InputField
                              id={`admin-home-score-${match.id}`}
                              inputMode="numeric"
                              label="Mandante"
                              onChange={(event) =>
                                setScoreDrafts((current) => ({
                                  ...current,
                                  [match.id]: { ...current[match.id], home: event.target.value },
                                }))
                              }
                              type="number"
                              value={draft?.home ?? ''}
                            />
                            <InputField
                              id={`admin-away-score-${match.id}`}
                              inputMode="numeric"
                              label="Visitante"
                              onChange={(event) =>
                                setScoreDrafts((current) => ({
                                  ...current,
                                  [match.id]: { ...current[match.id], away: event.target.value },
                                }))
                              }
                              type="number"
                              value={draft?.away ?? ''}
                            />
                            <SelectField
                              id={`admin-status-${match.id}`}
                              label="Status"
                              onChange={(event) =>
                                setScoreDrafts((current) => ({
                                  ...current,
                                  [match.id]: {
                                    ...current[match.id],
                                    status: event.target.value as Sprint3MatchRecord['status'],
                                  },
                                }))
                              }
                              options={statusOptions.map((option) => ({ label: option.label, value: option.value }))}
                              value={draft?.status ?? match.status}
                            />
                            <div className="flex items-end">
                              <Button
                                className="w-full"
                                disabled={updatingMatchId === match.id}
                                onClick={() => void handleUpdateMatch(match.id)}
                                type="button"
                              >
                                {updatingMatchId === match.id ? 'Salvando...' : 'Atualizar'}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button
                            disabled={(draft?.status ?? match.status) !== 'finalizado' || calculatingMatchId === match.id}
                            onClick={() => void handleCalculatePoints(match.id)}
                            type="button"
                            variant="secondary"
                          >
                            {calculatingMatchId === match.id ? 'Calculando...' : 'Calcular pontos'}
                          </Button>
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
    </div>
  );
}
