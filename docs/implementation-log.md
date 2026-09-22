# Registro de Implementacoes

Este arquivo e o registro operacional do projeto. Toda implementacao, correcao,
refatoracao, migration, ajuste de configuracao ou alteracao visual deve ser
registrada aqui.

## Protocolo Obrigatorio

Antes de iniciar qualquer alteracao:

1. Consultar este arquivo e os registros mais recentes.
2. Verificar o estado atual do worktree e as convencoes existentes.
3. Registrar o objetivo, o escopo, os riscos e a estrategia prevista.

Depois de concluir a alteracao:

1. Atualizar a mesma entrada com os arquivos modificados.
2. Registrar testes executados e seus resultados.
3. Registrar migrations, configuracoes externas ou etapas manuais pendentes.
4. Registrar riscos residuais e a decisao de deploy.

Padrao de data e hora: `YYYY-MM-DD HH:mm:ss -04:00`, horario de Toronto. O
registro deve ser objetivo, auditavel e escrito em ordem cronologica reversa.

## Entradas

### 2026-09-22 19:26:55 -04:00

- Status: concluido localmente em 2026-09-22 19:33:03 -04:00; deploy e configuracao Google pendentes.
- Solicitacao: diagnosticar o erro HTTP 500 do GeoIP e o aviso de descontinuacao do autocomplete do Google Maps reportados no console.
- Escopo: redirecionar configuracoes do endpoint `/api/geoip` hospedadas em outro hostname `vercel.app` para a origem atual; migrar os fluxos de autocomplete de busca e endereco das APIs Places legadas para o Places Autocomplete Data API; manter a consulta GeoIP sem cache e a interface/formularios existentes.
- Implementacao: `src/lib/utils/geo.ts` agora converte um endpoint `/api/geoip` configurado em hostname remoto `*.vercel.app` para a mesma origem do site, evitando o acoplamento a um deployment preview; o teste de regressao cobre o host reportado e conserva `cache: no-store`. `SearchInputWithSuggestions.tsx` e `AddressAutocomplete.tsx` migraram de `Autocomplete`, `AutocompleteService` e `PlacesService` para `AutocompleteSuggestion.fetchAutocompleteSuggestions()` e `Place.fetchFields()`, mantendo previsao de cidades/enderecos, selecao e bias geografico. Os dois menus mostram atribuicao oficial Powered by Google.
- Validacao: `npm run typecheck`, `npm test` (24 arquivos, 111 testes), ESLint direcionado aos cinco arquivos alterados, `npm run build` e `git diff --check` passaram. O build conserva o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`. A busca estatica nao encontrou chamadas restantes aos tres widgets/servicos legados migrados. O build regenerou `public/sitemaps/businesses-fallback.xml`; o script de sitemap foi executado ao final para retornar esse artefato ao estado-fonte.
- Configuracoes externas pendentes: habilitar Places API (New) no projeto Google Cloud e permitir seu uso na restricao da chave; publicar para que a resolucao GeoIP passe a usar `/api/geoip` da origem atual. Nao ha acesso aos logs/configuracao Vercel nesta sessao. Se a origem atual ainda responder 500 apos o deploy, consultar Vercel Function Logs para a causa de inicializacao/execucao. Nenhuma configuracao externa foi alterada.
- Riscos residuais: nao foi possivel validar a resposta remota do Vercel nem exercitar autocomplete com a chave real neste ambiente; a API Places nova falha fechada para sugestoes remotas se o pre-requisito de Cloud nao estiver configurado, mantendo texto/local fallback onde existente. `ERR_BLOCKED_BY_CLIENT` no endpoint `gen_204` permanece esperado quando extensoes de privacidade/adblock o bloqueiam.
- Fora do escopo: `maps.googleapis.com/maps/api/mapsjs/gen_204` bloqueado pelo cliente e tratado como bloqueio de extensao/navegador, nao defeito do site.

### 2026-09-22 19:14:33 -04:00

- Status: concluido localmente em 2026-09-22 19:15:57 -04:00; migration remota pendente.
- Solicitacao: encerrar o acesso direto ao backend legado de achadinhos, ja substituido pelo Marketplace.
- Evidencia remota fornecida pelo usuario: as tabelas `community_finds`, `community_find_votes`, `community_find_messages` e `community_find_reports` existem, possuem grants a `anon`/`authenticated`, e cada uma retornou zero registros.
- Escopo: migration forward/idempotente que remove privilegios de clientes nas quatro tabelas e nas RPCs especificas de achadinhos, sem apagar dados nem objetos; atualizar auditoria e registro.
- Implementacao: `supabase/migrations/00060_lock_retired_community_finds.sql` revoga todos os privilegios de `PUBLIC`, `anon` e `authenticated` nas quatro tabelas legadas e as permissoes de execucao das tres funcoes de achadinhos. Mantem os grants de `service_role`/`postgres` e nao apaga dados, tabelas, policies ou funcoes. O achado 8 de `docs/security-audit-2026-09-20.md` agora diferencia a interface aposentada do backend ainda presente.
- Validacao: `git diff --check` passou; revisao estatica da migration. O usuario reportou contagem zero nas quatro tabelas e grants atuais a `anon`/`authenticated`. Sem PostgreSQL/psql/Docker local, nao executei SQL nem validei a migration contra o banco.
- Migrations/configuracoes externas: aplicar `00060_lock_retired_community_finds.sql` no SQL Editor Supabase. Depois, confirmar que anon e authenticated recebem permissao negada nas quatro tabelas e na RPC `vote_community_find`, e que as rotas do Marketplace permanecem normais. A migration nao apaga nada e pode ser seguida por uma remocao fisica separada, apos inspecionar dependencias.
- Riscos residuais: a feature esta desativada na interface, mas codigo e objetos SQL legados permanecem no repositorio/banco; privilegios para `service_role` e `postgres` permanecem intencionalmente. A contagem zero e um resultado informado pelo usuario e pode mudar antes da aplicacao.
- Decisao de deploy: mitigation pronta localmente; o acesso de clientes em producao so sera bloqueado depois de aplicar a migration e verificar grants/policies efetivos.

### 2026-09-22 18:54:06 -04:00

- Status: concluido localmente em 2026-09-22 18:58:49 -04:00; deploy pendente.
- Solicitacao: impedir que a geolocalizacao aproximada resolvida pelo IP de um visitante seja servida a outro por cache compartilhado/CDN.
- Diagnostico: `api/geoip.ts` responde com `s-maxage=300` e `stale-while-revalidate=3600`; assim a chave compartilhada pela URL pode reutilizar dados de IP de outro visitante.
- Escopo: definir politicas no-store para browser e caches CDN no endpoint, evitar cache HTTP no fetch do cliente, cobrir ambos em teste automatizado e atualizar este registro e o achado 11 da auditoria.
- Implementacao: `src/lib/geoipCachePolicy.ts` centraliza `Cache-Control: private, no-store`, `CDN-Cache-Control: no-store`, `Vercel-CDN-Cache-Control: no-store`, `Pragma` e `Expires`; `api/geoip.ts` aplica esses cabecalhos antes de qualquer retorno. `src/lib/utils/geo.ts` envia `cache: no-store`, incluindo quando um endpoint customizado estiver configurado. `src/lib/geoipCache.test.ts` verifica a politica e a opcao do fetch.
- Validacao local: `npm run typecheck`, ESLint direcionado, `npm test` (24 arquivos, 110 testes), `npm run build` e `git diff --check` passaram. O build reportou o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`; o sitemap alterado pelo prebuild foi restaurado.
- Configuracao externa/risco residual: nenhuma alteracao de CDN externo. O endpoint deste projeto passa a impedir novos armazenamentos; respostas que o CDN armazenou com a politica antiga podem continuar disponiveis ate invalidacao ou expiracao do stale window. Um endpoint externo configurado controla os proprios cabecalhos de resposta, embora o cliente agora solicite `no-store`.
- Decisao de deploy: codigo pronto localmente. Apos publicar, invalidar o cache de `/api/geoip` se o CDN permitir; caso contrario, aguardar a expiracao das respostas antigas e confirmar os cabecalhos no dominio implantado.

