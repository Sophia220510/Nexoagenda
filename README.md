# NexoAgenda

SaaS multiempresa de agendamento para barbearias e salões. Cada estabelecimento compartilha a aplicação e o PostgreSQL, mas seus dados privados são isolados por chaves estrangeiras compostas, Row Level Security (RLS) e autorização no servidor.

## Stack

- Next.js 16 com App Router, Server Components, Server Actions e Route Handlers
- React 19, TypeScript estrito e Tailwind CSS 4
- Supabase Auth, PostgreSQL, `@supabase/supabase-js` e `@supabase/ssr`
- Zod para validação reutilizável
- `date-fns`/`date-fns-tz` para limites de data no fuso da empresa
- Vitest para regras determinísticas

Não há ORM. A aplicação web nunca usa chave secreta: ela existe apenas no script local e explícito de bootstrap do ambiente demo.

## Instalação

Requisitos: Node.js 22+ recomendado, npm e um projeto Supabase. Docker Desktop ou Podman é necessário apenas para executar o Supabase local.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Preencha `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICAVEL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.local` está ignorado. Nunca coloque uma chave secreta no navegador ou no Git.

## Banco e migrations

A fonte de verdade está em `supabase/migrations`. Para desenvolvimento local:

```bash
npx supabase start
npx supabase db reset
```

Para vincular e aplicar ao projeto hospedado:

```bash
npx supabase login
npx supabase link --project-ref omgjtfdkpfopcnmyggxh
npx supabase db push
```

Confira o project ref antes de confirmar o push. `supabase/seed.sql` contém dados fictícios e deve ser usado somente localmente; `db reset` o executa automaticamente.

### Estado do projeto hospedado

As quatro migrations versionadas foram aplicadas ao projeto `omgjtfdkpfopcnmyggxh`. A auditoria transacional de isolamento foi executada no banco hospedado e passou sem deixar dados de teste. O `.env.local` permanece ignorado pelo Git.

## Master Admin e ambiente demo

O papel master é independente de `business_members` e fica em `platform_admins`. Usuários ativos dessa tabela entram em `/admin`, onde podem consultar todas as empresas, clientes e agendas. Alterações de empresa, profissional e serviço passam por RPCs específicas e geram registros em `admin_audit_logs`. Não há impersonação nem exclusões destrutivas.

O ambiente demonstrativo é criado de forma idempotente por um script executado somente no servidor/local:

```bash
npm run bootstrap:demo
```

Antes, preencha em `.env.local` `SUPABASE_SECRET_KEY` e as variáveis `MASTER_ADMIN_*`, `DEMO_OWNER_*`, `DEMO_LUCAS_*` e `DEMO_PEDRO_*` listadas em `.env.example`. Use credenciais escolhidas por você; o script não inventa nem imprime senhas. A chave secreta e as credenciais demo não devem ser configuradas como variáveis públicas, enviadas ao Git ou usadas pela aplicação em runtime.

O bootstrap cria/atualiza `barbearia-nexo-demo`, Rafael (OWNER), Lucas e Pedro (PROFESSIONAL), catálogo, durações individuais, jornadas, pausa recorrente, clientes fictícios e agendamentos futuros. Reexecutá-lo converge para o mesmo estado sem duplicar registros.

### Modelo

- `profiles`: extensão segura de `auth.users`; criada por trigger.
- `businesses`: tenant, slug público único, telefone e timezone.
- `business_members`: associação de usuário e empresa com papel `OWNER` ou `PROFESSIONAL`.
- `professionals`: profissional de negócio; `user_id` é opcional.
- `services`: preço em centavos e duração padrão.
- `professional_services`: serviços prestados, com overrides de preço/duração.
- `working_hours`: faixas locais recorrentes, permitindo turnos separados.
- `blocked_times`: intervalos absolutos indisponíveis.
- `recurring_blocks`: intervalos semanais fixos, como almoço.
- `customers`: clientes sem login; telefone único apenas dentro do tenant.
- `appointments`: horários absolutos, status e vínculos compostos ao mesmo tenant.
- `platform_admins` e `admin_audit_logs`: acesso master separado e trilha de alterações.

Todas as entidades privadas têm relação inequívoca com `business_id`. FKs compostas impedem combinar profissional, serviço ou cliente de empresas diferentes.

### Funções, triggers e constraints importantes

