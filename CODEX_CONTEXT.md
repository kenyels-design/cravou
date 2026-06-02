# Cravou! — Contexto do Projeto

## Stack
React + TypeScript + Vite + Tailwind + Supabase

## Banco
Supabase "Demos" compartilhado. Schema próprio: cravou.
- public.cravou_users — perfis (Sprint 1, não mexer)
- cravou.matches — jogos da Copa
- cravou.predictions — palpites dos usuários
- cravou.teams — seleções (mantida)

## Funções no banco
- cravou.is_admin() — verifica claim admin
- cravou.set_updated_at() — trigger de updated_at
- cravou.calcular_pontos(match_id) — calcula pontos

## Regras de negócio
- Apenas @camerite.com pode se cadastrar
- Pontuação: placar exato = 10pts, desfecho = 5pts, erro = 0pts
- Palpite editável apenas enquanto match.status = 'pendente'
- Admin: cadastra jogos, atualiza placares, calcula pontos

## Design system: Neon Bento Box Sports
- Fundo: #0A0A0A
- Cards: bg #141414, border #2A2A2A, radius 16px
- Primária Electric Lime: #CCFF00
- Secundária Cyber Pink: #FF007F
- Títulos: font-bold uppercase

## Navegação
Desktop: top nav — Home | Jogos | Ranking | Conquistas | Perfil
Mobile: bottom pill nav com 5 ícones

## Regras fixas
- NUNCA alterar Site URL do Supabase Auth
- NUNCA expor service_role key no frontend
- NUNCA criar tabelas em public (usar schema cravou)
- pnpm build deve passar antes de commitar
- Avatares: iniciais coloridas, nunca fotos geradas por IA
- CODEX_CONTEXT.md existe na raiz — sempre leia no início
