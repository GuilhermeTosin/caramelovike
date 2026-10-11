# Auditoria das Paginas de Negocios e SSR

Data: 2026-10-11 12:58:03 -04:00 (America/Toronto).
Escopo: worktree local da branch `dev`, bundle de producao e banco Supabase vinculado, somente leitura.
Decisao no momento da auditoria: nao recomendar promocao antes de resolver os dois P1 entao abertos.

## Atualizacao posterior

Em 2026-10-11 13:06:15 -04:00, o P1 de hidratacao descrito abaixo foi corrigido localmente. O detector duplicado foi substituido por `src/lib/businessRoute.ts`, usado tanto no preload do app quanto antes de `hydrateRoot`. O teste de unidade cobre codigos `qc`, `eng`, `idf` e `nsw`; o bundle de producao recem-gerado carregou os exemplos do Reino Unido e da Franca sem erros ou avisos no console. Build: 28 arquivos/141 testes; lint e typecheck passaram.

Em 2026-10-11 13:17:45 -04:00, o P1 sobre erros do Supabase tratados como ausencia tambem foi corrigido localmente. Os erros das consultas essenciais de negocio, historico, link curto e tombstone agora chegam ao SSR, que retorna HTTP 503; consultas bem-sucedidas sem registro continuam em 404, e tombstones confirmados continuam em 410. O build passou com 29 arquivos/148 testes. Uma simulacao no handler SSR retornou 503 sem `noindex`; um slug inexistente continuou em 404 com `noindex`. Os dois P1 desta auditoria estao corrigidos no worktree, mas ainda nao foram publicados ou testados na Vercel. Os achados P2 abaixo permanecem pendentes.

Em 2026-10-11 13:25:26 -04:00, o P2 sobre avaliacoes excluidas preservadas na tela tambem foi corrigido localmente. A pagina agora substitui a lista e `averageRating` pelo snapshot atualizado quando o recarregamento conclui com sucesso, sem preservar valores antigos por causa da contagem menor. Typecheck, ESLint direcionado, encoding e 29 arquivos/148 testes passaram. Nenhuma avaliacao real foi excluida; a correcao ainda nao foi publicada nem validada na Vercel.

Em 2026-10-11 13:28:21 -04:00, o P2 do teste SEO SSR desatualizado foi corrigido localmente. `assertDirectoryContent` agora verifica a contagem de negocios publicados e um link SSR canonico, sem depender de titulos de secao removidos. O teste completou 19 verificacoes e ignorou apenas `/sitemaps/businesses.xml`, indisponivel no Vike dev; o sitemap estatico e os casos seguintes foram verificados. Sem commit ou deploy.

Reauditoria em 2026-10-11 13:37:14 -04:00: os quatro cenarios originais passaram no bundle atualizado. SEO completou 21 verificacoes sem skips com o handler real de sitemap. Foi identificado um caso residual P2 na exclusao de avaliacao seguida de falha no refetch. Em 2026-10-11 14:12:45 -04:00, o caso foi corrigido localmente: a tela atualiza o snapshot assim que a exclusao e confirmada e oferece nova tentativa se a sincronizacao falhar. Typecheck, lint direcionado, encoding e diff check passaram; simulacao apos a mudanca e smoke test na Vercel continuam pendentes. Ver [Reauditoria das quatro correcoes](business-pages-ssr-reaudit-2026-10-11.md).

## Achados

### P1 - Hidratacao incorreta em regioes com tres letras

- Referencias: `pages/+onRenderClient.tsx:15`, `src/appRouteModules.ts:87`, `src/pages/BusinessPageRoute.tsx:63`.
- Os detectores de paginas de negocios aceitam somente dois caracteres no estado/regiao. Rotas validas como `/gb/eng/londres/elohim-sabor-brasileiro` e `/fr/idf/paris/bref-design-art` nao recebem o preload necessario antes de `hydrateRoot`.
- O servidor renderiza o negocio, mas a primeira renderizacao cliente mostra o fallback do chunk. O React detecta a divergencia, descarta a hidratacao desse trecho e recupera a pagina no cliente.
- Reproducao: carregamentos completos no browser com o handler de producao local emitiram erros React 418 (duas ocorrencias) e 422 para os dois caminhos acima. O carregamento comparativo de `/ca/qc/montreal/tapi-go` nao emitiu novos erros.
- Impacto: flash de carregamento, reconstrucao desnecessaria do HTML e regressao de desempenho em paises/regioes afetados.
- Status: corrigido localmente conforme a atualizacao no topo. A deteccao compartilhada elimina a divergencia entre os dois preloads e cobre os formatos de rota registrados no router. A verificacao em deployment Vercel ainda nao foi feita.

### P1 - Indisponibilidade do banco se transforma em 404

- Referencias: `src/services/businesses.ts:1336`, `src/services/businesses.ts:1395`, `pages/app/+onBeforeRender.ts:609`, `pages/app/+onBeforeRender.ts:637`.
- As consultas principais descartam `error` e retornam `null` quando nao existe `data`. O hook SSR tambem transforma excecoes em negocio ausente e acaba retornando 404.
- Reproducao isolada: no mesmo handler/bundle de producao, substituiu-se apenas o fetch do Supabase por uma resposta simulada HTTP 503. A rota existente `/ca/qc/montreal/tapi-go` respondeu HTTP 404, pagina de nao encontrado e `robots=noindex,nofollow,noarchive`.
- Nenhum dado remoto foi modificado pela simulacao.
- Impacto: visitantes recebem uma informacao incorreta; crawlers podem interpretar uma falha temporaria como remocao. Limites, erros de permissoes e indisponibilidade ficam mascarados.
- Status: corrigido localmente conforme a atualizacao no topo. A falha simulada retorna 503; ausencia confirmada continua 404. Verificacao no deployment Vercel ainda pendente.