### 2026-09-22 18:31:06 -04:00

- Status: concluido localmente em 2026-09-22 18:47:54 -04:00; migration remota pendente.
- Solicitacao: revogar acesso de ex-proprietarios a conversas apos transferencia de negocio e impedir que o novo proprietario herde historico antigo; avaliar o vinculo entre chats, contas e negocios.
- Diagnostico: tres caminhos de transferencia (duas RPCs SQL e endpoint admin) adicionam o novo dono como participante, sem remover participantes anteriores. O acesso a mensagens e controlado por `conversation_participants.user_id`; `business_id` e tambem armazenado como contexto comercial.
- Escopo: manter usuario/conta como principal de autorizacao e negocio como contexto; fechar conversas de negocio na troca de owner, remover participantes antigos e impedir novos membros/mensagens; preservar historico somente para o cliente iniciador; exibir encerramento nas interfaces popup e Perfil > Mensagens; corrigir dados legados transferidos.
- Riscos: funcoes SQL/PostgREST e policies efetivas podem divergir do historico versionado; limpeza de conversas antigas precisa distinguir clientes de donos. Transferencias devem permanecer atomicas e nao bloquear chats de Marketplace independentes do negocio.
- Decisao de modelo: a conta do usuario continua sendo a identidade de acesso, registrada em `conversation_participants.user_id`; o negocio continua associado como contexto (`business_id`) para identificar a origem da conversa e criar novos chats com o responsavel atual. Transferir um negocio nao transfere a identidade nem o historico.
- Implementacao: `supabase/migrations/00059_close_business_chats_on_transfer.sql` adiciona iniciador/encerramento, corrige conversas legadas com sinais de transferencia, encerra e remove os participantes antigos em toda troca de titularidade, bloqueia novos participantes e mensagens em chats fechados, e redefine as RPCs de criacao/transferencia sem herdar chats. `api/admin-users.ts` remove a inclusao do novo dono via API. `src/services/messages.ts`, `src/types/database.ts`, `src/contexts/MarketplaceChatContext.tsx`, `src/components/MarketplaceChatPopup.tsx`, `src/pages/user-profile/hooks/useInboxAndReviews.ts` e `src/pages/user-profile/components/MessagesTab.tsx` tratam chats fechados como somente leitura. `AdminUsersTab.tsx` e `OwnershipAdminTab.tsx` avisam sobre o efeito da transferencia. O achado 5 em `docs/security-audit-2026-09-20.md` foi atualizado.
- Comportamento: conversas antigas de negocio sao fechadas; o historico legado fica disponivel somente ao iniciador identificado pelo autor da primeira mensagem, sem participacao do antigo ou novo responsavel. Novos contatos do negocio criam/reutilizam uma conversa aberta com o dono atual. Conversas de anuncios do Marketplace nao sao alteradas pela transferencia do negocio.
- Validacao local: `npm run typecheck`, `npm test` (23 arquivos, 108 testes), ESLint direcionado aos arquivos de API/servicos/UI, `npm run build` e `git diff --check` passaram. O build reportou o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`.
- Migrations/configuracoes externas: nenhuma migration foi executada. Nao ha PostgreSQL local, `psql` ou Docker neste ambiente; a migration 00059 foi revisada estaticamente, nao executada em banco. Antes de publicar o frontend/API, revisar e aplicar em ordem as migrations pendentes 00056-00059 no ambiente apropriado, conferir schema/RLS efetivos e testar transferencias por claim, e-mail e endpoint admin; confirmar que ex-dono e novo dono nao leem/enviam no chat legado, que o cliente iniciador ainda le historico sem enviar, e que um novo contato cria chat com o dono atual.
- Riscos residuais: o backfill legado infere o cliente pelo autor da primeira mensagem, convencao usada pelos fluxos da aplicacao; conversas legadas criadas fora desse fluxo precisam de revisao. O banco remoto nao foi consultado nem alterado, portanto nao afirmar corrigido em producao antes da migration e dos testes de autorizacao.
- Decisao de deploy: codigo e migration prontos localmente; deploy bloqueado ate aplicacao e verificacao da migration no banco, incluindo as migrations de seguranca anteriores que ainda estejam pendentes.

### 2026-09-22 18:16:14 -04:00

- Status: concluido localmente em 2026-09-22 18:23:14 -04:00; migration remota pendente.
- Solicitacao: impedir coleta publica dos campos pessoais de profiles, em especial telefone e localizacao, mantendo os dados publicos estritamente necessarios ao produto.
- Diagnostico: policies versionadas permitem SELECT irrestrito na tabela `profiles`, que contem dados privados e publicos; varios fluxos publicos consultam diretamente essa tabela.
- Escopo: introduzir uma view de perfil publico com allowlist de colunas; restringir SELECT direto na tabela base a proprietario/admin; redirecionar consultas publicas de negocios, marketplace, mensagens, avaliacoes e achadinhos; atualizar relatorio de seguranca.
- Riscos: grants e policies reais de producao podem divergir das migrations. Policies de leitura permissivas adicionais podem reabrir acesso a usuarios autenticados se nao houver um teto restritivo. A view deve preservar os campos necessarios ao perfil publico do vendedor.
- Estrategia: migration aditiva que remove grants anonimos da tabela base, garante RLS de leitura privada e teto restritivo autenticado, e concede apenas a view publica; validar tipos, testes e diff localmente. Nao aplicar migration remota sem preflight de schema e grants.
- Implementacao: `supabase/migrations/00058_protect_private_profile_data.sql` remove a policy de leitura publica, revoga permissao anonima inclusive grants por coluna, limita a leitura da tabela base ao proprio usuario/admin com policy permissiva e teto restritivo, e expoe `id`, `name`, `avatar` e `created_at` pela view `public_profiles`. `src/services/profiles.ts`, `messages.ts`, `marketplace.ts`, `businesses.ts` e `communityFinds.ts` usam a view para leituras publicas; leitura de perfil completo e role continuam na tabela base sob RLS. `docs/security-audit-readonly.sql` ganhou verificacoes de grants/view e o achado 4 do relatorio foi atualizado.
- Validacao: `npm run typecheck`, `npm test` (23 arquivos, 108 testes), ESLint direcionado aos cinco services, `npm run build` e `git diff --check` passaram. Build gera o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`; sitemap alterado pelo prebuild foi restaurado.
- Migrations/configuracoes externas: nenhuma migration foi aplicada ao banco remoto. Aplicar `00058_protect_private_profile_data.sql` apenas depois de confirmar no SQL Editor a existencia de `public.is_admin()`, colunas e grants atuais; executar as verificacoes em `docs/security-audit-readonly.sql` apos a aplicacao.
- Riscos residuais: sem PostgreSQL local/psql/Docker, a migration nao foi executada nem testada contra grants/policies reais. Confirmar que anon nao le `profiles` nem `phone`/`location`, autenticado comum le somente a propria linha, admin le todas e ambos conseguem ler a view publica antes de promover o frontend. O deploy do frontend depende da view existir.
- Decisao de deploy: correcao pronta localmente; banco de producao nao esta protegido ate a migration ser aplicada e os quatro cenarios de leitura serem verificados.

