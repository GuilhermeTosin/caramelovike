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

### 2026-10-12 11:19:35 -04:00

- Status: implementado localmente em 2026-10-12 11:20:46 -04:00.
- Solicitacao: no mobile, posicionar "Sou dono deste negocio", "Denunciar anuncio" e a data de atualizacao depois de "Compartilhar pagina", nessa ordem.
- Escopo: reorganizar esses controles apenas em viewports mobile e preservar a disposicao desktop e os mesmos handlers/condicoes atuais.
- Implementacao: criado um renderer responsivo para os controles. A instancia desktop continua na lateral; a instancia mobile aparece imediatamente apos o cartao de compartilhamento, ao fim do conteudo. A ordem mobile e compartilhamento, solicitacao de propriedade (quando disponivel), denuncia e data.
- Arquivos: `src/pages/BusinessPage.tsx` e este registro.
- Validacao: `npm run verify` passou com typecheck e 149 testes em 29 arquivos; `npx eslint src/pages/BusinessPage.tsx`, `npm run check:encoding` e `git diff --check` passaram. Validacao visual continua indisponivel devido ao bloqueio salvo do browser ao localhost.
- Migrations/configuracoes externas: nenhuma.
- Riscos residuais e deploy: local, sem commit/deploy. Os controles permanecem ocultos/visiveis por breakpoint para evitar duplicacao visual; nao foi feito teste manual de clique em navegador.

### 2026-10-12 11:14:38 -04:00

- Status: corrigido na pasta principal em 2026-10-12 11:16:54 -04:00.
- Solicitacao: corrigir a ordem dos elementos nas paginas de negocios mobile; "Compartilhar pagina" deve ser o ultimo elemento da pagina.
- Diagnostico: a primeira implementacao ficou apenas no worktree isolado de `dev`; a pasta principal usada para o localhost ainda tinha o cartao dentro da coluna lateral.
- Implementacao: extraido o cartao para um renderer responsivo; a instancia desktop permanece na lateral e a instancia mobile e exibida depois de todas as secoes de conteudo, incluindo negocios similares, antes do rodape global. Os breakpoints ocultam a instancia que nao corresponde ao viewport.
- Arquivos: `src/pages/BusinessPage.tsx` e este registro.
- Validacao: `npm run verify` passou com typecheck e 149 testes em 29 arquivos; `npx eslint src/pages/BusinessPage.tsx`, `npm run check:encoding` e `git diff --check` passaram. Tentativa de abrir o navegador foi bloqueada por uma preferencia de seguranca salva. O Vike iniciou temporariamente na porta 3001 porque a porta 3000 estava ocupada; o processo temporario foi encerrado. Validacao visual nao concluida.
- Migrations/configuracoes externas: nenhuma.
- Riscos residuais e deploy: codigo local sem commit/deploy. Confirmar visualmente em um preview mobile apos o usuario permitir acesso do browser ao localhost; nao assumir que um preview remoto recebeu esta alteracao.

### 2026-10-11 15:48:28 -04:00

- Status: migration aplicada em producao e dado verificado em 2026-10-11 15:53:34 -04:00.
- Solicitacao: corrigir a associacao de localidade do negocio `Tasca dos Maricas`, cujo cadastro diz Lisboa, mas estava ligado a Paço de Arcos.
- Implementacao: criada `00069_repair_lisbon_business_location.sql`. A migration identifica Lisboa na mesma combinacao de pais/regiao da localidade atual e atualiza somente o negocio de ID `38e5e404-cb81-4a5e-9af2-54b8b40e7452`, se nome, cidade, slug e localidade atual ainda corresponderem ao diagnostico. Exige uma unica localidade Lisboa canonica e aborta sem alteracoes se os dados divergirem; a reexecucao apos sucesso e segura.
- Arquivos: `supabase/migrations/00069_repair_lisbon_business_location.sql` e este registro.
- Validacao: `npm run check:encoding` e `git diff --check` passaram; SQL revisado estaticamente. O usuario confirmou `city = Lisboa`, `city_slug = lisboa`, `current_location = Lisboa` e `current_location_slug = lisboa` para o negocio corrigido. `npx supabase migration list --linked` mostrou Local e Remote iguais ate a versao `00069`.
- Migrations/configuracoes externas: migration `00069` aplicada manualmente no SQL Editor de producao; historico remoto reconciliado pelo usuario.
- Riscos residuais e deploy: correcao de dados confirmada. O arquivo de migration e este registro ainda precisam ser commitados/pushados para manter o repositorio alinhado ao banco remoto; nenhum deploy de codigo e necessario para a correcao dos dados.

### 2026-10-11 15:38:12 -04:00

- Status: corrigido localmente e validado em 2026-10-11 15:39:37 -04:00.
- Solicitacao: diagnosticar por que a cidade mais popular da secao Pelo mundo aparece como Paco de Arcos apesar de a maioria dos negocios pertencer a Lisboa.
- Diagnostico: havia um negocio aprovado com `city = Lisboa` e `city_slug = lisboa`, mas `location_id` associado a `business_locations` de Paco de Arcos. O snapshot agrupava por `city` e selecionava o rotulo da localidade do primeiro registro, permitindo que essa divergencia renomeasse o grupo inteiro; o link continuava apontando para Lisboa.
- Implementacao: `buildHomePublicSnapshot` agora usa o nome da localidade exibida para formar em conjunto a chave de agrupamento, o rotulo e o slug do link. Foi adicionado teste de regressao com um registro Lisboa/Paço divergente e 104 registros corretamente associados a Lisboa.
- Arquivos: `src/lib/homeSnapshot.ts`, `src/lib/homeSnapshot.test.ts` e este registro.
- Validacao: teste focado passou; `npm run verify` passou com typecheck e 149 testes em 29 arquivos; `npm run check:encoding` e `git diff --check` passaram. O build e a validacao visual no browser nao foram executados nesta etapa.
- Migrations/configuracoes externas: nenhuma alteracao remota. A linha com `location_id` inconsistente continua precisando de correcao no banco, apos identificar o negocio por `id`.
- Riscos residuais e deploy: local apenas; nao houve deploy. O snapshot agora separa grupos pelo nome canonico exibido, mas a associacao errada na linha do negocio nao e corrigida por esta mudanca de frontend.

### 2026-10-11 15:28:58 -04:00

- Status: historico de migrations reconciliado em producao.
- Solicitacao: alinhar o historico remoto do Supabase com as 68 migrations locais, que haviam sido aplicadas manualmente.
- Implementacao: o usuario executou `supabase migration repair` com status `applied` para as versoes `00001` a `00068`. A operacao registrou as versoes em `supabase_migrations.schema_migrations`; nao reaplicou o SQL das migrations.
- Validacao: a execucao final de `npx supabase migration list --linked` mostrou `Local` e `Remote` iguais para todas as versoes `00001` a `00068`, inclusive `00058`.
- Migrations/configuracoes externas: ledger de producao reconciliado. Nenhuma migration SQL ou deploy de codigo foi executado nesta etapa.
- Riscos residuais e deploy: nao executar `db push` sem antes revisar migrations novas e o preview; manter migrations aplicadas imutaveis e criar novas versoes para futuras alteracoes.

### 2026-10-11 15:09:26 -04:00

- Status: implementado e aplicado em producao em 2026-10-11 15:13:56 -04:00.
- Solicitacao: corrigir o privilegio EXECUTE indevido de anon na nova RPC de criacao de anuncio da migration 00063.
- Objetivo: manter a RPC acessivel a authenticated e revogar explicitamente EXECUTE de anon, tanto em instalacoes novas quanto no banco que ja recebeu a 00063.
- Implementacao: a migration 00063 agora revoga EXECUTE de public e anon antes de conceder a authenticated. A nova migration 00068 aplica a mesma restricao a bancos existentes, sem recriar ou modificar a funcao, e solicita reload do schema PostgREST.
- Arquivos: `supabase/migrations/00063_marketplace_business_page_featured_listings.sql`, `supabase/migrations/00068_revoke_anon_execute_marketplace_listing_rpc.sql` e este registro.
- Validacao: a assinatura da RPC foi comparada com o catalogo do banco de producao; `npm run check:encoding` e `git diff --check` passaram. O usuario aplicou a 00068 no Supabase de producao e confirmou `anon_can_execute = false` e `authenticated_can_execute = true`.
- Migrations/configuracoes externas: permissao corrigida em producao. A migration foi executada manualmente e continua sem registro em `supabase_migrations.schema_migrations`.
- Riscos residuais e deploy: reconciliar o historico de migrations antes de usar `supabase db push`; nao houve deploy de codigo.

### 2026-10-11 14:10:08 -04:00

- Status: corrigido localmente em 2026-10-11 14:12:45 -04:00.
- Solicitacao: corrigir o caso em que uma avaliacao removida continua visivel se a exclusao no banco confirma, mas a consulta de sincronizacao falha.
- Escopo: atualizar imediatamente o snapshot local de avaliacoes e a nota agregada apos a exclusao confirmada; indicar falha de sincronizacao e oferecer nova tentativa sem restaurar a avaliacao removida.
- Implementacao: apos `deleteReview` confirmar, a pagina remove a avaliacao do snapshot local, recalcula `averageRating` e a distribuicao exibida. `loadBusiness` informa sucesso/falha; se falhar, a pagina preserva o snapshot corrigido e mostra um aviso acessivel com a acao `Tentar sincronizar`. Uma leitura bem-sucedida substitui o snapshot com os dados atuais do servidor.
- Arquivos: `src/pages/BusinessPage.tsx`, `docs/business-pages-ssr-reaudit-2026-10-11.md`, `docs/business-pages-ssr-audit-2026-10-11.md` e este registro.
- Validacao: `npm run typecheck`, ESLint direcionado a `BusinessPage.tsx`, `npm run check:encoding` e `git diff --check` passaram. A suite automatizada nao foi executada; nao houve exclusao autenticada real. A reproducao anterior documentou o estado que esta mudanca endereca.
- Migrations/configuracoes externas: nenhuma. Nenhuma escrita remota.
- Riscos residuais e deploy: a nota local usa a lista de avaliacoes carregada ate a proxima sincronizacao. A nova resposta a falha nao foi simulada apos a implementacao e o deployment Vercel permanece sem smoke test; codigo local, sem commit/deploy.

### 2026-10-11 13:30:01 -04:00

