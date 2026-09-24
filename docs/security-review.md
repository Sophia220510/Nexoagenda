# Revisão de segurança

## Itens verificados

- Nenhuma chave real, `service_role` ou senha está versionada.
- Rotas privadas exigem sessão no proxy e autorização novamente em cada ação/página.
- IDs enviados pelo cliente passam por validação UUID e filtros de `business_id`.
- `role`, `business_id`, `user_id`, `ends_at` e flags administrativas não são aceitos das formas públicas.
- Tabelas privadas não possuem policy para `anon`; acesso público usa RPCs com retorno mínimo.
- FKs compostas garantem que appointment, customer, professional e service pertençam à mesma empresa.
- PROFESSIONAL não recebe policy genérica por membership: agenda, cliente, serviço e bloqueio dependem de seu `professionals.user_id`.
- RPCs `SECURITY DEFINER` usam `set search_path = ''` e nomes totalmente qualificados.
- A exclusion constraint resolve a race condition de double booking no PostgreSQL.
- Timestamps absolutos usam `timestamptz`; expediente recorrente usa `time` local e timezone da empresa.
- Serviços e profissionais são desativados, preservando histórico.

## Verificações automatizadas

- Testes unitários: duração padrão/override, duração completa, bloqueio, conflito, cancelamento, telefone e validações.
- `supabase/tests/isolation.sql`: auditoria transacional de RLS, IDOR, acesso anônimo, FKs cross-tenant e overlap.
- `npm audit`: dependências de produção e desenvolvimento.

A auditoria SQL foi executada no projeto hospedado `omgjtfdkpfopcnmyggxh` em 23/09/2026 e retornou `isolation audit passed`. A transação terminou em rollback.

## Riscos residuais antes de produção

- O rate limiter em memória não coordena múltiplas instâncias serverless.
- Ainda é necessário fazer teste E2E dos e-mails em staging e repetir a auditoria SQL a cada mudança estrutural.
- Logs e alertas devem ser enviados para um coletor sem dados sensíveis.
- Políticas devem ser reauditadas sempre que uma tabela ou papel for adicionado.