### 2026-09-22 17:59:12 -04:00

- Status: concluido localmente em 2026-09-22 18:08:05 -04:00; migration remota pendente.
- Solicitacao: bloquear a leitura publica de negocios nao aprovados e impedir que o SSR por ID exponha eventos em rascunho/arquivados ou ligados a negocios nao aprovados.
- Diagnostico: a policy publica versionada permite SELECT de todas as linhas em businesses; o endpoint `api/ssr-dynamic.ts` usa service role e consulta eventos por ID sem filtro de status. A tabela `events` nao tem schema/RLS completo nas migrations versionadas.
- Escopo: impor limite de leitura RLS para negocios e eventos; manter acesso privado de proprietarios, admins e editores atribuídos; filtrar e validar status no endpoint SSR; adicionar regressao para os casos reproduzidos.
- Riscos: as migrations nao definem completamente a tabela `events`; habilitar RLS sem preservar os fluxos de escrita quebraria publicacao/edicao. Dados remotos nao serao consultados ou alterados.
- Implementacao: `supabase/migrations/00057_restrict_unpublished_content.sql` substitui o SELECT publico amplo de negocios e acrescenta ceilings RLS para tambem neutralizar policies permissivas manuais; anonimos veem apenas negocios aprovados e usuarios autenticados mantem acesso a negocios proprios, administrados ou aprovados. Ativa RLS em `events`, restringe leituras anonimas a eventos publicados de negocios aprovados (ou eventos sem negocio), preserva leitura/gestao privada para donos, admins e editores atribuidos, e concede grants compativeis com esses caminhos. `api/ssr-dynamic.ts` filtra e valida status/negocio associado mesmo com service role e marca as respostas como no-store. `src/lib/ssrDynamicSecurity.test.ts` reproduz cenarios publicados e privados. O relatorio de auditoria foi atualizado.
- Validacao: `npm run typecheck`, `npm test` (23 arquivos, 108 testes), ESLint direcionado e `npm run build` passaram. O build manteve o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`.
- Migrations/configuracoes externas: aplicar `00057_restrict_unpublished_content.sql` somente depois de confirmar o schema e as policies/grants existentes por consulta de leitura. Nenhuma migration foi aplicada ao banco remoto nesta tarefa.
- Riscos residuais: a tabela `events` nao tem definicao completa nas migrations versionadas e esta sem banco PostgreSQL local/psql/Docker para validar a migration. A migration assume os campos `status`, `owner_id` e `business_id` usados pelo codigo; confirmar colunas, RLS e comportamento dos fluxos com usuarios/editores/admins em producao antes da aplicacao. O no-store evita novas respostas SSR em cache, mas nao purga cache previamente gerado por deploys antigos.
- Decisao de deploy: codigo pronto para revisao; nao aplicar a migration nem considerar producao corrigida antes da preflight somente-leitura e da verificacao dos fluxos de escrita.

### 2026-09-22 17:42:35 -04:00

- Status: concluido localmente em 2026-09-22 17:46:22 -04:00; migration remota pendente.
- Solicitacao: impedir que proprietarios e editores alterem campos administrativos de negocios diretamente pela API.
- Diagnostico: policies RLS autorizam a edicao da linha do negocio, mas nao restringem por coluna `moderation_status`, metadados de revisao, selo de verificacao ou `average_rating`; a UI nao constitui controle de seguranca.
- Escopo: adicionar protecao no banco para moderacao, verificacao, nota agregada e titularidade; manter aprovacao administrativa, transferencia confiavel e recalculo automatico da nota.
- Riscos: uma validacao muito ampla poderia quebrar o fluxo de moderacao/verificacao ou o trigger de avaliacoes. As migrations nao contem definicao completa da tabela de pedidos de verificacao; production-schema.sql continua vazio.
- Implementacao: `supabase/migrations/00056_protect_business_admin_fields.sql` adiciona trigger BEFORE INSERT/UPDATE, limita campos administrativos a admin/service_role, normaliza novos negocios de usuarios comuns como pendentes e nao verificados, bloqueia mudanca de titularidade por nao-admin, grava autor/horario das decisoes de moderacao no banco, exige solicitacao aprovada e validade futura para verificacao, e protege `average_rating` com um marcador interno executado somente pelo trigger de avaliacoes. Adiciona policy de UPDATE para administradores, preservando o fluxo atual do painel autenticado. Atualiza `docs/security-audit-2026-09-20.md` para marcar o achado como corrigido localmente, sujeito a aplicacao e verificacao remotas.
- Validacao: `npm run typecheck`, `npm test` (22 arquivos, 104 testes) e `git diff --check` passaram. A migration SQL nao foi executada nem validada por PostgreSQL local porque este ambiente nao tem `psql`/Docker.
- Migrations/configuracoes externas: aplicar `00056_protect_business_admin_fields.sql` em dev e testar diretamente as escritas como anon, usuario comum, editor e admin antes de promover. Nenhuma migration foi aplicada ao Supabase remoto nesta tarefa.
- Riscos residuais: as definicoes completas de `business_verification_requests` e grants efetivos remotos nao estao versionados neste checkout. A migration usa `business_id` e `status`, colunas referenciadas pela migration `00024`; confirmar compatibilidade com schema atual antes de aplicar. Nao declarar producao protegida ate validar no banco.
- Decisao de deploy: codigo pronto para aplicar em dev; producao nao liberada ate completar testes de autorizacao e confirmar o schema remoto.

### 2026-09-22 17:33:59 -04:00

- Status: concluido em 2026-09-22 17:35:33 -04:00.
- Solicitacao: corrigir o XSS no JSON-LD do endpoint `api/ssr-dynamic.ts`.
- Diagnostico: `JSON.stringify` sozinho nao protege strings inseridas dentro de uma tag `<script>`; o texto `</script>` vindo de dados persistidos pode encerrar o bloco JSON-LD.
- Escopo: codificar caracteres que podem sair do contexto de script antes da interpolacao HTML e revisar o endpoint para garantir ausencia do literal `<` na serializacao.
- Riscos: minimo; os escapes Unicode sao interpretados como os mesmos caracteres pelo parser JSON/JSON-LD e nao alteram o dado apresentado semanticamente.
- Estrategia: introduzir helper puro para serializacao segura reutilizavel e usa-lo no endpoint legado; validar com typecheck, lint direcionado e revisao do diff.
- Implementacao: `src/lib/safeScriptJson.ts` converte caracteres de HTML/script para escapes Unicode; `api/ssr-dynamic.ts` usa o helper para todos os dados JSON-LD inseridos no HTML. O payload original e preservado semanticamente pelo parser JSON.
- Validacao: `npm run typecheck`, ESLint direcionado ao endpoint e helper, e `git diff --check` passaram. Nao rodei testes nem build nesta solicitacao.
- Documentacao: o achado 1 em `docs/security-audit-2026-09-20.md` agora registra a correcao local e sua validacao estatica; os outros achados de seguranca continuam abertos.
- Riscos residuais: nao validei o deploy remoto nem executei o antigo payload contra producao. A correcao local precisa ser publicada para proteger a rota implantada.
- Decisao de deploy: codigo pronto para revisao e envio; nao corrigir outros achados da auditoria neste escopo.

### 2026-09-20 21:10:28 -04:00

- Status: auditoria local concluida em 2026-09-20 21:13:18 -04:00; nenhuma correcao funcional aplicada.
- Solicitacao: auditoria aprofundada de seguranca, com problemas classificados por importancia.
- Escopo: migrations 00001-00055, RLS e grants, RPCs, autenticacao, APIs administrativas e publicas, SSR, mensagens, uploads, dependencias e configuracao de deploy.
- Estrategia: revisao estatica e reproducoes locais com dados simulados; sem alterar banco remoto ou enviar mensagens reais. Produzir relatorio e SQL somente de leitura para conferir o estado de producao.
- Limites: `supabase/production-schema.sql` esta vazio; as migrations nao comprovam os grants, triggers e policies atualmente instalados em producao.
- Entregas: `docs/security-audit-2026-09-20.md` (11 achados priorizados, evidencias, cenarios, correcoes e limites) e `docs/security-audit-readonly.sql` (inspecao remota de metadados sem alteracao de dados).
- Validacao: handler SSR real executado localmente com fetch simulado confirmou script injetado no HTML e retorno de evento draft; npm audit completo e somente producao reportaram zero advisories; git diff --check passou. Nenhum teste de escrita foi executado no banco remoto.
- Pendencias: confirmar schema e configuracao de producao, aplicar correcoes P1 e executar regressao de autorizacao com contas de teste em ambiente descartavel antes do deploy. A auditoria nao autoriza promover a versao como segura.

### 2026-09-20 20:54:29 -04:00

- Status: concluido em 2026-09-20 20:58:31 -04:00.
- Solicitacao: acelerar o carregamento do popup quando uma conversa possui muitas mensagens.
- Diagnostico: ao selecionar uma conversa, o popup buscava todo o historico em uma unica consulta e renderizava todas as mensagens imediatamente.
- Escopo: carregar somente as mensagens mais recentes no popup, permitir carregar mensagens antigas sob demanda e preservar a rolagem ao inserir o historico anterior; manter `Perfil > Mensagens` compativel.
- Riscos: a paginacao usa `created_at` como cursor; mensagens com o mesmo timestamp podem exigir uma consulta posterior se o volume for extremo. O historico completo do perfil nao sera alterado nesta etapa.
- Estrategia: adicionar uma funcao de pagina de mensagens com limite e cursor, usar uma pagina inicial de 50 mensagens no popup, adicionar estado de mensagens antigas e um controle acessivel no topo da conversa.
- Implementacao:
  - `src/services/messages.ts`: adiciona `getMessagePageForConversation`, limita a pagina inicial a 50 mensagens e retorna somente as colunas necessarias; a leitura completa existente do perfil permanece compativel.
  - `src/contexts/MarketplaceChatContext.tsx`: usa a pagina inicial, controla `hasMoreMessages` e carrega mensagens anteriores sem reiniciar a conversa.
  - `src/components/MarketplaceChatPopup.tsx`: adiciona o controle `Carregar mensagens anteriores` e preserva a posicao de rolagem ao inserir o historico antigo.
- Validacao: `npm run typecheck` passou; `npm test` passou com 22 arquivos e 104 testes; `npm run lint` passou; `npm run build` passou com 8 documentos pre-renderizados; `git diff --check` passou.
- Validacao manual: a pagina do anuncio foi recarregada no browser local apos o build e continuou renderizando sem erro visivel. O carregamento autenticado do popup precisa ser conferido com uma conta que tenha uma conversa longa.
- Migrations/configuracoes externas: nenhuma; a alteracao e somente de consulta e estado do frontend.
- Riscos residuais: o cursor usa `created_at`; em caso raro de muitos registros com o mesmo timestamp, a paginacao pode exigir uma consulta adicional. O build continua emitindo o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`.
- Decisao de deploy: pronto para teste autenticado e envio para `dev`.