- Status: reauditoria concluida em 2026-10-11 13:37:14 -04:00; um caso residual P2 pendente.
- Solicitacao: repetir a auditoria das quatro correcoes de paginas de negocios: hidratacao regional, falha de banco tratada como 404, avaliacoes excluidas e teste SEO desatualizado.
- Escopo e estrategia: revisar o worktree atual, gerar bundle de producao, executar testes/lint e validar SSR no handler real `api/ssr.js`. Testar hidratacao em regioes de tres letras no browser, simular falhas do Supabase e recarregamento de avaliacoes sem alterar dados reais, e executar o teste SEO com o endpoint de sitemap de negocios disponivel.
- Riscos e limites: requisicoes remotas somente de leitura; simulacoes isoladas no processo local. Nenhum commit, deploy ou migration. Preservar todas as alteracoes preexistentes.
- Resultado: os quatro cenarios originais passaram. Novo caso residual P2: delete de avaliacao confirmado seguido de erro no refetch preserva a avaliacao e a media antigas, mostra toast de sucesso e nao exibe o alerta de refresh porque `business` ainda existe.
- Validacao: build/typecheck, 29 arquivos/148 testes e lint global passaram. Browser com bundle novo confirmou `eng`, `idf` e `qc` sem erros de hidratacao; interacao e navegacao interna tambem passaram. Handler compilado retornou 503 sem noindex em cinco falhas simuladas e 404/noindex para slug realmente ausente. SEO completou 21 verificacoes, nenhuma ignorada, incluindo handler real de sitemap de negocios. Simulacao dos handlers de avaliacao confirmou atualizacao de 2 para 1 e de 1 para 0; refetch com falha reproduziu o P2 residual.
- Artefatos: `docs/business-pages-ssr-reaudit-2026-10-11.md`, atualizacao do relatorio original e deste registro. Aba/servidor temporarios encerrados, harness removido e sitemap gerado restaurado ao estado inicial.
- Verificacao final: `npm run check:encoding` e `git diff --check` passaram; o aviso preexistente de normalizacao CRLF/LF em `BusinessPage.tsx` nao apontou erro de whitespace. A porta do servidor de auditoria nao ficou em escuta.
- Migrations/configuracoes externas: nenhuma; nenhuma escrita remota ou exclusao real. Sem commit/deploy.
- Riscos residuais e liberacao: resolver o P2 residual e repetir smoke test no deployment Vercel antes de considerar o fluxo de avaliacao completamente aprovado.

### 2026-10-11 13:26:41 -04:00

- Status: corrigido localmente em 2026-10-11 13:28:21 -04:00.
- Solicitacao: corrigir o teste SEO SSR que depende de textos removidos da pagina do diretorio e para antes de verificar negocio/sitemap.
- Diagnostico: `assertDirectoryContent` exigia `Panorama do diretorio` e `Tipos de negocio`, textos ausentes da pagina atual. A execucao interrompia antes dos casos seguintes.
- Implementacao: removidas as expectativas de texto obsoletas. O helper verifica a ausencia da introducao generica antiga, a contagem atual de negocios publicados e um link SSR para negocio canonico, que tambem e usado na verificacao de detalhe.
- Arquivos: `scripts/check-seo-ssr.mjs`, `docs/business-pages-ssr-audit-2026-10-11.md` e este registro.
- Validacao: `node --check scripts/check-seo-ssr.mjs`, `npm run check:encoding` e `git diff --check` passaram. O teste SEO SSR completou 19 verificacoes, com 1 item ignorado: `/sitemaps/businesses.xml` nao e servido no Vike dev. O helper percorreu pagina de cidade e negocio, redirects, 404s e sitemap estatico. O servidor temporario foi encerrado.
- Migrations/configuracoes externas: nenhuma. O teste fez apenas requisicoes HTTP GET; nenhuma escrita no banco.
- Riscos residuais e deploy: corrigido somente no worktree local, sem commit/deploy. A verificacao do sitemap de negocios deve ser repetida em um host que sirva essa rota.

### 2026-10-11 13:24:16 -04:00

- Status: corrigido localmente em 2026-10-11 13:25:26 -04:00.
- Solicitacao: impedir que avaliacoes excluidas continuem visiveis e que a nota antiga seja mantida apos um recarregamento bem-sucedido do negocio.
- Diagnostico: `loadBusiness` conserva `current.reviews` e `current.averageRating` quando a resposta recente traz menos avaliacoes. Isso impede que a remocao confirmada pelo banco atualize a interface.
- Escopo: remover a preservacao baseada em contagem e usar o snapshot completo retornado pela consulta concluida com sucesso. Manter o payload SSR como fonte inicial para hidratacao, sem refetch imediato quando a rota coincide.
- Implementacao: removida a regra que preservava a lista e a nota anteriores quando a lista recarregada diminuia. A resposta atualizada substitui o snapshot completo, atualizando `reviews` e `averageRating`.
- Arquivos: `src/pages/BusinessPage.tsx`, `docs/business-pages-ssr-audit-2026-10-11.md` e este registro.
- Validacao: `npm run typecheck`, `npm test` (29 arquivos/148 testes), ESLint direcionado em `BusinessPage.tsx` e `npm run check:encoding` passaram. A hidratacao inicial segue sem refetch quando a rota corresponde ao payload SSR.
- Migrations/configuracoes externas: nenhuma. Nenhuma avaliacao real foi excluida ou alterada para testar.
- Riscos residuais e deploy: correcao local, sem commit/deploy; nao foi exercitada com uma exclusao real no browser ou no deployment Vercel.

### 2026-10-11 13:12:31 -04:00

- Status: corrigido localmente em 2026-10-11 13:17:45 -04:00.
- Solicitacao: evitar que falhas temporarias do Supabase sejam apresentadas como paginas de negocio inexistentes.
- Diagnostico: consultas de leitura do negocio, historico de slug, link curto e tombstones descartam `error`; `onBeforeRender` tambem captura falhas e continua como se a linha nao existisse, podendo produzir 404/410 indevido.
- Implementacao: os servicos de lookup canonico, por pais, ID, historico, link curto e tombstone agora propagam erros do Supabase. O SSR converte falhas dessas consultas em `render(503)`; so devolve 404/410 quando as consultas concluem sem erro. Rotas `/go/` seguem a mesma regra. Navegacao cliente mostra estado de indisponibilidade temporaria em vez de rotulo de pagina inexistente.
- Arquivos: `src/services/businesses.ts`, `src/services/businesses.read.test.ts`, `pages/app/+onBeforeRender.ts`, `src/pages/BusinessPage.tsx`, `src/pages/BusinessShortLink.tsx`, `docs/business-pages-ssr-audit-2026-10-11.md` e este registro.
- Validacao: teste direcionado passou (7 casos); `npm run build` passou com 29 arquivos e 148 testes; typecheck e ESLint dos arquivos alterados passaram. No handler SSR de producao local, Supabase simulado com HTTP 503 produziu HTTP 503, mensagem temporaria e robots `index,follow,max-image-preview:large`; slug ausente com banco funcional continuou HTTP 404 e `noindex,nofollow,noarchive`. `npm run check:encoding` e `git diff --check` passaram.
- Migrations/configuracoes externas: nenhuma. Testes nao alteraram dados do banco; simulacao interceptou somente fetches do processo local.
- Riscos residuais e deploy: correcao local, sem commit/deploy; comportamento ainda precisa ser confirmado no deployment Vercel. O aviso do build sobre top-level await em `BusinessPageRoute.tsx` permanece preexistente. Consultas nao essenciais de conteudo relacionado ainda podem retornar a pagina principal com dados parciais.

### 2026-10-11 13:03:10 -04:00

- Status: corrigido localmente em 2026-10-11 13:06:15 -04:00.
- Solicitacao: corrigir a hidratacao de paginas de negocios em regioes com codigos de tres letras, por exemplo `eng` e `idf`.
- Diagnostico: `pages/+onRenderClient.tsx` e `src/appRouteModules.ts` mantem detectores duplicados de rotas, ambos exigindo duas letras no codigo de regiao. O router aceita a rota de negocio com quatro segmentos e o servidor renderiza o detalhe; no cliente, o preload especifico e pulado, causando mismatch durante `hydrateRoot`.
- Escopo: compartilhar um unico reconhecedor das formas de rota de negocio suportadas, usa-lo no preload e no cliente antes da hidratacao, e adicionar testes para regioes de dois e tres caracteres e rotas negativas.
- Implementacao: criado `isBusinessRoutePath` para compartilhar a deteccao entre o preload das paginas do app e `onRenderClient`. O helper reconhece os formatos de rota efetivamente usados pelo router: pais/slug, pais/regiao/cidade/slug e preview privado; a deteccao nao restringe o codigo da regiao a duas letras.
- Arquivos: `src/lib/businessRoute.ts`, `src/lib/businessRoute.test.ts`, `src/appRouteModules.ts`, `pages/+onRenderClient.tsx`, `docs/business-pages-ssr-audit-2026-10-11.md` e este registro.
- Validacao: teste direcionado passou (12 casos); lint dos arquivos alterados passou; typecheck passou; `npm run build` passou com 28 arquivos e 141 testes. Browser com o bundle recem-gerado confirmou as rotas do Reino Unido (`/gb/eng/...`) e Franca (`/fr/idf/...`) renderizadas e sem erros/avisos no console. `npm run check:encoding` e `git diff --check` passaram.
- Migrations/configuracoes externas: nenhuma. Nenhum dado remoto foi alterado. Servidores temporarios foram encerrados e o sitemap regenerado pelo build foi restaurado.
- Riscos residuais e deploy: correcao local, sem commit/deploy; ainda nao testada no deployment Vercel. O P1 separado sobre respostas `404` quando o Supabase falha e outros achados da auditoria anterior permanecem fora deste escopo.

### 2026-10-11 12:58:03 -04:00