### P2 - Avaliacao excluida pode continuar visivel

- Referencias: `src/pages/BusinessPage.tsx:386`, `src/pages/BusinessPage.tsx:727`.
- `handleDeleteOwnReview` exclui no banco e chama `loadBusiness`. Se a nova lista tem menos avaliacoes, `loadBusiness` preserva a lista antiga e a nota antiga deliberadamente.
- Consequencia deduzida diretamente do fluxo: a avaliacao removida continua na tela e no agregado local ate recarregar a pagina, apesar do toast de sucesso. A verificacao foi estatica; nao se excluiu uma avaliacao real em producao.
- Status atual: a preservacao por contagem foi corrigida e as reducoes de lista passaram em simulacao. O caso residual de falha no refetch foi corrigido localmente; a nova simulacao e o smoke test na Vercel permanecem pendentes. Nenhuma exclusao real foi usada na validacao.

### P2 - Teste SEO SSR desatualizado

- Referencia: `scripts/check-seo-ssr.mjs:122`.
- O script exige o texto `Panorama do diretorio` (acentuado no codigo), removido anteriormente por solicitacao do produto.
- Execucao: home, seis paginas institucionais e diretorios de pais/estado/cidade passaram nas verificacoes iniciais. O script interrompeu no diretorio de cidade `/negocios/de/bw/altluheim` por essa expectativa antiga, antes de concluir os casos de negocio/sitemap.
- Este resultado nao demonstra uma falha do SSR do diretorio; demonstra uma assercao obsoleta. As verificacoes de detalhe de negocio e redirects foram executadas separadamente.
- Status: corrigido localmente conforme atualizacao posterior no topo. O helper valida contagem e link de negocio SSR atuais, em vez de texto de secao removido. O script completou 19 verificacoes no Vike dev, com uma verificacao de sitemap de negocios ignorada por indisponibilidade do endpoint nesse host.

## Validacoes Bem-Sucedidas

- `npm run build`: passou, incluindo TypeScript e 27 arquivos/129 testes.
- `npm run lint`: passou.
- SSR testado pelo proprio `api/ssr.js`, com `dist/server/entry.mjs`, ambiente carregado e assets do build. O preview estatico isolado nao serve como teste das rotas dinamicas e nao foi usado como evidencia de falha da aplicacao.
- HTTP 200 com H1 e conteudo no HTML inicial, canonical de producao e JSON-LD parseavel (WebSite, negocio, BreadcrumbList): Tapi Go!, Elohim Sabor Brasileiro e bref, design art.
- Tempos das tres respostas HTML medidas: aproximadamente 755-1057 ms no ambiente local. Nao representam uma garantia de cold start ou latencia na Vercel.
- Nenhum `ownerId`, `ownerName` ou `owner_id` encontrado no HTML bruto dessas tres paginas.
- URLs historicas de Tapi Go!, Chez Luma e Fernando Nobre: 301 para o caminho canonico atual. Query string preservada no caso testado de Tapi Go!.
- `/go/santos-design?auditoria=1`: 301 para o caminho canonico, preservando a query string.
- URL inexistente: HTTP 404 com noindex.
- Navegacao interna de Tapi Go! para Boteco: titulo e canonical atualizaram sem exigir reload.
- Em viewports de 320 e 390 px, nao houve overflow horizontal nas secoes/H1 inspecionadas da pagina Tapi Go!. Esta verificacao geometrica nao substitui testes completos em dispositivos reais.
- JSON-LD do servidor usa escape de `<`; rich text usa sanitizacao; as consultas de detalhes publicos filtram moderacao e eventos vinculados publicados. Isto e revisao do fluxo, nao uma certificacao de seguranca de todas as policies.

## Banco e Migrations

- Consulta somente de leitura confirmou `business_url_tombstones`, `business_short_link_history`, trigger `reserve_deleted_business_urls` e variaveis `v_old_business_slug` na definicao instalada de `capture_business_slug_history`.
- Essas evidencias confirmam as estruturas relacionadas a 00066/00067 no banco vinculado no momento da auditoria.
- A tabela de versoes `supabase_migrations.schema_migrations` retornou vazia. Nao usar esse registro vazio como prova de ausencia de SQL executado manualmente, nem como prova de que todas as migrations anteriores estao completas.
- Nao havia tombstones para testar HTTP 410 com dados existentes. Nenhum negocio foi excluido para criar um caso.
- Um registro publico tem `city_slug` nulo, mas cidade textual Calgary e caminho canonico de quatro segmentos; isso nao demonstrou falha de fallback e nao foi classificado como achado.

## Limites e Liberacao

- Nao foram testadas escritas autenticadas (edicao, exclusao, denuncia, mensagem ou avaliacao) no banco compartilhado.
- Nao houve commit, deploy ou alteracao funcional. As alteracoes preexistentes da migration 00067 foram preservadas.
- O aviso tolerado de top-level await permanece no build; o problema concreto de hidratacao acima foi identificado separadamente e nao deve ser confundido com esse aviso.
- A coleta integral de avaliacoes e algumas consultas sequenciais continuam oportunidades de reduzir latencia/egress, mas os tempos atuais medidos nao justificam classifica-las isoladamente como bloqueio.
- Antes da promocao: corrigir os dois P1, corrigir o fluxo de exclusao de avaliacao, atualizar o teste SEO, repetir testes de SSR/hidratacao e realizar smoke test no deployment Vercel que sera promovido.
- Validar edicao de nome e redirects com uma conta de teste autorizada, sem usar dados reais como massa descartavel. Manter backup e plano de rollback compativel com migrations ja aplicadas.
