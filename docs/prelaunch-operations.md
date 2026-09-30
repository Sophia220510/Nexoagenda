# Pré-lançamento NEXO Book — verificações operacionais

Este checklist complementa os testes automatizados. Ele não comprova configurações externas sem acesso aos respectivos painéis.

## Vercel

1. Abra o projeto Vercel já conectado a `Sophia220510/Nexoagenda`, sem criar outro projeto. Confirme `main` como Production Branch e compare o SHA do último deployment com `git rev-parse HEAD`.
2. Defina `NEXT_PUBLIC_SITE_URL` como a origem HTTPS canônica, sem caminho ou barra final. Configure também `NEXT_PUBLIC_SUPPORT_EMAIL` com endereço de suporte real. Preserve as variáveis Supabase existentes; nunca use prefixo `NEXT_PUBLIC_` na chave secreta.
3. Habilite Web Analytics no painel Vercel se o plano/projeto permitir. O componente está no código apenas em deployments Vercel. Não há Google Analytics ou pixel de anúncios nesta fase.
4. Abra `/`, `/login`, `/barbearia-nexo-demo`, `/barbearia-nexo-demo/agendar`, `/manifest.webmanifest`, `/robots.txt`, `/sitemap.xml` e uma URL inexistente. Confira códigos HTTP, canonical, OG e ícones.
5. Consulte Build Logs, Runtime Logs e rede do navegador após o deploy. O `manifest.webmanifest` deve ser revalidado em até cinco minutos; os ícones têm URLs versionadas `?v=2`.

## Domínio próprio

Na Vercel: Project → Settings → Domains → Add. Adicione o domínio comprado, siga os registros DNS exibidos pela Vercel no provedor, aguarde verificação e HTTPS. Escolha o domínio primário e atualize `NEXT_PUBLIC_SITE_URL`. Em Supabase Auth → URL Configuration, adicione o novo Site URL e os Redirect URLs de `/auth/callback`; mantenha a URL antiga só durante a transição. Reimplante e confirme canonical, sitemap, login, cadastro e reset. Não há domínio comprado/configurado por este repositório.

## Supabase, proteção de dados e recuperação

- Reexecute `supabase/tests/isolation.sql` em ambiente autorizado, em transação com rollback, após qualquer migration. Confirme que `anon` não lê clientes/agendamentos privados e tenant A não lê tenant B.
- Verifique no painel Supabase o plano, backups, retenção e PITR. Não presuma que PITR está ativo. Faça ensaio de restauração em ambiente separado antes de crescer a base.
- Revise Site URL, Redirect URLs, template de e-mail e entrega de mensagens de confirmação/reset. Nunca teste com senha ou dados de cliente real em logs.
- O limite de solicitações público atual é em memória e não coordena múltiplas instâncias serverless. Troque por limite distribuído antes de escalar ou se aparecer abuso.
- Política de Privacidade e Termos são textos iniciais de piloto; obtenha revisão jurídica e identidade/contato do responsável antes de escala comercial.

## PWA e atualização

Não existe service worker neste projeto: o aplicativo instalado exige rede e não armazena dados privados para uso offline. Em Android/iOS, teste instalação, nome, ícone normal/maskable, status bar e área segura. Para validar atualização: instale a versão A, faça um deploy B com texto visível alterado, feche/reabra e confirme a versão B. Quem já instalou o ícone antigo pode precisar remover e instalar novamente para atualizar o ícone do launcher; não limpe dados do navegador automaticamente.

## Agendamento ponta a ponta

Com conta demo ou staging autorizado, escolha serviço → profissional → data → horário → nome/telefone de teste → confirmar. Valide o registro criado, ausência de reserva duplicada, fallback de WhatsApp profissional → estabelecimento, URL `wa.me` e texto codificado. Não crie agendamentos falsos em estabelecimentos reais para fazer smoke test.