- Status: auditoria concluida; promocao para producao nao recomendada antes das correcoes P1.
- Solicitacao: revisar paginas de negocios, SSR e prontidao para producao.
- Escopo: revisao de codigo, build, lint, testes, handler real `api/ssr.js` com bundle de producao, browser e consultas somente de leitura no Supabase vinculado. Nenhuma alteracao funcional, commit, deploy ou escrita remota.
- Documentacao prevista e realizada: `docs/business-pages-ssr-audit-2026-10-11.md` detalha evidencias, prioridades, limitacoes e criterios de liberacao.
- Achados: P1 no preload/hidratacao de rotas com estado de tres letras; P1 ao converter falha temporaria do banco em HTTP 404/noindex; P2 ao preservar avaliacoes excluidas no estado da pagina. O teste SEO SSR tambem exige um texto removido do diretorio e precisa ser atualizado.
- Validacao: `npm run build` passou com 27 arquivos/129 testes e typecheck; `npm run lint` passou. SSR de tres negocios retornou 200 com H1, canonical e JSON-LD validos, sem campos publicos de proprietario. Redirects historicos e `/go` retornaram 301; caminho inexistente retornou 404. A simulacao de Supabase 503 retornou incorretamente 404. Browser reproduziu erros React 418/422 em Reino Unido/Franca, mas nao no carregamento canadense comparativo.
- Banco: confirmou-se por leitura a existencia das tabelas de reserva/historico curto, trigger de reserva na exclusao e prefixos `v_` no trigger de slug (estruturas de 00066/00067 instaladas). A tabela `supabase_migrations.schema_migrations` nao lista versoes; execucoes manuais nao sao comprovadas por esse registro. Isto atualiza o diagnostico de instalacao sem reescrever as entradas anteriores.
- Riscos residuais: operacoes autenticadas de escrita nao foram executadas no banco compartilhado; HTTP 410 nao foi exercitado com exclusao real, pois nao havia tombstones. O handler foi validado localmente, nao nos logs de uma nova publicacao Vercel. Build mantem aviso tolerado de top-level await.
- Artefatos de teste: servidores temporarios encerrados; o sitemap regenerado pelo build foi restaurado ao estado inicial, preservando as alteracoes locais preexistentes da migration 00067 e do registro. `npm run check:encoding` e `git diff --check` passaram apos documentar.

### 2026-10-11 12:35:38 -04:00

- Status: implementado localmente em 2026-10-11 12:36:23 -04:00.
- Solicitacao: corrigir erro PostgreSQL 42702 ao salvar edicao de negocio no ambiente dev.
- Diagnostico: o trigger `capture_business_slug_history`, introduzido na migration 00035, declara a variavel PL/pgSQL `old_business_slug` e tambem usa esse identificador na lista de colunas de `ON CONFLICT`; a referencia fica ambigua e faz o UPDATE da linha ser revertido.
- Implementacao: migration 00067 substitui a funcao do trigger, renomeia todas as variaveis locais com prefixo `v_` para evitar colisao com colunas usadas em `ON CONFLICT`, qualifica as referencias e preserva a atualizacao do historico e do destino canonico.
- Arquivos: `supabase/migrations/00067_fix_business_slug_history_ambiguity.sql` e este registro.
- Validacao: `npm run verify` passou (typecheck e 27 arquivos/129 testes); `npm run check:encoding`, `git diff --check` e ESLint dos arquivos de servico passaram. A migration foi revisada, mas nao executada localmente por falta de banco PostgreSQL de teste.
- Migrations/configuracoes externas: 00067 ainda NAO foi aplicada no Supabase dev; executar o SQL da migration no banco antes de retestar. Nenhuma escrita remota foi feita.
- Riscos residuais e deploy: a causa foi identificada no trigger instalado pela migration 00035. Os erros `ERR_BLOCKED_BY_CLIENT` do Google Maps e aviso de recurso preloaded nao causam a falha ao salvar. A protecao de URLs da migration 00066 permanece pendente se ainda nao tiver sido aplicada; nao publicar uma migration como aplicada sem executar no banco.

### 2026-10-11 12:19:10 -04:00

- Status: implementado localmente em 2026-10-11 12:25:00 -04:00.
- Solicitacao: impedir que URLs canonicas, historicas e links curtos de um negocio excluido sejam reutilizados por outro negocio; indicar a remocao com HTTP 410.
- Diagnostico remoto read-only: o projeto Supabase vinculado tem migrations ate 00065; `business_slug_history.business_id` e `business_short_links.business_id` referenciam `businesses(id)` com `ON DELETE CASCADE`; proprietarios podem excluir os proprios negocios. Contagens: 1304 negocios, 1304 links curtos, 2 historicos ativos.
- Escopo: adicionar tombstones de URL sem FK ou PII, trigger transacional para guardar rotas historicas, URL canonica atual e alias `/go/`, proteger verificacao de slugs e resolver as URLs aposentadas em SSR e navegacao cliente.
- Riscos e estrategia: manter redirects antigos enquanto o negocio existe; somente ao excluir, converter seus caminhos em reservas permanentes e responder 410. Aplicar a migration antes de publicar o cliente; nao executar SQL no banco remoto. Historicos apagados por exclusoes anteriores nao podem ser reconstruidos.
- Implementacao: migration 00066 cria tombstones sem FK para negocio, preserva os caminhos canonicos anteriores, canonicos atuais e aliases `/go/` antes dos deletes em cascata, registra alteracoes futuras de alias curto e impede reutilizacao de slugs reservados. O SSR retorna HTTP 410 com pagina explicativa; a navegacao cliente apresenta o mesmo aviso e links para continuar explorando.
- Arquivos: `supabase/migrations/00066_reserve_deleted_business_urls.sql`, `src/services/businesses.ts`, `src/components/BusinessRemovedNotice.tsx`, `src/pages/BusinessShortLink.tsx`, `src/pages/BusinessPage.tsx`, `pages/app/+onBeforeRender.ts`, `pages/_error/+Page.tsx`, `pages/+onRenderHtml.tsx`, `src/services/businesses.update.test.ts` e este registro.
- Validacao: ESLint dos arquivos alterados, `npm run check:encoding`, `git diff --check`, `npm run typecheck` e `npm run build` passaram; 27 arquivos de teste e 129 testes passaram. Build ainda exibe o aviso preexistente de top-level `await` em `src/pages/BusinessPageRoute.tsx:7`.
- Migrations/configuracoes externas: migration 00066 foi criada localmente, mas NAO foi aplicada no Supabase. Aplicar a migration no banco de destino antes de publicar o codigo para garantir a protecao transacional de URLs e respostas HTTP 410. Nenhuma escrita foi feita no banco remoto.
- Riscos residuais e deploy: URLs de negocios excluidos antes da instalacao da migration nao podem ser recuperadas automaticamente, pois os registros historicos ja foram apagados por cascata. Implementacao pronta para validar em dev apos aplicar a migration; nenhuma publicacao foi feita.

### 2026-10-11 11:06:43 -04:00

- Status: implementado localmente em 2026-10-11 11:12:58 -04:00.
- Solicitacao: atualizar a URL publica canonica do negocio quando o nome for alterado, mantendo o endereco antigo funcional.
- Diagnostico: a edicao atual preserva `businesses.slug`; a migration 00035 ja registra slugs/caminhos antigos e o resolvedor consulta esse historico para abrir o negocio no destino canonico atual.
- Escopo: gerar slug canonico unico a partir do novo nome apenas quando o nome realmente mudar; manter o link curto `/go/` independente; aproveitar o historico e redirecionamento existentes, sem criar migration.
- Implementacao: `updateBusiness` compara o novo nome com o valor atual e, somente quando mudou, grava um slug canonico derivado do nome. A geracao verifica slugs atuais e reservados no historico, acrescenta sufixo numerico em conflitos e falha sem gravar se nao encontrar candidato. Links curtos `/go/` nao sao alterados; o trigger existente registra a URL antiga e o SSR redireciona para a nova URL.
- Arquivos: `src/services/businesses.ts`, `src/services/businesses.update.test.ts` e este registro.
- Validacao: teste direcionado passou (3 testes); `npm run typecheck` passou; build passou com 27 arquivos e 126 testes; ESLint dos arquivos alterados, `npm run check:encoding` e `git diff --check` passaram. Build mantem o aviso preexistente de top-level `await` em `src/pages/BusinessPageRoute.tsx:7`.
- Migrations/configuracoes externas: nenhuma migration nova; nenhuma escrita no banco remoto. O redirecionamento antigo requer que a migration 00035, ja referenciada pelo projeto, esteja aplicada no banco utilizado.
- Riscos residuais e deploy: mudanca ainda local; validar em dev apos publicar o codigo. Nenhuma publicacao foi feita.

### 2026-10-10 17:22:36 -04:00

- Status: implementado localmente; migration 00065 pendente de aplicacao no banco.
- Solicitacao: remover `ownerId` e `ownerName` das respostas/objetos publicos de negocios, preservando os dados internos para titularidade e administracao.
- Diagnostico: consultas publicas e a RPC do diretorio incluiam identificadores do proprietario; alguns detalhes tambem eram enriquecidos com nome de perfil. A pagina do negocio usava `ownerId` no cliente para verificar titularidade e iniciar conversas.
- Implementacao: `toFrontend` agora omite os dados por padrao e exige opt-in explicito nas telas internas; selects publicos de negocios, eventos e destaques e os snapshots do diretorio nao incluem `owner_id`/`ownerName`; leituras administrativas e do painel autenticado mantem os campos.
- Banco: criada a migration `supabase/migrations/00065_hide_public_business_owner_details.sql`. Ela limita colunas selecionaveis por `anon`, remove `owner_id` dos itens da RPC publica do diretorio, restringe a chamada direta da funcao interna e adiciona RPCs autenticadas para verificacao de titularidade e criacao de conversa sem enviar o UUID do proprietario pelo cliente.
- Arquivos: `src/services/businesses.ts`, `src/services/events.ts`, `src/services/featured.ts`, `src/services/messages.ts`, `src/services/ownership.ts`, `src/pages/BusinessPage.tsx`, `src/lib/directorySnapshot.ts`, tipos e testes correspondentes, migration 00065 e este registro.
- Validacao: `npm run typecheck` passou; `npm test` passou (26 arquivos, 123 testes); `npm run build` passou; ESLint nos arquivos alterados passou; `npm run check:encoding` passou; `git diff --check` passou. O build manteve o aviso preexistente de top-level `await` em `BusinessPageRoute.tsx`.
- Pendencia: a migration nao foi aplicada a nenhum banco. Aplicar 00065 no banco de desenvolvimento antes de validar em runtime; sem ela, o acesso anonimo ao `owner_id` e as novas RPCs ainda refletem o estado anterior.
- Deploy: nao publicar ate aplicar e validar a migration em dev; nenhuma alteracao remota foi executada nesta tarefa.

### 2026-10-10 17:16:06 -04:00

