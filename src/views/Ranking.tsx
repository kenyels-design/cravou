import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabaseClient';

interface TeamRanking {
  departamento: string;
  pontos_totais: number;
  membros_ativos: number;
}

export default function Ranking() {
  const [rankings, setRankings] = useState<TeamRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchRankings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('view_cravou_ranking_departamentos')
        .select('*')
        .order('pontos_totais', { ascending: false });

      if (error) {
        throw error;
      }

      setRankings((data as TeamRanking[]) ?? []);
    } catch (error) {
      console.error('Falha ao carregar ranking.', error);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRankings();

    const channel = supabase
      .channel('ranking-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cravou_predictions' }, () => {
        void fetchRankings();
        addToast('Ranking atualizado em tempo real.', 'info');
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [addToast, fetchRankings]);

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-6 text-white md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-bento-lg border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Ranking</p>
          <h1 className="mt-3 text-3xl font-black uppercase tracking-[0.08em] text-white">Classificacao por equipes</h1>
        </header>

        {loading ? (
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-300 backdrop-blur-xl">
            Carregando ranking...
          </div>
        ) : rankings.length === 0 ? (
          <div className="rounded-bento-lg border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-400 backdrop-blur-xl">
            Nenhum dado consolidado disponivel ainda.
          </div>
        ) : (
          <section className="overflow-hidden rounded-bento-lg border border-white/10 bg-white/5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            {rankings.map((team, index) => (
              <div
                className={`flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4 last:border-b-0 ${
                  index === 0 ? 'bg-primary/10' : ''
                }`}
                key={team.departamento}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white">{team.departamento}</p>
                    <p className="text-xs text-zinc-400">{team.membros_ativos} colaboradores ativos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-primary">{team.pontos_totais}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">pontos</p>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
