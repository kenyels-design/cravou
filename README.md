# Cravou App

Aplicacao interna para registrar a aposta no Top 3 final da Copa e consultar o resultado oficial.

## Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Supabase Auth
- Supabase PostgREST

## Variaveis de ambiente

Crie um arquivo `.env.local` com:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Nao exponha nem publique a `service_role key` no frontend ou na Vercel.

## Supabase

### Exposed schemas

Em `Supabase Dashboard > Data API > Exposed schemas`, confirme que estes schemas estao expostos:

- `public`
- `cravou`

### Clients Supabase

O projeto usa dois clients:

- `supabase`: auth e queries em `public`, incluindo `public.cravou_users`
- `supabaseCravou`: queries do fluxo Top 3 com `db: { schema: "cravou" }`

## Comandos

Instalar dependencias:

```bash
pnpm install
```

Desenvolvimento:

```bash
pnpm dev
```

Lint:

```bash
pnpm lint
```

Build:

```bash
pnpm build
```

## Operacao manual

Nesta fase, as operacoes administrativas sao feitas manualmente pelo Supabase SQL Editor:

- bloquear apostas
- reabrir apostas
- publicar resultado oficial
- consultar apostas
- consultar SQL futuro de pontuacao

Documentacao operacional: [docs/OPERACAO_CRAVOU.md](./docs/OPERACAO_CRAVOU.md)

## Deploy na Vercel

1. Importar o repositorio na Vercel.
2. Configurar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Manter os comandos padrao:
   - Install: `pnpm install`
   - Build: `pnpm build`
4. Publicar a aplicacao.

## Checklist antes de publicar

- `cravou` esta em `Exposed schemas`
- `VITE_SUPABASE_URL` aponta para o projeto correto
- `VITE_SUPABASE_ANON_KEY` esta configurada
- a `service_role key` nao foi adicionada no frontend nem na Vercel
- `pnpm lint` passou
- `pnpm build` passou
