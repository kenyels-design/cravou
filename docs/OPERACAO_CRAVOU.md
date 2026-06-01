# Operacao Cravou

Estas operacoes sao feitas manualmente no Supabase SQL Editor.

## Bloquear apostas

```sql
update cravou.settings
set
  setting_value_text = '2026-07-10 18:00:00-03',
  updated_at = now()
where setting_key = 'top3_predictions_lock_at';
```

Se a chave ainda nao existir:

```sql
insert into cravou.settings (setting_key, setting_value_text)
values ('top3_predictions_lock_at', '2026-07-10 18:00:00-03')
on conflict (setting_key)
do update set
  setting_value_text = excluded.setting_value_text,
  updated_at = now();
```

## Reabrir apostas

```sql
update cravou.settings
set
  setting_value_text = null,
  updated_at = now()
where setting_key = 'top3_predictions_lock_at';
```

## Cadastrar ou atualizar o resultado oficial

Substitua `ADMIN_USER_UUID_AQUI` pelo `id` do admin em `public.cravou_users`.

```sql
insert into cravou.final_result (
  id,
  champion_team_id,
  vice_team_id,
  third_place_team_id,
  updated_by
)
values (
  true,
  1,
  2,
  3,
  'ADMIN_USER_UUID_AQUI'
)
on conflict (id)
do update set
  champion_team_id = excluded.champion_team_id,
  vice_team_id = excluded.vice_team_id,
  third_place_team_id = excluded.third_place_team_id,
  updated_by = excluded.updated_by,
  updated_at = now();
```

Consultar IDs das selecoes:

```sql
select id, name, fifa_code, display_order
from cravou.teams
where is_active = true
order by display_order, name;
```

## Consultar todas as apostas

```sql
select
  u.nome,
  u.departamento,
  tc.name as campeao,
  tv.name as vice,
  tt.name as terceiro,
  p.updated_at
from cravou.top3_predictions p
join public.cravou_users u
  on u.id = p.user_id
join cravou.teams tc
  on tc.id = p.champion_team_id
join cravou.teams tv
  on tv.id = p.vice_team_id
join cravou.teams tt
  on tt.id = p.third_place_team_id
order by u.nome;
```

## Calculo futuro de pontuacao

Regra planejada:

- Campeao certo: 10 pontos
- Vice-campeao certo: 7 pontos
- Terceiro lugar certo: 5 pontos
- Selecao no Top 3 em posicao errada: 3 pontos

```sql
select
  u.id,
  u.nome,
  u.departamento,
  tc.name as campeao_apostado,
  tv.name as vice_apostado,
  tt.name as terceiro_apostado,
  rc.name as campeao_oficial,
  rv.name as vice_oficial,
  rt.name as terceiro_oficial,
  (
    case when p.champion_team_id = r.champion_team_id then 10 else 0 end +
    case when p.vice_team_id = r.vice_team_id then 7 else 0 end +
    case when p.third_place_team_id = r.third_place_team_id then 5 else 0 end +
    case
      when p.champion_team_id in (r.vice_team_id, r.third_place_team_id) then 3
      else 0
    end +
    case
      when p.vice_team_id in (r.champion_team_id, r.third_place_team_id) then 3
      else 0
    end +
    case
      when p.third_place_team_id in (r.champion_team_id, r.vice_team_id) then 3
      else 0
    end
  ) as pontuacao_total
from cravou.top3_predictions p
join public.cravou_users u
  on u.id = p.user_id
join cravou.final_result r
  on r.id = true
join cravou.teams tc
  on tc.id = p.champion_team_id
join cravou.teams tv
  on tv.id = p.vice_team_id
join cravou.teams tt
  on tt.id = p.third_place_team_id
left join cravou.teams rc
  on rc.id = r.champion_team_id
left join cravou.teams rv
  on rv.id = r.vice_team_id
left join cravou.teams rt
  on rt.id = r.third_place_team_id
order by pontuacao_total desc, u.nome asc;
```