- `handle_new_user`: cria `profiles` após cadastro no Auth.
- `create_business_with_owner`: cria empresa e associação OWNER na mesma transação usando `auth.uid()`.
- `get_public_business`: retorna somente o catálogo público mínimo.
- `get_public_availability`: calcula slots no servidor e retorna apenas timestamps livres.
- `book_public_appointment`: valida recursos, duração, expediente, bloqueios, telefone e cria cliente/agendamento atomicamente.
- `set_updated_at`: mantém timestamps de alteração.
- `appointments_no_active_overlap`: exclusion constraint GiST sobre `professional_id` e `tstzrange`; status `CANCELLED` é excluído.
- `appointments_public_idempotency_uidx`: torna retries da mesma reserva idempotentes.

## Autorização e multiempresa

RLS está ativa em todas as tabelas públicas. Não há policy `anon` de leitura/escrita direta em tabelas privadas.

| Recurso | OWNER | PROFESSIONAL | Público |
| --- | --- | --- | --- |
| Empresa | lê/edita a própria | lê dados básicos da própria | somente RPC pública |
| Profissionais/serviços | gerencia os próprios | lê o perfil e serviços vinculados | somente catálogo filtrado |
| Horários | gerencia a equipe | lê os próprios | slots calculados por RPC |
| Bloqueios | gerencia a equipe | gerencia os próprios | sem acesso |
| Clientes | lê os próprios do tenant | somente clientes de seus appointments | sem acesso |
| Appointments | lê/atualiza os do tenant | somente os próprios | cria apenas por RPC validada |

As helpers RLS `is_business_member`, `is_business_owner` e `is_current_professional` são `SECURITY DEFINER`, têm `search_path` fixo e acesso revogado do papel `public`. Elas evitam recursão nas policies sem ampliar o acesso das consultas finais.

## Auth e rotas

- `/cadastro`, `/login`, `/esqueci-a-senha`, `/redefinir-senha`
- `/auth/callback` troca o código PKCE por sessão.
- `src/proxy.ts` renova cookies SSR e bloqueia acesso anônimo ao painel.
- Cada Server Action privada repete a autorização; o proxy não é a única defesa.
- Usuário sem membership segue para `/onboarding`.
- OWNER segue para `/painel`; PROFESSIONAL sem configuração segue para o assistente inicial e, depois, para `/painel/minha-agenda`; master segue para `/admin`.

No Dashboard do Supabase, configure Site URL e Redirect URLs para os domínios local e de produção, incluindo `/auth/callback` e `/redefinir-senha`.

## Disponibilidade e reserva

A granularidade central é de 15 minutos. O banco gera candidatos dentro de cada faixa de `working_hours`, usa o override do profissional quando presente e exige que toda a duração caiba na faixa. Depois remove candidatos que cruzam bloqueios ou appointments não cancelados.

`POST /api/public/book` não aceita `business_id` nem `ends_at`: deriva a empresa do slug e calcula o término. A garantia final contra double booking é a exclusion constraint do PostgreSQL, portanto duas requisições concorrentes não podem confirmar intervalos sobrepostos.

Há rate limit simples em memória e idempotência por UUID. Antes de produção distribuída, substitua o rate limit por armazenamento compartilhado (Vercel Firewall/Upstash, por exemplo) e adicione proteção anti-bot.

## Estrutura

```text
src/app/                    rotas, Server Actions e APIs
src/components/             UI e fluxos interativos
src/lib/auth.ts             guards e contexto atual
src/lib/supabase/           clientes browser, servidor e proxy
src/lib/validation.ts       schemas de entrada
src/lib/availability-engine.ts regras puras testáveis
supabase/migrations/        schema, RPCs, índices e RLS
supabase/tests/             auditoria SQL reproduzível
supabase/seed.sql           dados locais opcionais
```

## Verificação

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Com o Supabase local ativo, execute a auditoria de isolamento:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/isolation.sql
```

Ela cria Empresa A/B dentro de uma transação que termina em rollback e tenta deliberadamente ler UUIDs do outro tenant, acessar clientes/appointments como `anon`, combinar FKs entre tenants e criar intervalos simultâneos.

## Limitações atuais

- Convite/vínculo de novos logins profissionais ainda não possui interface; o bootstrap demonstra o vínculo e o banco suporta `professionals.user_id` opcional.
- Rate limiting é apenas best effort por instância.
- Não há cobrança, assinatura, WhatsApp automático, SMS, financeiro, estoque, fidelidade ou IA.
- Alteração de slug e exclusões destrutivas não são oferecidas.
- Antes de produção: configurar e-mails Auth, redirects, domínio, observabilidade, rate limiting distribuído, backup/PITR e testes E2E em ambiente de staging.