- Status: concluido localmente em 2026-10-10 17:17:11 -04:00.
- Solicitacao: corrigir o HTTP 500 do localhost e voltar a permitir renomear um negocio existente no deployment `dev`.
- Diagnostico: o SSR do Vite recebe `react-router-dom/dist/index.js` CommonJS por causa de `ssr.noExternal` global, e falha com `ReferenceError: module is not defined`; o build de producao precisa continuar empacotando essa dependencia para a funcao Vercel. O fluxo de edicao ainda recalcula o slug canonico quando o nome muda, apesar de nome e identidade da URL serem conceitos independentes.
- Escopo: aplicar `noExternal` somente durante `vite build`, manter o slug canonico existente ao renomear e documentar validacao local/automatizada. Sem alterar banco, migrations ou deploy remoto.
- Estrategia: deixar o SSR de desenvolvimento resolver o pacote pelo caminho ESM nativo do Node; preservar o empacotamento SSR no build; manter a mudanca de nome no update sem regenerar nem gravar o slug canonico, conservando a URL publica e o alias curto separado.
- Implementacao: `ssr.noExternal` agora e aplicado somente no build, evitando que o servidor local avalie o entry CommonJS de `react-router-dom`. A edicao do nome preserva o slug canonico e a URL existentes; o link curto continua sendo alterado apenas quando solicitado explicitamente.
- Arquivos: `vite.config.ts`, `src/services/businesses.ts` e este registro.
- Validacao: localhost respondeu HTTP 200 para `/` e `/perfil`; `npm run build` passou com typecheck, 26 arquivos de teste e 121 testes; o bundle SSR de producao nao manteve imports externos de `react-router`/`react-router-dom`; `git diff --check` passou. O build conserva apenas o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx:7`.
- Migrations/configuracoes externas: nenhuma; nenhuma escrita ou alteracao foi feita no Supabase.
- Riscos residuais: o codigo precisa ser enviado e implantado em `dev` para testar o salvamento autenticado. A causa remota exata da falha anterior ainda nao foi capturada; se persistir apos o deploy, coletar a resposta de PATCH `/rest/v1/businesses` no Network e o erro `[updateBusiness]` do console.
- Decisao de deploy: apto para novo deployment em `dev`; validar que renomear altera o nome exibido, conserva a URL publica antiga e nao retorna erro. Nao promover a producao sem esse teste.

### 2026-10-10 17:11:04 -04:00

- Status: concluido localmente em 2026-10-10 17:12:52 -04:00.
- Solicitacao: adicionar ao dashboard administrativo uma opcao para ocultar completamente `Negocios em Destaque` da pagina inicial.
- Diagnostico: a home ativa e `HomeV2`; o SSR carrega placements independentemente de qualquer configuracao de visibilidade. O painel de destaques ja e o local de administracao das campanhas, e `search_settings` ja armazena configuracoes globais usadas pelo produto.
- Escopo: adicionar um controle administrativo persistente para visibilidade da secao, respeita-lo no HTML SSR e evitar buscar placements quando desativado. Preservar campanhas e dados cadastrados; nenhuma migration prevista.
- Estrategia: gravar um booleano com chave propria em `search_settings`, default ligado; expor estado e acao no hook/tab de destaques; passar o estado do SSR ate `HomeV2` e omitir integralmente a secao quando desligado.
- Implementacao: adicionado o controle acessivel de visibilidade na aba administrativa `Destaques`, com confirmacao visual e preservacao dos placements. A configuracao usa `search_settings`; o SSR transmite o booleano para `HomeV2` e deixa de consultar os placements quando a secao esta desativada.
- Arquivos: `src/services/homeSettings.ts`, `src/pages/user-profile/hooks/useFeaturedAdmin.ts`, `src/pages/user-profile/components/FeaturedPlacementsTab.tsx`, `src/pages/UserProfile.tsx`, `pages/app/+onBeforeRender.ts`, `pages/app/+Page.tsx`, `pages/+config.ts`, `src/renderer/pageContext.ts`, `src/App.tsx`, `src/pages/HomeV2.tsx` e este registro.
- Validacao: `npm run typecheck`, ESLint direcionado, `npm run build` (inclui 26 arquivos de teste e 121 testes) e `git diff --check` aprovados. Permanece o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx:7`.
- Migrations/configuracoes externas: nenhuma nova migration; utiliza `search_settings`, tabela ja usada pelas configuracoes globais do site. Nenhuma alteracao remota foi feita.
- Riscos residuais: a verificacao visual/interativa do toggle e da home no Preview ainda deve ser feita. Se a leitura da configuracao falhar, a visibilidade assume `true` para manter o comportamento atual.
- Decisao de deploy: enviar para `dev`, testar o toggle na aba `Destaques`, recarregar a home e confirmar que a secao some por completo; reativar e confirmar que as campanhas retornam.
- Riscos: a opcao depende da tabela `search_settings` e das mesmas permissoes ja utilizadas pelas configuracoes globais atuais; sem valor ou se a leitura falhar, a home permanece visivel por seguranca.

### 2026-10-10 17:03:57 -04:00

- Status: concluido localmente em 2026-10-10 17:06:45 -04:00.
- Solicitacao: corrigir a falha ao alterar o nome de um negocio existente pelo fluxo de edicao.
- Diagnostico: confirmado no codigo que o wizard validava o link curto `/go/...` em toda edicao e sempre o enviava para `updateBusiness`, mesmo sem alteracao. O servico atualizava `businesses` primeiro e, em seguida, validava/fazia upsert do alias; se a verificacao ou o upsert falhasse, retornava erro generico depois de a linha principal ja poder ter sido gravada. A mudanca do nome recalcula o slug canonico da URL publica; a migration `00035_business_slug_history.sql` registra caminhos anteriores para redirecionamento.
- Escopo: separar alteracoes do nome/slug canonico da alteracao opcional do link curto nos formularios do wizard e do perfil. Nao alterar regras de unicidade, banco, migration ou URLs quando o alias nao for editado.
- Implementacao: ambos os formularios agora mantem o link curto existente como baseline, pulam sua validacao e omitem-no do payload quando nao foi alterado. Alteracoes explicitas ao link continuam verificadas e salvas. `updateBusiness` aceita o campo explicito `shortSlug`, mantendo compatibilidade com chamadas antigas que usam `slug`.
- Arquivos: `src/pages/BusinessWizardPage.tsx`, `src/pages/user-profile/hooks/useBusinessManagement.ts`, `src/services/businesses.ts` e este registro.
- Validacao: `npm run typecheck`, ESLint direcionado, `npm test` (26 arquivos, 121 testes), `npm run build` e `git diff --check` aprovados. O build manteve apenas o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx:7`.
- Migrations/configuracoes externas: nenhuma; nao houve escrita no Supabase.
- Riscos residuais: a causa exata na linha/registro remoto nao foi reproduzida nesta sessao. Quando o nome muda, o slug canonico pode mudar; confirmar no Preview que o endereco antigo redireciona, pois isso depende de `00035_business_slug_history.sql` estar aplicada no banco usado.
- Decisao de deploy: enviar para `dev` e testar a alteracao do nome sem tocar no link curto; verificar o link antigo e o link curto `/go/...` antes de promover para producao.

### 2026-10-10 16:52:28 -04:00

- Status: concluido localmente em 2026-10-10 16:53:20 -04:00.
- Solicitacao: corrigir a navegacao dos cards de negocios em destaque na home e investigar negocio antigo aparecendo em `Recem-chegados a comunidade`.
- Diagnostico: cards de destaque nao passam `preloadedBusiness` nem antecipam o carregamento da pagina, ao contrario do carrossel recente. A lista SSR inicial e consumida sem normalizacao adicional de datas. `updateBusiness` ja descarta `created_at`/`createdAt`, mas isso nao restaura datas que versoes anteriores possam ter alterado.
- Escopo: alinhar links dos destaques ao fluxo pre-carregado; normalizar a lista inicial por data de criacao e ordenar datas ausentes por ultimo. Sem alterar dados ou migrations.
- Estrategia: passar estado de navegacao e handlers de prefetch aos cards de destaque, normalizar a inicializacao com `mergeRecentBusinesses` e pedir ao PostgREST datas nulas por ultimo.
- Implementacao: os cards de destaque agora passam `preloadedBusiness` e antecipam modulo/imagem no hover, foco ou pointer-down. A lista inicial recente e normalizada por `createdAt`; a consulta do indice solicita datas nulas por ultimo.
- Arquivos: `src/pages/HomeV2.tsx`, `src/services/businesses.ts` e este registro.
- Validacao: `npm run typecheck`, ESLint direcionado, `npm test -- src/lib/homeRecentBusinesses.test.ts` (3 testes) e `git diff --check` aprovados. Consulta somente de leitura ao indice publico encontrou zero negocios com `created_at` nulo.
- Migrations/configuracoes externas: nenhuma; nenhuma escrita no banco. A consulta ao Supabase foi somente leitura.
- Risco residual: o timestamp historico de um negocio alterado por uma versao anterior nao pode ser inferido com seguranca pelo frontend; o registro ainda pode ser classificado como recente ate identificarmos e restaurarmos sua data original.
- Decisao de deploy: enviar a `dev` e testar o card em destaque e a ordem do carrossel no Preview; para corrigir a data historica, identificar o negocio e recuperar a data verdadeira antes de qualquer update.

### 2026-10-10 16:42:00 -04:00

- Status: concluido localmente em 2026-10-10 16:42:57 -04:00.
- Solicitacao: corrigir o HTTP 500 da home no deployment Vercel, identificado pelo erro `ERR_MODULE_NOT_FOUND` para `react-router-dom/dist/index.js`.
- Diagnostico: a entrada SSR gerada em `dist/server/entries/pages_app.mjs` mantem `react-router-dom` como dependencia externa. A funcao serverless implantada nao contem o arquivo de entrada CJS `dist/index.js`, embora ele exista na instalacao local; por isso o erro ocorre apenas no runtime empacotado da Vercel.
- Escopo: ajustar somente o bundle SSR do Vite para incluir `react-router-dom` e `react-router`; nao alterar versoes, lockfile, banco de dados ou fluxo de roteamento.
- Estrategia: configurar `ssr.noExternal` para essas duas dependencias e validar o build, a ausencia dos imports externos no bundle e o handler SSR local.
- Implementacao: adicionada a configuracao `ssr.noExternal` para `react-router-dom` e `react-router`, evitando que a funcao serverless dependa dos arquivos externos ausentes no deployment.
- Arquivos: `vite.config.ts` e este registro.
- Validacao: `npm run build` aprovado (typecheck e 26 arquivos de teste; 121 testes passaram); `dist/server/entries/pages_app.mjs` nao contem import externo dessas dependencias; chamada local de `api/ssr.js` para `/` respondeu HTTP 200; `git diff --check` aprovado. Permanece o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx:7`.
- Migrations/configuracoes externas: nenhuma migration ou variavel de ambiente alterada.
- Riscos residuais: validar no Preview da Vercel, pois somente o runtime implantado confirma a correcao do empacotamento da funcao.
- Riscos: empacotar as dependencias no bundle SSR aumenta marginalmente o artefato da funcao; React permanece como dependencia externa/peer.
- Decisao de deploy: enviar a branch `dev` e conferir que a nova invocacao de `/` retorna HTTP 200 antes de promover para producao.