### 2026-09-20 20:31:54 -04:00

- Status: concluido em 2026-09-20 20:44:35 -04:00.
- Solicitacao: impedir que mensagens enviadas a anuncios sejam misturadas com conversas do negocio e garantir que novas mensagens do negocio aparecam no popup global e em Perfil > Mensagens.
- Diagnostico: `getOrCreateConversation` filtrava somente pelos participantes e ignorava `business_id`; alem disso, o Marketplace passava o negocio anunciante como contexto, permitindo reutilizar uma conversa do negocio. Historicos antigos ja misturados nao possuem metadado por mensagem para separacao automatica segura.
- Escopo: corrigir a selecao de conversas por contexto, separar novos chats de anuncios dos chats de negocios, preservar a listagem da inbox e documentar o tratamento do historico legado.
- Riscos: conversas legadas contaminadas permanecem como estao ate uma decisao de limpeza; separar automaticamente mensagens antigas poderia apagar ou ocultar comunicacoes legitimas.
- Estrategia revisada: adicionar `context_type` e `marketplace_listing_id` em `conversations`; a nova RPC validara participantes, dono do negocio/anuncio e criara conversas distintas para `business` e `marketplace`; a RPC antiga permanecera disponivel para compatibilidade, criando registros `legacy`. O frontend consultara apenas o mesmo contexto e rotulara historicos antigos como conversa legada, sem apagar ou reatribuir mensagens.
- Implementacao:
  - `supabase/migrations/00055_conversation_context.sql`: adiciona o contexto persistente, o vinculo opcional ao anuncio, indices e a RPC protegida `create_conversation_with_context`; preserva a RPC antiga para bundles em transicao.
  - `src/services/messages.ts`: seleciona e cria conversas por contexto, convertendo os metadados para o frontend.
  - `src/services/marketplace.ts`: cria chats de anuncios somente com `context_type = marketplace` e `marketplace_listing_id`, sem reutilizar o negocio anunciante.
  - `src/pages/BusinessPage.tsx`: cria chats diretos com `context_type = business` e abre a conversa global.
  - `src/contexts/MarketplaceChatContext.tsx` e `src/pages/user-profile/components/MessagesTab.tsx`: exibem conversas legadas como historicas, evitando apresenta-las como conversas atuais do negocio.
  - `src/types/database.ts`: adiciona os tipos de contexto e os campos persistidos.
