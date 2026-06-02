import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { FeedbackBanner } from '../components/ui/FeedbackBanner';
import { SelectField } from '../components/ui/InputField';
import { useAuth } from '../context/AuthContext';
import {
  fetchTop3BetPage,
  getTop3DuplicateError,
  isMissingTop3SchemaError,
  saveTop3Prediction,
} from '../lib/top3';
import type { TeamRecord, Top3PredictionRecord, Top3Selection } from '../lib/types';

const EMPTY_SELECTION: Top3Selection = {
  championTeamId: '',
  viceTeamId: '',
  thirdPlaceTeamId: '',
};

function teamLabel(team: TeamRecord) {
  return team.flag_emoji ? `${team.flag_emoji} ${team.name}` : team.name;
}

function toFormSelection(prediction: Top3PredictionRecord | null): Top3Selection {
  if (!prediction) {
    return EMPTY_SELECTION;
  }

  return {
    championTeamId: String(prediction.champion_team_id),
    viceTeamId: String(prediction.vice_team_id),
    thirdPlaceTeamId: String(prediction.third_place_team_id),
  };
}

export default function MyBet() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [selection, setSelection] = useState<Top3Selection>(EMPTY_SELECTION);
  const [savedPrediction, setSavedPrediction] = useState<Top3PredictionRecord | null>(null);
  const [lockAt, setLockAt] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchTop3BetPage(user.id);
      setTeams(data.teams);
      setSavedPrediction(data.prediction);
      setSelection(toFormSelection(data.prediction));
      setLockAt(data.lockAt);
      setIsOpen(data.isOpen);
    } catch (error) {
      const fallback = 'Nao foi possivel carregar sua aposta agora.';
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : fallback;

      setErrorMessage(
        isMissingTop3SchemaError(error)
          ? 'A estrutura de aposta final no schema cravou ainda nao foi provisionada no Supabase. Aplique a migration antes de liberar esta tela.'
          : message || fallback,
      );
      setTeams([]);
      setSavedPrediction(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const duplicateError = useMemo(() => getTop3DuplicateError(selection), [selection]);

  const options = useMemo(
    () => [
      { label: 'Selecione uma selecao', value: '' },
      ...teams.map((team) => ({
        label: teamLabel(team),
        value: String(team.id),
      })),
    ],
    [teams],
  );

  const savedSummary = useMemo(() => {
    if (!savedPrediction) {
      return null;
    }

    const teamById = new Map(teams.map((team) => [team.id, team]));

    return {
      champion: teamById.get(savedPrediction.champion_team_id) ?? null,
      vice: teamById.get(savedPrediction.vice_team_id) ?? null,
      third: teamById.get(savedPrediction.third_place_team_id) ?? null,
    };
  }, [savedPrediction, teams]);

  const handleSave = async () => {
    if (!user) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selection.championTeamId || !selection.viceTeamId || !selection.thirdPlaceTeamId) {
      setErrorMessage('Escolha campeao, vice e terceiro lugar antes de salvar.');
      return;
    }

    if (duplicateError) {
      setErrorMessage(duplicateError);
      return;
    }

    if (!isOpen) {
      setErrorMessage('A janela de aposta ja foi encerrada e nao aceita mais edicoes.');
      return;
    }

    setSaving(true);

    try {
      const prediction = await saveTop3Prediction(user.id, selection);
      setSavedPrediction(prediction);
      setSelection(toFormSelection(prediction));
      setSuccessMessage(savedPrediction ? 'Sua aposta foi atualizada com sucesso.' : 'Sua aposta foi salva.');
    } catch (error) {
      const fallback = 'Nao foi possivel salvar sua aposta agora.';
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String(error.message)
          : fallback;
      setErrorMessage(message || fallback);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Minha aposta</p>
            <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white">
              Escolha sua aposta final
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Salve campeao, vice-campeao e terceiro lugar em uma unica aposta. As tres escolhas precisam ser diferentes e ficam editaveis so enquanto a janela estiver aberta.
            </p>
          </div>

          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Janela de aposta</p>
            <p className={`mt-4 text-3xl font-black ${isOpen ? 'text-primary' : 'text-secondary'}`}>
              {isOpen ? 'Aberta' : 'Encerrada'}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              {lockAt
                ? `Travamento configurado para ${new Date(lockAt).toLocaleString('pt-BR')}.`
                : 'Sem data de travamento definida ainda. A janela permanece aberta ate configuracao futura.'}
            </p>
          </div>
        </header>

        {errorMessage ? <FeedbackBanner message={errorMessage} tone="error" /> : null}
        {successMessage ? <FeedbackBanner message={successMessage} tone="success" /> : null}
        {duplicateError && !errorMessage ? <FeedbackBanner message={duplicateError} tone="info" /> : null}
        {!loading && !isOpen ? (
          <FeedbackBanner
            message="A janela de aposta esta bloqueada no momento. Sua aposta continua visivel, mas nao pode mais ser alterada."
            tone="info"
          />
        ) : null}

        {loading ? (
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-300 backdrop-blur-xl">
            Carregando sua aposta...
          </div>
        ) : teams.length === 0 ? (
          <div className="rounded-bento-lg border border-dashed border-white/15 bg-white/5 p-10 text-center text-sm leading-6 text-zinc-300 backdrop-blur-xl">
            Nenhuma selecao foi carregada ainda. Verifique se a migration foi aplicada corretamente e se o schema
            <code> cravou </code>
            esta exposto no Supabase antes de liberar esta tela.
          </div>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <div className="grid gap-5">
                <SelectField
                  disabled={!isOpen || saving || teams.length === 0}
                  id="top3-champion"
                  label="Campeao"
                  onChange={(event) =>
                    setSelection((current) => ({ ...current, championTeamId: event.target.value }))
                  }
                  options={options}
                  value={selection.championTeamId}
                />
                <SelectField
                  disabled={!isOpen || saving || teams.length === 0}
                  id="top3-vice"
                  label="Vice-campeao"
                  onChange={(event) =>
                    setSelection((current) => ({ ...current, viceTeamId: event.target.value }))
                  }
                  options={options}
                  value={selection.viceTeamId}
                />
                <SelectField
                  disabled={!isOpen || saving || teams.length === 0}
                  id="top3-third"
                  label="Terceiro lugar"
                  onChange={(event) =>
                    setSelection((current) => ({ ...current, thirdPlaceTeamId: event.target.value }))
                  }
                  options={options}
                  value={selection.thirdPlaceTeamId}
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-400">
                  {isOpen
                    ? 'Voce pode criar ou editar a aposta enquanto a janela estiver aberta.'
                    : 'A janela foi encerrada. A aposta segue visivel, mas nao aceita edicoes.'}
                </p>
                <Button disabled={!isOpen || saving || teams.length === 0} onClick={() => void handleSave()} type="button">
                  {saving ? 'Salvando...' : savedPrediction ? 'Atualizar aposta' : 'Salvar aposta'}
                </Button>
              </div>
            </article>

            <article className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Aposta salva</p>
              {savedSummary ? (
                <div className="mt-6 space-y-4">
                  {[
                    { label: 'Campeao', team: savedSummary.champion },
                    { label: 'Vice-campeao', team: savedSummary.vice },
                    { label: 'Terceiro lugar', team: savedSummary.third },
                  ].map(({ label, team }) => (
                    <div className="rounded-bento border border-white/10 bg-black/20 p-4" key={label}>
                      <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{label}</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        {team ? teamLabel(team) : 'Selecao nao encontrada'}
                      </p>
                    </div>
                  ))}
                  {savedPrediction ? (
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Atualizada em {new Date(savedPrediction.updated_at).toLocaleString('pt-BR')}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-bento border border-dashed border-white/15 bg-black/15 p-6 text-sm leading-6 text-zinc-400">
                  Nenhuma aposta salva ainda. Escolha suas selecoes e confirme para registrar a previsao.
                </div>
              )}
            </article>
          </section>
        )}
      </div>
    </div>
  );
}