### 2026-10-10 16:27:14 -04:00

- Status: concluido localmente em 2026-10-10 16:27:59 -04:00.
- Solicitacao: investigar o erro `42501 permission denied for table profiles` durante o pre-render do Marketplace sem conceder leitura anonima aos perfis privados.
- Diagnostico: politicas antigas de `marketplace_listings`, imagens e denuncias consultam `public.profiles` diretamente para verificar administradores. A migration `00058_protect_private_profile_data.sql` revoga corretamente `SELECT` de `anon`, tornando essas politicas incompativeis. O frontend tambem mantem um fallback para consultar `profiles` quando a view publica falha.
- Escopo: criar migration incremental para substituir as verificacoes RLS do Marketplace por um helper `SECURITY DEFINER` sem argumento, limitado ao usuario atual; remover fallback publico para `profiles`. Nao conceder `SELECT` anonimo em dados de perfil.
- Estrategia: criar helper sem parametros com `search_path` vazio, permissao de execucao explicita para `anon` e `authenticated`, revisar politicas de leitura/gestao dos anuncios, imagens e denuncias; deixar falha da view publica como enriquecimento ausente, sem interromper os resultados.
- Implementacao: adicionado `public.current_user_is_admin()` como helper `SECURITY DEFINER` sem argumento; politicas de leitura/gestao do Marketplace deixaram de consultar `profiles` diretamente. O frontend nao tenta mais acessar `profiles` como fallback quando `public_profiles` falha e usa rotulo generico para o vendedor.
- Arquivos: `supabase/migrations/00064_marketplace_rls_current_admin.sql`, `src/services/marketplace.ts` e este registro.
- Validacao: `npm run typecheck`, `npx eslint src/services/marketplace.ts`, `npm test -- src/lib/marketplaceSnapshot.test.ts` (3 testes), revisao estatica das referencias a `profiles` e `git diff --check` aprovados. A migration nao foi executada remotamente; nao houve build ou teste contra o Supabase remoto.
- Migrations/configuracoes externas: aplicar manualmente `00064_marketplace_rls_current_admin.sql` no projeto Supabase conectado ao dev. Se esse projeto for compartilhado com producao, a mudanca RLS tera efeito em producao assim que aplicada.
- Riscos residuais: sem aplicar a migration, as politicas atuais continuam gerando o erro `42501`. O log enviado e do pre-render de `/marketplace`, cuja falha e capturada e ainda gera HTML; nao confirma nem corrige a causa do 500 de `/`, que exige o log de runtime dessa rota.
- Decisao de deploy: aplicar a migration no banco correto e implantar o codigo; antes de promover, validar `/marketplace` e obter o erro de runtime de `/` separadamente.

### 2026-10-10 16:16:11 -04:00

- Status: concluido localmente em 2026-10-10 16:16:44 -04:00.
- Solicitacao: corrigir a falha ao abrir um negocio pelo carrossel `Recem-chegados a comunidade` da pagina inicial.
- Diagnostico: os links do diretorio enviam o negocio ja carregado via estado de navegacao e pre-carregam o modulo/hero da pagina; o link do carrossel nao seguia esse padrao e deixava a navegacao mais dependente do carregamento assincrono apos o clique. A causa exata da tela de recuperacao nao foi confirmada por reproducao no browser nesta sessao.
- Escopo: alinhar o link do carrossel ao fluxo de navegacao usado no diretorio, sem alterar a URL canonica, o SSR ou as consultas de negocio.
- Estrategia: passar `preloadedBusiness` no estado do React Router e disparar o pre-carregamento da pagina e da imagem principal no hover, foco ou pointer-down.
- Riscos: dados pre-carregados sao apenas um seed visual; a pagina continua buscando o registro completo e pode corrigir o estado com os dados atuais. O bundle/hero pode ser solicitado antes do clique.
- Implementacao: o link do carrossel agora envia `preloadedBusiness` no estado de navegacao e usa o pre-carregamento da pagina e do hero no hover, foco ou pointer-down, seguindo o comportamento dos links do diretorio.
- Arquivos: `src/pages/HomeV2.tsx` e este registro.
- Validacao: `npm run typecheck`, `npx eslint src/pages/HomeV2.tsx`, `npm test -- src/lib/homeRecentBusinesses.test.ts` (3 testes) e `git diff --check` aprovados. Build completo e teste visual no browser nao foram executados nesta alteracao.
- Migrations/configuracoes externas: nenhuma; sem alteracao no banco.
- Riscos residuais: como a causa exata ainda nao foi reproduzida, validar o clique no carrossel em dev. Se a tela persistir, coletar o primeiro erro `[BusinessPageRoute]` do console para isolar eventual falha independente no render da pagina.
- Decisao de deploy: enviar para dev e testar o clique antes de promover para producao.

### 2026-10-10 16:10:47 -04:00