- Validacao: `npm run typecheck` passou; `npm test` passou com 22 arquivos e 104 testes; `npm run lint` passou; lint direcionado passou; `npm run build` passou com 8 documentos pre-renderizados; `git diff --check` passou.
- Validacao manual: a pagina do anuncio foi recarregada no browser local e continuou renderizando sem tela branca ou erro visivel. O fluxo autenticado de envio precisa ser repetido apos aplicar a migration, pois o browser de validacao estava sem sessao.
- Migrations/configuracoes externas: aplicar `supabase/migrations/00055_conversation_context.sql` no projeto Supabase antes de publicar o bundle. Nao apagar nem reclassificar automaticamente conversas antigas; apos o deploy, uma conversa de negocio nova deve ser criada e aparecer tanto no popup quanto em Perfil > Mensagens.
- Riscos residuais: historicos antigos que misturaram anuncio e negocio continuam juntos, mas sao rotulados como `Conversa antiga`; separar mensagens antigas exige uma decisao de negocio ou metadado adicional. O build ainda emite o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`.
- Decisao de deploy: pronto para homologacao autenticada depois da migration; somente entao enviar o bundle para `dev`.

### 2026-09-20 20:11:37 -04:00

- Status: concluido em 2026-09-20 20:20:42 -04:00.
- Solicitacao: abrir o popup pelo icone de mensagens do header, permitir escolher qualquer conversa disponivel e incluir conversas iniciadas em paginas de negocios, alem das conversas de anuncios.
- Diagnostico: o popup atual aceitava somente o contexto de um anuncio e o header redirecionava diretamente para o perfil; as conversas de negocios ja estavam persistidas em `conversations`, mas nao eram carregadas no popup.
- Escopo: carregar conversas e perfis parceiros no contexto global, adicionar lista/selecionamento de chats, adaptar o popup para conversas com e sem anuncio, conectar os icones de mensagens desktop/mobile e abrir conversas de negocios pelo mesmo painel.
- Riscos: conversas antigas sem `business_name` precisam de um rotulo generico; a consulta de parceiros adiciona uma leitura compacta de perfis ao abrir o inbox, sem carregar mensagens ate o usuario selecionar uma conversa.
- Estrategia: reutilizar `getConversationsForUser`, `getConversationPartner`, `getProfilesByIds`, RLS e realtime existentes; manter uma unica assinatura para a conversa ativa e preservar `Perfil > Mensagens` como inbox completo.
- Implementacao:
  - `src/contexts/MarketplaceChatContext.tsx`: inbox global, selecao de conversas, parceiros, leitura, envio e realtime para qualquer `conversation_id`.
  - `src/components/MarketplaceChatPopup.tsx`: lista de chats, conversa ativa, retorno ao inbox, contexto de negocio/anuncio e fallback para conversas antigas.
  - `src/components/SiteHeaderAuthActions.tsx`: icone desktop abre o popup em vez de navegar diretamente para o perfil.
  - `src/components/MobileHeaderMenu.tsx`: item de mensagens do menu mobile abre o mesmo popup.
  - `src/pages/BusinessPage.tsx`: iniciar conversa com negocio abre o popup global, mantendo login e perfil como fluxos complementares.
- Validacao: `npm run typecheck` passou; lint dos arquivos alterados passou; `npm test` passou com 22 arquivos e 104 testes; `npm run build` passou com pre-renderizacao concluida; `git diff --check` passou.
- Validacao manual: a rota do anuncio foi recarregada no browser local e permaneceu renderizando sem erros; o teste de clique no header e envio precisa de sessao autenticada, que nao estava disponivel no browser.
- Migrations/configuracoes externas: nenhuma; a implementacao reutiliza as tabelas, RLS e canais realtime existentes.
- Riscos residuais: o build continua emitindo o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`; conversas antigas vinculadas a anuncios de negocio exibem o nome do negocio quando nao possuem metadado especifico do anuncio.
- Decisao de deploy: pronto para teste autenticado com conversas de negocio e Marketplace antes do envio para `dev`.

### 2026-09-20 20:06:05 -04:00

- Status: concluido em 2026-09-20 20:07:32 -04:00.
- Solicitacao: corrigir a tela branca ao enviar a primeira mensagem no popup do Marketplace.
- Diagnostico: `MarketplaceChatPopup` usa `Link`, mas estava montado fora de `AppRouter`; ao abrir o popup, o React Router tentava ler `basename` de um contexto inexistente.
- Escopo: mover somente a montagem visual do popup para dentro do router, mantendo o estado e a assinatura realtime no provedor global.
- Riscos: baixo; a alteracao nao muda persistencia, RLS, conversas, mensagens ou comportamento do perfil.
- Estrategia: manter `MarketplaceChatProvider` acima do router para preservar o chat entre navegacoes e renderizar `MarketplaceChatPopup` como filho de `AppRouter` para fornecer o contexto de navegacao ao `Link` do anuncio.
- Implementacao: `src/App.tsx` agora renderiza `MarketplaceChatPopup` dentro de `AppRouter`; o provedor continua acima do router e preserva o estado global do chat.
- Validacao: `npm run typecheck`, lint dos arquivos envolvidos, `git diff --check` e `npm run build` passaram; a suite do build passou com 22 arquivos e 104 testes.
- Validacao manual: a rota do anuncio foi recarregada no browser local e renderizou normalmente, sem a excecao de `basename`; o envio autenticado deve ser repetido com uma conta real.
- Migrations/configuracoes externas: nenhuma.
- Riscos residuais: permanece o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`; nao foi possivel testar o envio autenticado porque a sessao do browser estava deslogada.
- Decisao de deploy: correcao pronta para novo teste autenticado; apos confirmar o envio, pode ser enviada para `dev`.

### 2026-09-20 19:54:00 -04:00

- Status: concluido em 2026-09-20 19:59:02 -04:00.
- Solicitacao: confirmar o envio de mensagem ao vendedor e abrir uma conversa flutuante no canto inferior direito, mantendo o historico em Perfil > Mensagens.
- Diagnostico: `contactMarketplaceSeller` criava ou reutilizava a conversa e inseria a mensagem, mas a pagina apenas mostrava um aviso local; nao havia uma camada global para carregar o historico, responder ou acompanhar novas mensagens.
- Escopo: adicionar contexto global de chat autenticado, popup responsivo com contexto do anuncio, confirmacao por toast, carregamento do historico, envio de novas mensagens e assinatura realtime; preservar o fluxo existente do perfil.
- Riscos: uma segunda assinatura realtime pode existir quando o usuario abrir a mesma conversa no perfil; o popup sera limitado a uma conversa por vez e reutilizara as mesmas funcoes, RLS e `conversation_id`, sem criar uma tabela ou politica nova.
- Estrategia: integrar o popup no `AuthProvider`, abrir o chat somente apos o envio bem-sucedido, carregar a conversa pelo servico existente, marcar mensagens como lidas enquanto o popup estiver aberto e manter a area permanente do perfil inalterada.
- Implementacao:
  - `src/contexts/MarketplaceChatContext.tsx`: estado global autenticado, carregamento do historico, envio, leitura, realtime, minimizar e fechar.
  - `src/components/MarketplaceChatPopup.tsx`: popup responsivo no canto inferior direito no desktop e como painel inferior no mobile, com contexto do anuncio e link para a pagina do produto.
  - `src/pages/MarketplacePage.tsx`: confirmacao por toast e abertura do popup apos o primeiro envio bem-sucedido.
  - `src/services/marketplace.ts`: retorno da conversa criada/reutilizada e preservacao do negocio associado ao anuncio.
  - `src/App.tsx`: montagem global do provedor e do popup sem remover a caixa de entrada do perfil.
- Validacao: `npm run typecheck` passou; `npx eslint` nos arquivos alterados passou; `npm test` passou com 22 arquivos e 104 testes; `npm run build` passou com pre-renderizacao concluida; `git diff --check` passou.
- Validacao manual: a pagina do anuncio foi aberta no browser local sem autenticacao e continuou renderizando; o fluxo autenticado de envio, resposta e realtime precisa ser validado com uma conta real, pois a sessao disponivel estava deslogada.
- Migrations/configuracoes externas: nenhuma migration ou alteracao de RLS necessaria; a implementacao reutiliza `conversations`, `messages`, `conversation_participants` e as funcoes existentes.
- Riscos residuais: o build ainda emite o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`; o popup deve ser validado com dois usuarios para confirmar a entrega realtime no ambiente de desenvolvimento.
- Decisao de deploy: pronto para revisao funcional autenticada; nao promover sem validar o envio com vendedor e comprador em duas sessoes.