- Status: concluido localmente em 2026-10-10 16:12:37 -04:00.
- Solicitacao: melhorar as meta descriptions das paginas de negocio, que hoje terminam com reticencias apos truncamento.
- Diagnostico: `buildBusinessSeoDescription` junta nome, atividade, localizacao, descricao e um sufixo generico e aplica um limite fixo de 170 caracteres; `truncateText` sempre adiciona `...` quando corta.
- Escopo: alterar somente a descricao SEO dos negocios; preservar titles e demais metadados. Manter conteudo especifico do negocio quando couber, sem reticencias artificiais e sem ultrapassar o novo limite de 160 caracteres.
- Estrategia: priorizar o resumo nome/atividade/localizacao, usar a descricao limpa como complemento, encerrar em limite de frase quando possivel ou em palavra completa com pontuacao; usar chamada generica apenas quando nao houver descricao.
- Riscos: em descricoes longas, parte do texto original continuara fora da meta description; buscadores tambem podem gerar ou truncar snippets independentemente do HTML.
- Implementacao: meta descriptions agora priorizam nome, atividade e localizacao, usam a descricao do negocio como complemento e um texto de apoio apenas quando nao ha descricao. O limite passou a 160 caracteres; o corte respeita frases quando possivel ou palavras completas e finaliza com pontuacao, sem reticencias artificiais. Titles permanecem inalterados.
- Arquivos: `src/lib/seo/businessMeta.ts`, `src/lib/seo/businessMeta.test.ts` e este registro. O `npm run build` regenerou `public/sitemaps/businesses-fallback.xml`, que ja estava modificado antes desta tarefa.
- Validacao: teste direcionado `src/lib/seo/businessMeta.test.ts` (25 testes), ESLint direcionado, `git diff --check` e `npm run build` aprovados; build completo executou 26 arquivos de teste e 121 testes. O build ainda emite o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx:7`.
- Migrations/configuracoes externas: nenhuma; sem alteracao no banco.
- Riscos residuais: o Google pode reescrever ou truncar o snippet conforme a busca e o dispositivo; em descricoes longas, o restante continua disponivel na pagina, mas nao cabe na meta description.
- Decisao de deploy: pode seguir no mesmo deploy da aplicacao; nenhuma etapa manual.

### 2026-10-10 16:07:12 -04:00

- Status: concluido localmente em 2026-10-10 16:07:46 -04:00.
- Solicitacao: remover o bloco `Panorama do diretório` da pagina `/negocios`.
- Diagnostico: a pagina renderiza um resumo de quatro metricas a partir de `snapshot.insights`; esse bloco e independente das categorias, da navegacao geografica e dos resultados.
- Escopo: remover somente o resumo visual e o formatador de data que ele utiliza, preservando insights usados por outras secoes, filtros, listagem, breadcrumbs e SEO.
- Estrategia: remover a chamada `DirectorySummary` e sua implementacao, sem alterar o snapshot ou consultas do diretorio.
- Riscos: nenhum funcional esperado; nenhuma consulta ou metrica usada em outras partes sera removida.
- Implementacao: removidos o bloco `DirectorySummary` e seu formatador de data; o panorama nao aparece mais em nenhum nivel do diretorio. Categorias, resultados, breadcrumbs e metadados permanecem.
- Arquivos: `src/pages/BusinessDirectoryPage.tsx` e este registro.
- Validacao: `npm run typecheck`, `npx eslint src/pages/BusinessDirectoryPage.tsx` e `git diff --check` aprovados.
- Migrations/configuracoes externas: nenhuma; sem alteracao no banco.
- Riscos residuais: nenhum identificado. Nao houve teste visual no browser.
- Decisao de deploy: pode seguir no mesmo deploy da aplicacao; nenhuma etapa manual.

### 2026-10-10 16:04:40 -04:00

- Status: concluido localmente em 2026-10-10 16:05:51 -04:00.
- Solicitacao: impedir que a edicao de um negocio antigo o faca parecer recem-chegado na home e reduzir a espera dos logos ao avancar o carrossel.
- Diagnostico: os resultados iniciais e regionais sao mesclados preservando a ordem de cada origem, embora o fallback regional possa priorizar proximidade; a imagem do carrossel so e solicitada quando o respectivo negocio se torna ativo. A funcao generica de atualizacao tambem nao descarta explicitamente campos de data de criacao.
- Escopo: ordenar os negocios mesclados pela data imutavel de criacao, impedir que atualizacoes de perfil enviem `created_at`/`createdAt`, e antecipar o carregamento dos proximos logos sem pre-carregar todo o catalogo.
- Estrategia: manter a ordenacao decrescente por `createdAt` com desempate estavel; limpar os campos de criacao no payload de `updateBusiness`; pre-carregar e decodificar apenas os vizinhos do item ativo, com deduplicacao em memoria.
- Riscos: logos dos itens vizinhos sao baixados antes de serem exibidos, limitados a poucos itens para conter trafego; negocios sem uma data de criacao valida preservam sua ordem relativa.
- Implementacao: a lista unificada agora deduplica por ID e ordena pela data de criacao, ignorando a data de edicao. `updateBusiness` remove `created_at`/`createdAt` do payload. O carrossel pre-carrega e decodifica no maximo os dois proximos logos e o anterior, com cache de URLs na sessao.
- Arquivos: `src/lib/homeRecentBusinesses.ts`, `src/lib/homeRecentBusinesses.test.ts`, `src/pages/HomeV2.tsx`, `src/services/businesses.ts` e este registro.
- Validacao: `npm run typecheck`, `npm test -- src/lib/homeRecentBusinesses.test.ts` (3 testes), ESLint direcionado aos quatro arquivos TS/TSX e `git diff --check` aprovados.
- Migrations/configuracoes externas: nenhuma; sem alteracao no banco.
- Riscos residuais: ate tres logos vizinhos podem ser transferidos antes de sua exibicao; nao houve validacao visual no browser.
- Decisao de deploy: pode seguir no mesmo deploy da aplicacao; nenhuma migration ou etapa manual no Supabase.

### 2026-09-26 08:46:34 -04:00

- Status: concluido localmente em 2026-09-26 08:51:23 -04:00.
- Solicitacao: preservar filtros e localizacao ao retornar de um anuncio para os resultados do Marketplace.
- Diagnostico: os cards levam ao caminho canonico do anuncio sem estado de retorno, e o botao de volta sempre aponta para `/marketplace`, descartando parametros como `cidade`, `pais`, coordenadas e `raio`.
- Escopo: transportar a URL atual de uma navegacao iniciada dentro do Marketplace e reutiliza-la nos botoes de retorno do detalhe do anuncio; manter `/marketplace` como fallback para acesso direto.
- Estrategia: usar `location.pathname + location.search` no estado interno do React Router e aceitar no detalhe apenas um caminho local iniciado por `/marketplace`, sem alterar a URL canonica do anuncio nem o fluxo de voltar do navegador.
- Implementacao: os cards do Marketplace agora guardam a rota e a query de origem no estado de navegacao. O link de retorno no detalhe do anuncio e o botao na tela de anuncio indisponivel reutilizam esse destino; estado invalido ou acesso direto cai em `/marketplace`.
- Arquivos: `src/components/MarketplaceListingCard.tsx`, `src/pages/MarketplacePage.tsx` e este registro.
- Validacao: `npm run typecheck`, `npx eslint src/components/MarketplaceListingCard.tsx src/pages/MarketplacePage.tsx` e `git diff --check` aprovados. Nao foi feito teste visual no browser.
- Migrations/configuracoes externas: nenhuma; sem alteracao no banco.
- Riscos residuais: a preservacao depende de abrir o anuncio por um card dentro do Marketplace; acessos diretos usam o fallback `/marketplace`. Decisao de deploy: pode seguir no mesmo deploy da aplicacao, sem etapa manual no Supabase.

### 2026-09-25 21:37:33 -04:00

- Status: concluido localmente em 2026-09-25 21:43:32 -04:00.
- Solicitacao: corrigir o erro do diretorio `/negocios` no dev e evitar tela branca ao navegar para a pagina de um negocio.
- Diagnostico: o frontend chama `get_public_business_directory`, definida pela migration 00053, sem fallback quando o RPC nao existe no Supabase; o carregamento dinamico de `BusinessPage` mantem a Promise rejeitada e nao tem tratamento visual para falha de importacao/renderizacao.
- Escopo: fallback temporario para o indice publico compacto se a RPC estiver ausente, aplicar o mesmo caminho no SSR e na navegacao cliente, e apresentar recuperacao visivel para falhas da pagina do negocio.
- Estrategia: usar cooldown em memoria para ausencia do RPC e cache curto do indice; resetar Promise rejeitada do modulo de negocio; capturar falhas em prefetch/hidratacao e proteger a pagina com limite de erro.
- Implementacao: o carregamento do diretorio usa a RPC agregada e, quando ela estiver ausente (`PGRST202`/`42883`), cai temporariamente para o indice compacto com cache de 2 minutos e cooldown de 60 segundos para evitar repeticoes. SSR e navegacao cliente compartilham o mesmo caminho. A carga dinamica da pagina de negocio agora limpa a Promise rejeitada, tenta uma recarga automatica unica para falhas de chunk, trata falhas de renderizacao e apresenta uma mensagem acionavel em vez de tela branca.
- Arquivos: `src/lib/directorySnapshot.ts`, `src/pages/BusinessDirectoryPage.tsx`, `src/pages/BusinessPagePrefetch.ts`, `src/pages/BusinessPageRoute.tsx`, `pages/+onRenderClient.tsx`, `pages/app/+onBeforeRender.ts` e este registro.
- Validacao: `npm run typecheck`, ESLint direcionado aos seis arquivos TS/TSX e `git diff --check` aprovados. `npx vike build` nao iniciou por `spawn EPERM` do ambiente ao resolver dependencias do Vite; a suite de testes nao foi executada.
- Etapa manual pendente: aplicar `supabase/migrations/00053_public_directory_aggregate.sql` no projeto Supabase usado pelo dev para remover o 404 e voltar a usar agregacao server-side. Nenhum SQL foi executado nesta tarefa.
- Riscos residuais: ate a migration 00053 ser aplicada, o fallback carrega o indice publico compacto e eleva o egress comparado a RPC agregada. Decisao de deploy: funcionalidade tem fallback, mas aplicar a migration e recomendavel antes de promover a versao.

### 2026-09-25 21:20:43 -04:00

- Status: concluido localmente em 2026-09-25 21:22:32 -04:00.
- Solicitacao: simplificar a apresentacao da secao de anuncios na pagina do negocio e deixar mais claro que a opcao de exibicao na pagina e recomendada durante a edicao.
- Escopo: ajustar o titulo e texto auxiliar da secao publica; na pagina de edicao, remover a explicacao extensa e incluir `(Recomendado)` no rotulo do checkbox.
- Estrategia: alterar apenas os trechos de interface solicitados, preservando a descricao existente na tela de criacao.
- Implementacao: secao da pagina publica agora se chama `Anúncios` e usa a chamada `Explore produtos e serviços de {nome do negócio}`. Na edicao do anuncio, o checkbox agora diz `Mostrar também na página do negócio (Recomendado)` e nao exibe a explicacao auxiliar; o texto da tela de criacao foi preservado.
- Arquivos: `src/pages/BusinessPage.tsx`, `src/pages/MarketplacePage.tsx` e este registro.
- Validacao: `npm run typecheck`, ESLint direcionado aos dois arquivos e `git diff --check` aprovados. O Git exibiu somente avisos de normalizacao CRLF/LF.
- Migrations/configuracoes externas: nenhuma; sem alteracao de dados ou banco.
- Riscos residuais: nenhum identificado; nenhuma alteracao funcional ou de autorizacao.

### 2026-09-25 20:58:24 -04:00

- Status: concluido localmente em 2026-09-25 21:14:00 -04:00.
- Solicitacao: permitir que, opcionalmente, um anuncio do Marketplace vinculado a um negocio tambem apareca na pagina publica desse negocio, perto da secao de cardapio/servicos.
- Diagnostico: o Marketplace ja associa o anunciante a um negocio por `seller_business_id`, mas nao ha preferencia independente para exibir o produto na pagina publica do negocio.
- Escopo: adicionar uma opcao na criacao e edicao, persistir a preferencia com validacao, e renderizar um conjunto pequeno de anuncios ativos em uma secao separada da pagina do negocio.
- Estrategia: novo booleano `show_on_business_page` false por padrao; atualizar RPC de criacao com uma sobrecarga compativel com bundles antigos, salvar edicoes sob RLS do proprietario e consultar apenas anuncios ativos explicitamente marcados. Filtrar negocios pela mesma regra de publicacao aprovada/legada.
- Implementacao: adicionado o opt-in na criacao e edicao de anuncios vinculados; cards ativos marcados aparecem numa secao separada apos cardapio/servicos, com caminho para ver todos no Marketplace. A associacao e validada pela autorizacao ja existente; sem migration, os fluxos antigos continuam funcionando e a opcao marcada informa a etapa pendente.
- Arquivos: `supabase/migrations/00063_marketplace_business_page_featured_listings.sql`, `src/types/database.ts`, `src/services/marketplace.ts`, `src/pages/MarketplacePage.tsx`, `src/pages/BusinessPage.tsx` e este registro.
- Validacao: `npm run typecheck` aprovado; `npx eslint src/pages/MarketplacePage.tsx src/pages/BusinessPage.tsx src/services/marketplace.ts` aprovado; `git diff --check` aprovado (apenas avisos informativos de normalizacao CRLF/LF do Git).
- Etapa manual pendente: aplicar a migration 00063 no Supabase antes de habilitar a opcao em producao. Se a migration 00062 ainda nao foi aplicada, aplicar 00062 antes de 00063. Nenhuma migration remota foi executada nesta tarefa.
- Riscos residuais: ainda nao houve teste de integracao contra um banco Supabase de desenvolvimento; anuncios existentes permanecem ocultos na pagina do negocio por padrao. Decisao de deploy: nao publicar a opcao como funcional em producao antes de aplicar as migrations pendentes.

### 2026-09-25 20:49:21 -04:00

- Status: concluido localmente em 2026-09-25 20:50:48 -04:00.
- Solicitacao: tornar clicavel tambem o negocio associado ao cabeçalho de uma conversa.
- Diagnostico: a resolucao de links da caixa de entrada atualmente cobre somente anuncios do Marketplace; conversas vinculadas a negocio carregam `business_id`, mas nao recuperam a URL publica correspondente.
- Escopo: resolver caminhos publicos de negocios em lote, reutilizar o construtor canonico `buildBusinessUrl` e atribuir o link ao contexto da conversa.
- Estrategia: consultar apenas slug e localizacao de negocios aprovados ou legados sem status, usando a mesma regra de visibilidade de `getBusinessById`; nenhuma consulta por conversa e nenhuma alteracao de banco.
- Implementacao: `getPublicBusinessPathsByIds` consulta em lote apenas os dados de rota de negocios aprovados ou legados publicos e gera os caminhos com `buildBusinessUrl`. `buildConversationItems` adiciona o caminho publico ao contexto das conversas vinculadas a negocio, mantendo a resolucao de anuncios separada.
- Arquivos: `src/services/businesses.ts`, `src/contexts/MarketplaceChatContext.tsx`.
- Validacao: `npm run typecheck`, ESLint direcionado aos dois arquivos e `git diff --check` passaram. O Git exibiu somente avisos preexistentes de normalizacao CRLF em arquivos fora deste escopo. Nenhum teste visual no browser foi executado.
- Migrations/configuracoes externas: nenhuma migration ou alteracao no banco.
- Riscos: negocios nao publicos ou removidos nao terao link; conversas do Marketplace e chats antigos sem negocio permanecem com o comportamento anterior.

### 2026-09-25 20:44:45 -04:00

- Status: concluido localmente em 2026-09-25 20:46:16 -04:00.
- Solicitacao: tornar clicavel o anuncio no cabeçalho da conversa, corrigir a acentuacao de “Anuncio do Marketplace” e remover o texto “Mensagens” duplicado na caixa de entrada minimizada.
- Diagnostico: conversas abertas diretamente pelo anuncio recebem seu link, mas itens carregados da caixa de entrada nao recuperam o caminho do anuncio, embora tenham `marketplace_listing_id`; o estado minimizado mostra “Mensagens” tanto como titulo quanto subtitulo.
- Escopo: resolver links de anuncios em lote para conversas da caixa de entrada, padronizar o rotulo acentuado e evitar duplicacao visual no minimizado.
- Estrategia: consultar somente os campos necessarios dos anuncios ativos/vendidos associados, reutilizar o construtor canonico de URL e manter o comportamento atual para chats sem anuncio.
- Implementacao: `getMarketplaceListingPathsByIds` busca em uma unica consulta as rotas dos anuncios ativos/vendidos associados as conversas; os itens do popup passam a preencher `contextHref`, tornando clicavel o cabeçalho do anuncio. O rotulo agora aparece como “Anúncio do Marketplace”. No popup minimizado da caixa de entrada, removi a segunda linha “Mensagens”; conversas individuais mantem seu subtitulo.
- Arquivos: `src/services/marketplace.ts`, `src/contexts/MarketplaceChatContext.tsx`, `src/components/MarketplaceChatPopup.tsx`.
- Validacao: `npm run typecheck`, ESLint direcionado aos tres arquivos e `git diff --check` passaram. O Git exibiu somente avisos preexistentes de normalizacao CRLF em `MobileHeaderMenu.tsx` e `BusinessPage.tsx`. Nenhum teste visual no browser foi executado.
- Migrations/configuracoes externas: nenhuma migration ou alteracao no banco.
- Riscos: anuncios que ja nao estejam ativos nem vendidos nao terao uma rota publica recuperada e, nesse caso, o cabecalho continua sem link.

### 2026-09-25 20:33:46 -04:00

- Status: concluido localmente em 2026-09-25 20:38:26 -04:00.
- Solicitacao: dar maior destaque ao icone/contador de mensagens nao lidas no header e tocar um aviso sonoro ao receber nova mensagem.
- Diagnostico: o badge atual e pequeno e de baixo contraste; a atualizacao do total depende de chamadas pontuais, sem listener global para notificacoes recebidas.
- Escopo: destacar badge acessivel em desktop e no menu mobile; ouvir novas mensagens para a sessao autenticada e emitir um breve som somente para mensagens de outras pessoas.
- Estrategia: uma assinatura Realtime global em `messages`, limitada por RLS aos participantes, dentro do provider global de chat; debounce no refresh do contador; sintetizar um tom curto via Web Audio, inicializando o contexto apenas apos gesto do usuario. Nenhuma migration ou asset de audio.
- Implementacao: badge do header e acao de mensagens no menu mobile ganharam icone maior, fundo de destaque quando ha nao lidas, contador caramelo de alto contraste ate `99+` e rotulos acessiveis. O provider global acompanha novos INSERTs Realtime, ignora mensagens enviadas pelo proprio usuario, evita eventos duplicados, toca duas notas curtas sintetizadas e atualiza o total com debounce quando a caixa atual nao faz esse refresh. O listener redundante do perfil deixou de atualizar o total.
- Arquivos: `src/components/SiteHeaderAuthActions.tsx`, `src/components/MobileHeaderMenu.tsx`, `src/contexts/MarketplaceChatContext.tsx`, `src/lib/message-notification-sound.ts`, `src/services/messages.ts`, `src/pages/user-profile/hooks/useInboxAndReviews.ts`.
- Validacao: `npm run typecheck`, ESLint direcionado aos seis arquivos TypeScript/TSX e `git diff --check` passaram. Nenhum teste no browser com duas contas foi executado.
- Migrations/configuracoes externas: nenhuma migration criada/aplicada. A notificacao usa Realtime em `public.messages` e depende da publicacao e policy SELECT para participantes ja estarem ativas no Supabase.
- Riscos: navegadores bloqueiam audio antes de interacao explicita; o som fica habilitado depois do primeiro clique/toque/tecla. Audio e best-effort e nao afeta envio/recebimento. Validar o evento e o contador no ambiente Supabase com uma segunda conta antes de deploy.

### 2026-09-25 20:04:44 -04:00

- Status: concluido localmente em 2026-09-25 20:17:24 -04:00.
- Solicitacao: explicar e corrigir a ausencia de novas mensagens na caixa de entrada ate recarregar a pagina.
- Diagnostico: o popup busca conversas ao abrir, mas nao acompanha eventos enquanto exibe a lista; a assinatura existente so observa mensagens da conversa aberta. Perfil > Mensagens tambem assina apenas a conversa selecionada.
- Escopo: manter lista, ordem recente e contagens de nao lidas sincronizadas em tempo real no popup e no Perfil, inclusive quando uma nova conversa surge.
- Implementacao: ao abrir o popup, conecta uma assinatura Realtime de `conversations`; atualiza trecho, horario, posicao e nao lidas de conversas existentes, e recarrega a caixa com debounce somente para uma conversa ainda nao listada. Ao reconectar, busca novamente para recuperar eventos perdidos. Perfil > Mensagens usa a mesma atividade em tempo real; a assinatura especifica da conversa continua cuidando do fluxo de mensagens aberto.
- Arquivos: `src/services/messages.ts`, `src/contexts/MarketplaceChatContext.tsx`, `src/pages/user-profile/hooks/useInboxAndReviews.ts`.
- Validacao: `npm run typecheck` passou e `git diff --check` passou. ESLint direcionado permaneceu em execucao sem produzir resultado durante a janela de validacao; nao foi possivel confirmar lint. Nenhum teste no browser com duas contas foi executado.
- Migrations/configuracoes externas: nenhuma migration nova. A migration 00006 ja adiciona `conversations` a `supabase_realtime` e as policies de leitura de conversas limitam os eventos a participantes. A migration 00062 da tarefa anterior continua pendente conforme registrado abaixo; o fallback de contagem de nao lidas permanece disponivel ate aplica-la.
- Riscos: atualizacao ao vivo depende de `conversations` estar na publicacao Realtime e da policy de SELECT para participantes estar ativa no Supabase; verificar com duas contas apos deploy. Nao foi adicionado polling nem uma assinatura por chat.
- Decisao de deploy: codigo local validado por TypeScript; validar Realtime com duas contas no ambiente antes de considerar a correcao confirmada em producao.

### 2026-09-25 19:49:00 -04:00

- Status: concluido localmente em 2026-09-25 19:58:15 -04:00; migration pendente de aplicacao no Supabase.
- Solicitacao: ordenar a caixa de entrada por atividade recente, destacar conversas nao lidas e permitir apagar conversa com confirmacao no popup global do canto inferior da tela.
- Diagnostico: `getConversationsForUser` ja ordena pelo ultimo envio, mas nao calcula nao lidas; o popup nao diferencia estados e nao possui acao de remocao. O perfil tem um delete direto da conversa compartilhada, que nao e seguro nem coerente com “apagar da minha caixa”.
- Escopo: atualizar a lista do popup e a aba Perfil > Mensagens com ordenacao/indicador de nao lidas; implementar remocao por usuario autenticado, confirmacao acessivel no popup, e manter o historico do outro participante.
- Implementacao: `getConversationsForUser` ordena por ultima atividade e inclui contagem agregada de nao lidas via RPC; o fallback consulta somente IDs das mensagens nao lidas para compatibilidade durante rollout. Popup e Perfil > Mensagens destacam conversas nao lidas, mostram horario para atividade de hoje, e zeram o indicador ao abrir a conversa. O popup ganhou acao de remover com dialogo acessivel; ambas as caixas ocultam a conversa apenas para o usuario atual, sem apagar o historico do outro participante. Nova mensagem restaura a conversa na caixa.
- Arquivos: `supabase/migrations/00062_per_user_conversation_inbox.sql`, `src/services/messages.ts`, `src/types/database.ts`, `src/contexts/MarketplaceChatContext.tsx`, `src/components/MarketplaceChatPopup.tsx`, `src/pages/user-profile/components/MessagesTab.tsx`, `src/pages/user-profile/hooks/useInboxAndReviews.ts`.
- Validacao: `npm run typecheck` passou; ESLint direcionado aos seis arquivos TypeScript/TSX passou; `git diff --check` passou. O Git exibiu apenas aviso de normalizacao CRLF em `src/pages/BusinessPage.tsx`, arquivo previamente alterado fora do escopo desta tarefa. Nenhum teste automatizado ou teste no browser foi executado.
- Migrations/configuracoes externas: migration `00062_per_user_conversation_inbox.sql` criada, mas nao aplicada. Aplicar no Supabase antes de publicar para habilitar remocao individual e contagem agregada de nao lidas; sem a migration, a consulta da caixa usa fallback compatível, mas a remocao informa falha.
- Riscos: uma mensagem nova restaura a conversa para os participantes, conforme explicado na confirmacao; a acao nao apaga permanentemente nem altera o historico do outro participante. Nao houve verificacao visual em browser nesta tarefa.
- Decisao de deploy: alteracoes locais validadas por tipos e lint; nao publicar ate aplicar e verificar a migration 00062 no Supabase.

### 2026-09-25 18:21:53 -04:00

- Status: concluido localmente em 2026-09-25 18:24:11 -04:00; migrations remotas pendentes de verificacao/aplicacao.
- Solicitacao: corrigir o erro “Nao foi possivel iniciar a conversa” ao enviar mensagem a partir de um anuncio do Marketplace.
- Diagnostico: `getOrCreateConversation` consulta `public_profiles` e retorna `null` ao falhar, embora a view dependa da migration 00058 e a verificacao seja redundante. A criacao de conversas contextualizadas depende de `create_conversation_with_context`, introduzida em 00055 e endurecida em 00059. Usar a RPC antiga como fallback removeria o contexto do anuncio e poderia misturar chats de Marketplace e de negocios.
- Escopo: remover a consulta previa ao perfil e confiar na validacao da RPC contextual; transformar falhas de RPC em erro tipado, evitar rejeicoes nao tratadas nos fluxos do Marketplace e de negocios, e explicar quando a funcao SQL ainda nao esta disponivel.
- Estrategia: validar no banco o dono do anuncio/negocio e participantes como ja faz `create_conversation_with_context`; nao degradar para a RPC legacy; nenhuma migration sera aplicada e nenhum banco remoto sera alterado.
- Implementacao: `src/services/messages.ts` remove a consulta redundante a `public_profiles`; a RPC contextual continua responsavel por validar participante/dono e erros de criacao/leitura sao retornados como `ConversationStartError`. `src/services/marketplace.ts` converte ausencia da RPC (`PGRST202`/`42883`) em aviso claro de atualizacao do banco e preserva chats separados por anuncio. `src/pages/BusinessPage.tsx` captura falhas para evitar rejeicao nao tratada no envio de mensagens a negocios.
- Validacao: `npm run typecheck` e ESLint direcionado a `messages.ts`, `marketplace.ts` e `BusinessPage.tsx` passaram. `git diff --check` terminou com codigo 0; o Git emitiu apenas um aviso de normalizacao CRLF em `BusinessPage.tsx`. Nenhum teste automatizado ou teste no browser foi executado.
- Migrations/configuracoes externas: nenhuma migration criada/aplicada; nenhum banco remoto consultado ou alterado. Verificar historico do Supabase e aplicar, em ordem e se ainda pendentes, as migrations 00055 e 00059 antes de enviar mensagens contextualizadas; a 00058 continua relacionada a privacidade de perfis, mas deixou de ser pre-requisito para iniciar conversa.
- Riscos: se a RPC contextual nao estiver instalada no Supabase, a conversa nao pode ser criada com seguranca ate aplicar as migrations pendentes, especialmente 00055 e 00059. A disponibilidade real do banco remoto nao sera presumida.
- Decisao de deploy: a correcao local esta pronta. O envio de mensagens so funcionara no ambiente implantado se `create_conversation_with_context` estiver instalada; nao usar a RPC antiga como fallback para evitar misturar conversas de anuncios e negocios.

### 2026-09-25 18:07:28 -04:00

- Status: concluido localmente em 2026-09-25 18:11:47 -04:00; deploy pendente.
- Solicitacao: restaurar o nome real do anunciante no detalhe de anuncios e fazer com que o link para o perfil do vendedor funcione, em vez de mostrar `USUARIO` e `Vendedor nao encontrado`.
- Diagnostico: o Marketplace consulta `public_profiles`, view criada pela migration `00058_protect_private_profile_data.sql`. Se a migration ainda nao foi aplicada, a consulta falha; o enriquecimento esconde a falha e usa `Usuario`, enquanto a pagina de vendedor deixa a Promise rejeitar e cai no estado incorreto de nao encontrado.
- Escopo: manter compatibilidade entre o schema legado e a view publica com consulta restrita a `id`, `name`, `avatar` e `created_at`; diferenciar erros temporarios de perfil realmente ausente, com opcao de nova tentativa.
- Estrategia: adicionar fallback do servico do Marketplace para as mesmas colunas permitidas em `profiles`, sem buscar telefone/localizacao; capturar falhas nas paginas de perfil pessoal e comercial; nenhuma migration, banco remoto ou deploy sera alterado.
- Implementacao: `src/services/marketplace.ts` tenta primeiro `public_profiles` e, se a view nao estiver disponivel, consulta apenas `id,name,avatar,created_at` em `profiles`; o fluxo serve ao nome/avatar dos anuncios, ao perfil pessoal e aos avatares de avaliacao. Se as duas fontes falharem, registra erro sem impedir o restante dos anuncios. `src/pages/MarketplacePage.tsx` captura falhas de carregamento nas paginas de vendedor pessoal/comercial e exibe estado temporario com retry, reservando “nao encontrado” para resposta bem-sucedida sem perfil.
- Validacao: `npm run typecheck`, ESLint direcionado para `src/services/marketplace.ts` e `src/pages/MarketplacePage.tsx`, e `git diff --check` passaram. Nenhum teste automatizado nem verificacao visual no browser foi executado nesta alteracao.
- Migrations/configuracoes externas: nenhuma migration criada ou executada, e nenhum banco remoto alterado. A migration `00058_protect_private_profile_data.sql` continua necessaria para proteger telefone/localizacao no banco; o fallback e apenas uma compatibilidade de leitura e nao substitui a migration.
- Riscos: se o perfil nao existir ou o banco bloquear ambas as fontes, o Marketplace nao podera exibir o nome real; nesse caso mostrara falha de carregamento ou nome generico, mas nao deve expor dados privados. Aplicar a migration 00058 continua necessario para a protecao definitiva do perfil.
- Decisao de deploy: a correcao e compativel com o schema anterior e pode recuperar nomes antes da migration; para publicar a correcao de seguranca de perfis, aplicar e validar a migration 00058 continua pendente.

### 2026-09-25 17:47:47 -04:00

- Status: concluido localmente em 2026-09-25 17:59:23 -04:00; migration remota pendente.
- Solicitacao: exibir denuncias de anuncios para administradores e destacar a confirmacao de envio no detalhe do anuncio.
- Diagnostico: a aba Denuncias lista apenas relatos de negocios; os relatos de anuncios ficam em Marketplace (admin), cujo carregamento converte erros em lista vazia. A migration inicial concede SELECT/INSERT em marketplace_reports, mas nao UPDATE do status.
- Escopo: concentrar relatos de anuncios na aba Denuncias, informar erros de carregamento/atualizacao, destacar o retorno do envio junto ao formulario e registrar permissao SQL minima para a moderacao.
- Estrategia: componente administrativo dedicado aos relatos do Marketplace, feedback acessivel com envio protegido contra duplo clique e migration aditiva para UPDATE(status). Nenhuma alteracao remota sera aplicada nesta tarefa.
- Riscos: policies/grants efetivos do Supabase podem divergir das migrations; a interface so podera alterar status depois da aplicacao e verificacao da nova migration.
- Implementacao: `MarketplaceReportsAdminSection.tsx` mostra as denuncias de anuncios dentro de Perfil > Denuncias, com motivo e status em portugues, link para anuncios disponiveis, carregamento, falha explicita/retry e acoes de moderacao. `ReportsAdminTab.tsx` integra a fila; `MarketplaceAdminTab.tsx` deixa de duplicar relatos e nao mascara erros de carregamento. `src/services/marketplace.ts` exige retorno de linha no UPDATE para nao reportar sucesso falso. `MarketplacePage.tsx` exibe confirmacao/erro junto ao formulario e por toast, com estados acessiveis, bloqueio de envio duplicado e resposta imediata sem sessao. `src/types/database.ts` inclui os campos do anuncio usados no link administrativo.
- Migration: `00061_marketplace_reports_admin_status.sql` revoga grants amplos de SELECT/UPDATE de clientes, garante SELECT da fila apenas a administradores por policy permissiva e tetos restritivos para anon/authenticated, concede apenas `UPDATE(status)` a authenticated e adiciona teto restritivo para escrita administrativa mesmo se existir policy permissiva antiga. Nao foi aplicada ao Supabase; depende da tabela de Marketplace e da funcao `is_admin` ja existentes.
- Validacao: `npm run verify` passou (25 arquivos, 115 testes), ESLint direcionado passou, `git diff --check` passou. No browser local, o detalhe de um anuncio mostrou o formulario; o acionamento por teclado sem login exibiu erro em card destacado e toast. Nao foi criada denuncia real nem testada uma sessao administrativa.
- Build: `npx vike build` e a tentativa com `--configLoader runner` falharam antes da compilacao em `vite.config.ts`, com `spawn EPERM` no Vite sob o ambiente Windows restrito. O build permanece nao validado neste turno; nao se atribui essa falha ao codigo alterado.
- Riscos residuais: confirmar no Supabase os grants/RLS efetivos e aplicar a migration antes de usar a mudanca de status; testar com conta admin o recebimento e a moderacao de uma denuncia real em ambiente controlado. Nenhum deploy ou SQL remoto foi executado.

### 2026-09-22 19:41:49 -04:00

- Status: concluido localmente em 2026-09-22 19:45:11 -04:00; deploy no Vercel dev pendente.
- Solicitacao: corrigir `/api/geoip` apos o Vercel dev continuar respondendo HTTP 500 mesmo com a chamada no mesmo dominio.
- Diagnostico: a correcao de origem eliminou o endpoint preview externo, mas a funcao implantada ainda falha. A implementacao consulta ate tres provedores GeoIP externos sequencialmente e usa o handler tradicional `VercelRequest`/`VercelResponse`; Vercel fornece headers nativos de cidade, regiao, pais, latitude e longitude.
- Escopo: usar exclusivamente os headers de geolocalizacao do Vercel, substituir o handler por Fetch API padrao, manter cabecalhos no-store e responder 204 quando nao houver coordenadas validas; cobrir comportamento por testes de endpoint.
- Riscos: headers geograficos do Vercel nao existem em execucao local ou atras de certos proxies; nesses casos a API retorna 204 e o cliente deve usar seus fallbacks. Nao consultar nem expor IP bruto.
- Implementacao: `api/geoip.ts` usa `x-vercel-ip-latitude`, `x-vercel-ip-longitude`, `x-vercel-ip-city`, `x-vercel-ip-country-region` e `x-vercel-ip-country`; remove os tres fetches externos e o import local, migra para o handler `fetch(Request)` atual do Vercel, valida limites geograficos, preserva no-store, responde 204 sem coordenadas e 405 fora de GET. `src/lib/geoipHandler.test.ts` cobre resposta valida, decodificacao de cidade, ausencia de headers sem egress, coordenadas invalidas, metodos e headers.
- Validacao: `npm run build` passou; 25 arquivos/115 testes passaram; ESLint direcionado e `tsc` standalone para `api/geoip.ts` passaram; `git diff --check` passou. O build manteve o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`. O sitemap gerado pelo build foi restaurado ao estado-fonte.
- Configuracoes externas pendentes: publicar no Vercel dev. Apos deploy, verificar `/api/geoip`: esperado `200` com coordenadas aproximadas quando os headers estiverem presentes, ou `204` sem eles; nunca mais depende de ipapi/ipwho/ipinfo. Se continuar em 500, a falha ocorre antes da invocacao deste handler ou na configuracao de roteamento/build do projeto, e exige o log da funcao/deployment.
- Riscos residuais: nao foi possivel executar o runtime de funcoes Vercel localmente nem confirmar a resposta do deployment sem CLI/logs; a plataforma fornece os headers documentados em deployments, mas um proxy externo pode alterar a localizacao aparente. A localizacao por IP permanece aproximada.

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