### 2026-09-20 19:44:05 -04:00

- Status: concluido em 2026-09-20 19:46:36 -04:00.
- Solicitacao: priorizar na pagina do anuncio outros anuncios do mesmo
  vendedor e usar anuncios da mesma regiao como fallback quando nao houver
  outro anuncio desse vendedor.
- Diagnostico: ja existia o bloco `Anuncios semelhantes`, mas a consulta atual
  filtrava somente categoria e cidade, sem distinguir vendedor ou fallback.
- Estrategia: consultar primeiro o mesmo vendedor visivel no anuncio, usando o
  negocio quando o anuncio estiver vinculado a negocio e o proprietario quando
  for anuncio pessoal; se vazio, consultar cidade, estado e pais, excluindo o
  anuncio atual.
- Riscos: o fallback pode misturar categorias, pois a prioridade solicitada e
  a regiao; a consulta continua limitada a quatro cards para preservar a
  densidade e o egress da pagina.
- Implementacao:
  - `src/services/marketplace.ts`: substituida a consulta generica por
    `getMarketplaceRelatedListings`, com prioridade para o mesmo negocio ou
    proprietario e fallback por cidade, estado e pais.
  - `src/pages/MarketplacePage.tsx`: bloco agora usa os rotulos `Mais anuncios
    de ...` ou `Anuncios da mesma regiao`, conforme a origem dos resultados.
- Validacao automatica:
  - `npm run verify`: passou; 22 arquivos e 104 testes.
  - `npm run lint`: passou sem erros.
  - `npm run build`: passou; permanece apenas o aviso tolerado e preexistente
    de top-level await em `src/pages/BusinessPageRoute.tsx:7`.
  - `git diff --check`: passou.
- Validacao manual: no localhost, o anuncio `Livro blah` exibiu `Mais anuncios
  de Testengocio` com outro anuncio do mesmo vendedor.
- Nenhuma migration ou etapa externa e necessaria.

### 2026-09-20 19:37:37 -04:00

- Status: concluido.
- Solicitacao: no detalhe do anuncio, mostrar a descricao imediatamente apos
  titulo, preco e demais dados principais, seguida do contato com o vendedor,
  tanto no desktop quanto no mobile.
- Implementacao: `src/pages/MarketplacePage.tsx` reordenado para resumo,
  descricao, contato, vendedor e denuncia; o mesmo fluxo responsivo e mantido
  em todas as larguras.
- Validacao executada: `npm run verify` passou; 22 arquivos e 104 testes.
  `npm run lint` e `git diff --check` tambem passaram. O browser localhost
  confirmou a ordem Resumo, Descricao e Fale com o vendedor.
- Risco residual: nenhum comportamento de dados, autenticacao ou envio de
  mensagem foi alterado.

### 2026-09-20 19:13:43 -04:00

- Status: em andamento.
- Solicitacao: melhorar a galeria do detalhe do anuncio com foto principal,
  miniaturas abaixo, setas de navegacao e fundo desfocado; permitir edicao
  completa das fotos no formulario de anuncio.
- Objetivo tecnico: tornar a navegacao visual previsivel em desktop e mobile,
  aproximar a experiencia do padrao de marketplaces maduros e impedir que a
  edicao de titulo e dados deixe as fotos fora de sincronia.
- Estrategia: manter uma unica foto principal responsiva, carregar as demais
  em miniaturas horizontais, usar o mesmo indice no visualizador ampliado e
  atualizar as imagens por uma RPC transacional validada pelo proprietario.
- Riscos: falha durante upload ou sincronizacao pode gerar arquivos orfaos;
  a limpeza sera feita somente depois da confirmacao do banco, e novos uploads
  serao removidos quando a salvacao falhar.
- Escopo previsto: `MarketplaceListingGallery`, formulario de edicao,
  servico de marketplace e uma migration de seguranca para substituir as
  imagens mantendo ordem e limite de oito fotos.
- Status final: concluido em 2026-09-20 19:29:06 -04:00.
- Implementacao:
  - `src/components/MarketplaceListingGallery.tsx`: galeria com uma foto
    principal, miniaturas horizontais abaixo, setas para anterior/proxima,
    navegacao por teclado, contador, zoom e fundo desfocado no detalhe e no
    visualizador ampliado.
  - `src/pages/MarketplacePage.tsx`: formulario de edicao agora carrega as
    fotos existentes e permite adicionar ate oito imagens, excluir, reordenar
    por arraste ou setas e definir a primeira como principal.
  - `src/services/marketplace.ts`: chamada para substituir a lista de URLs
    mantendo a ordem enviada.
  - `supabase/migrations/00054_replace_marketplace_listing_images.sql`: RPC
    `SECURITY INVOKER` que valida `auth.uid()`, limita a oito fotos e troca as
    linhas em uma operacao protegida por RLS.
- Validacao automatica:
  - `npm run typecheck`: passou.
  - `npm test`: passou; 22 arquivos e 104 testes.
  - `npm run lint`: passou sem erros.
  - `npm run build`: passou; permanece apenas o aviso tolerado e preexistente
    de top-level await em `src/pages/BusinessPageRoute.tsx:7`.
  - `git diff --check`: passou.
- Validacao manual: detalhe do anuncio aberto no localhost; galeria em duas
  colunas conferida, foto ampliada aberta e fundo desfocado visivel. O anuncio
  usado para teste possui apenas uma foto, portanto a navegacao entre varias
  fotos foi validada por codigo e typecheck, mas nao por clique com dados reais.
- Etapa manual pendente: aplicar a migration `00054` no projeto Supabase antes
  de usar a gravacao de fotos em producao. Sem ela, o formulario continua
  carregando, mas a RPC de sincronizacao retornara erro.
- Risco residual: se a limpeza de um arquivo antigo no Storage falhar depois
  da confirmacao do banco, a foto deixa de ser publicada, mas pode permanecer
  temporariamente como arquivo orfao no bucket; o frontend registra esse caso
  no console para limpeza posterior.

### 2026-09-20 18:54:50 -04:00

- Status: em andamento.
- Solicitacao: adaptar o detalhe do anuncio no desktop para uma composicao
  inspirada no Facebook Marketplace, com galeria maior a esquerda e informacoes
  do produto, vendedor e acoes a direita.
- Objetivo tecnico: melhorar a hierarquia de compra e reduzir a distancia entre
  foto, preco, contato e confianca no vendedor, sem alterar o comportamento
  mobile nem o contrato de dados.
- Estrategia: manter `MarketplaceListingGallery`, reorganizar o detalhe em uma
  grade desktop com coluna visual dominante e painel de informacoes, preservar
  uma coluna no mobile e manter anuncios semelhantes abaixo do bloco principal.
- Riscos: excesso de altura no painel direito, perda de legibilidade em telas
  menores e necessidade de conferir anuncios com uma ou varias fotos.
- Escopo: somente layout, responsividade e hierarquia visual; sem migration,
  alteracao de egress ou nova chamada ao Supabase.
- Status final: concluido em 2026-09-20 19:01:24 -04:00.
- Implementacao:
  - `src/pages/MarketplacePage.tsx`: detalhe reorganizado em duas colunas a
    partir de `lg`, com galeria dominante a esquerda e resumo, preco,
    localizacao, salvar, compartilhar, contato, vendedor, descricao e denuncia
    na coluna direita.
  - O mobile permanece em fluxo de uma coluna por meio do grid responsivo;
    anuncios semelhantes continuam abaixo do bloco principal.
- Validacao automatica:
  - `npm run verify`: passou; TypeScript OK, 22 arquivos de teste e 104 testes.
  - `npm run lint`: passou sem erros.
  - `npm run build`: passou; permanece apenas o aviso tolerado e preexistente
    de top-level await em `src/pages/BusinessPageRoute.tsx:7`.
- Validacao no browser local:
  - O detalhe real do anuncio carregou com coluna visual de aproximadamente
    `659px`, painel de informacoes de `360px` e imagem principal de `659x659px`
    no viewport `1138px`.
  - A arvore de acessibilidade exibiu titulo, preco, acoes, contato, vendedor,
    descricao e denuncia na nova ordem.
  - A galeria continuou abrindo pelo botao `Ampliar foto 1 de 1` e fechando com
    `Escape`.
  - Nenhum erro ou warning foi capturado no console durante o teste.
- Migrations/configuracoes externas: nenhuma.
- Riscos residuais: falta repetir a validacao visual final em 360, 375 e 390px
  com anuncios de varias proporcoes, varias fotos e sem foto. A galeria agora
  faz a foto unica ocupar toda a coluna e preserva o mosaico para varias fotos.
- Decisao de deploy: apto para homologacao no escopo desta alteracao; nao houve
  commit nem deploy automatico.

### 2026-09-20 18:32:05 -04:00

- Status: em andamento.
- Solicitação: ampliar a presença visual da foto dos anúncios no Marketplace,
  principalmente no mobile, e oferecer uma lupa/zoom no hover ou equivalente.
- Objetivo técnico: aumentar a área útil das imagens sem perder legibilidade,
  oferecer zoom por hover/foco no desktop e uma interação de ampliação por toque
  no mobile, com carregamento otimizado das imagens.
- Estratégia: extrair uma galeria reutilizável, reduzir a densidade da grade em
  telas grandes, usar proporções mais favoráveis no mobile e abrir uma galeria
  modal acessível no clique/toque.
- Documentação: este registro passa a ser a fonte obrigatória para as próximas
  implementações do projeto.
- Status final: concluido em 2026-09-20 18:45:34 -04:00.
- Implementacao:
  - `src/components/MarketplaceListingGallery.tsx`: galeria reutilizavel com
    imagem principal maior, `srcset` WebP, zoom visual em hover/foco, modal por
    clique/toque, navegacao por teclado, `Escape` e controles acessiveis.
  - `src/components/MarketplaceListingCard.tsx`: area da foto em proporcao
    `4/5` no mobile e `4/3` a partir de telas maiores, com `sizes` alinhado a
    grade de quatro colunas no desktop.
  - `src/pages/MarketplacePage.tsx`: galeria aplicada ao detalhe do anuncio e
    menor densidade nas grades de resultados, vendedores e negocios.
- Validacao automatica:
  - `npm run lint`: passou sem erros.
  - `npm run verify`: passou; TypeScript OK, 22 arquivos de teste e 104 testes.
  - `npm run build`: passou; o Vite manteve apenas o aviso tolerado e preexistente
    de top-level await em `src/pages/BusinessPageRoute.tsx:7`.
- Validacao no browser local:
  - `/marketplace` carregou com dois anuncios; as fotos observadas no viewport
    desktop mediram aproximadamente `254x191px` e usaram `srcset`.
  - O detalhe exibiu o botao `Ampliar foto 1 de 1`, abriu o modal acessivel e
    fechou corretamente com `Escape`.
  - Console do browser sem erros ou warnings capturados durante o teste.
- Migrations/configuracoes externas: nenhuma.
- Riscos residuais: a validacao visual final deve ser repetida em dispositivos
  reais ou emulado em 360, 375, 390 e desktop para conferir imagens de varias
  proporcoes e anuncios sem foto.
- Decisao de deploy: apto para homologacao no escopo desta alteracao; nao houve
  commit nem deploy automatico.
