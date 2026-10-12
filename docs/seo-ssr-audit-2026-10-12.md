# Auditoria de SEO, SSR e Links

Data: 2026-10-12. Ambiente: codigo local da branch `dev` (`c25d002`) e respostas publicas de
`https://www.caramelinho.com`. Auditoria somente leitura dos dados remotos.
Nenhuma correcao funcional, migration, commit ou deploy foi executado.

## Resultado

A base principal de SEO dos negocios esta funcionando nos casos exercitados.
Foram identificados dois achados P1, sete P2 e dois P3. Os P1 concentram-se no
fluxo de eventos. Recomenda-se corrigi-los antes de considerar o SSR inteiramente
validado para alteracoes e despublicacao de conteudo.

As evidencias abaixo distinguem respostas reais, simulacoes locais e revisao
de codigo. Nao houve teste interativo de hidratacao nesta rodada: o navegador
integrado bloqueou o acesso por uma preferencia de permissao salva. O bloqueio
nao foi contornado.

## Acompanhamento das correcoes P1

Em 2026-10-12, os dois achados P1 foram corrigidos no codigo local:

| Achado | Correcao | Estado |
| --- | --- | --- |
| SEO-01 | Erros de consulta agora chegam ao SSR como HTTP 503; 404 fica reservado a ID invalido ou evento publico inexistente. | Implementado; verify (182 testes), lint e smoke SSR passaram. |
| SEO-02 | Detalhes de eventos deixaram de ser prerenderizados e as respostas SSR da rota usam `no-store` para browser/CDN. | Implementado; build gerou sete HTMLs e nenhum HTML de detalhe de evento. Push para dev concluido e check Vercel success. |

O build local passou, com o aviso preexistente de top-level await em
`BusinessPageRoute.tsx:7`. O smoke do handler SSR compilado simulou uma resposta
Supabase 503 e uma consulta sem evento: recebeu 503 e 404, respectivamente,
ambos com headers `no-store`. O teste foi simulado; nenhum registro remoto foi
alterado. O HEAD publico do Preview redirecionou para o SSO da Vercel, entao
nao foi possivel inspecionar a resposta HTML sem autenticacao.

## Verificacoes Executadas

| Verificacao | Resultado |
| --- | --- |
| `npm run verify` | TypeScript e 180 testes em 33 arquivos passaram. |
| Testes direcionados a SEO, rotas e diretorio | 68 testes em oito arquivos passaram. |
| `npm run lint` | Passou. |
| `npx vike build` | Passou; persiste o aviso tolerado de top-level await em `BusinessPageRoute.tsx:7`. |
| Script SEO existente no servidor local | 31 verificacoes passaram; sitemap dinamico de negocios indisponivel no Vike dev e ignorado pelo script. |
| Script SEO original em producao | Interrompido pela exigencia de `googlebot` explicito no fallback 404; ver observacao de teste abaixo. |
| Continuacao do script em producao, em memoria | 33 verificacoes passaram depois de isolar somente aquela exigencia; o arquivo original nao foi modificado. |
| Amostragem adicional | 43 paginas locais e seis paginas de negocios em producao: HTTP 200, um title, uma canonical, um H1 e JSON-LD parseavel. |
| Links internos adicionais | 72 destinos adicionais encontrados na amostra responderam HTTP 200, sem redirects ou erros. |
| Sitemap publico de negocios | 1.948 URLs, sendo 1.303 negocios e 645 hubs de diretorio; sem URLs duplicadas. |
| Regioes exercitadas | Franca, Japao, Reino Unido, Portugal, Canada, EUA e Alemanha; incluiu `eng` e `idf`. |
| Links completos de negocios | Nenhum link abreviado `/:pais/:slug` encontrado nos 111 links internos distintos da amostra. |
| Redirects historicos | Tapi Go, Chez Luma e Les Brasileirinhos redirecionaram permanentemente para os caminhos esperados. |
| Dominio sem www | `https://caramelinho.com/` respondeu 308 para `https://www.caramelinho.com/`. |
| Robots de paginas privadas | Entrar, cadastro, redefinir senha, wizard, publicar anuncio e perfil permaneceram noindex em producao. |
| Simulacoes de falhas | Executadas localmente com fetch simulado, sem modificar registros reais. |

Amostragem nao equivale a rastreamento integral das 1.948 URLs. Os tempos HTTP
observados nao medem Core Web Vitals nem substituem testes em dispositivos reais.

## Achados

### SEO-01 - P1 - Falha temporaria do banco vira 404 em eventos

- Evidencia: o handler compilado real `api/ssr.js`, com resposta Supabase 503
  simulada, retornou HTTP 404 e `robots=noindex,nofollow,noarchive` para
  `/eventos/b1ecfda4-c379-4c60-857c-12cf4294c5b6`. O mesmo teste em
  `/ca/qc/montreal/tapi-go` retornou HTTP 503 sem noindex, como esperado.
- Causa: `getCommunityEventById` transforma erro de consulta em `null`; o hook
  tambem captura qualquer excecao e converte em `null`. O resultado e tratado
  como ausencia definitiva do evento.
- Impacto: uma indisponibilidade pode sinalizar que uma URL valida nao existe
  e deve sair do indice. Afeta eventos atuais e futuros servidos dinamicamente.
- Correcao: propagar erros de consulta; retornar 503 para indisponibilidade e
  404 apenas quando a consulta bem-sucedida nao encontra um evento publico.
- Fontes: [events.ts](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/services/events.ts:58),
  [onBeforeRender.ts](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/pages/app/+onBeforeRender.ts:344).
- Referencia: [Google sobre erros de rastreamento](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors).

### SEO-02 - P1 - Eventos pre-renderizados podem continuar publicos apos arquivamento

- Evidencia: o build atual gerou um HTML estatico para o evento acima. O
  prerender inclui todos os eventos publicados futuros, e a regra filesystem
  do Vercel precede o fallback SSR. `EventPage` aceita o evento inicial que
  corresponde ao ID e nao consulta novamente seu estado de publicacao.
- Impacto: editar, arquivar ou excluir um evento nao invalida o HTML gerado.
  Titulo, data, descricao e estado indexavel podem permanecer antigos ate um
  novo deploy. A restricao do banco nao protege um HTML previamente publicado.
- Natureza da evidencia: fluxo comprovado por revisao de codigo e existencia
  do artefato estatico. Nenhum evento real foi arquivado ou excluido para testar.
- Correcao: servir detalhes de eventos por SSR com verificacao atual de
  publicacao, ou implementar invalidacao efetiva do HTML/CDN em cada mutacao.
  Apenas atualizar o navegador depois da carga nao resolve o HTML do crawler.
- Fontes: [onBeforePrerenderStart.ts](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/pages/app/+onBeforePrerenderStart.ts:68),
  [vercel.json](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/vercel.json:76),
  [EventPage.tsx](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/pages/EventPage.tsx:51).

### SEO-03 - P2 - Variantes duplicadas declaram canonicals diferentes

- Evidencia real em producao e no local: `/?utm_source=seo-audit`,
  `/negocios/PT/LI/LISBOA` e `/negocios/pt/li/lisboa/pagina/1` responderam 200 e
  declararam a propria variante como canonical, embora o conteudo corresponda
  a `/`, `/negocios/pt/li/lisboa` e a primeira pagina do mesmo diretorio.
- Impacto: sinais inconsistentes de consolidacao e mais URLs redundantes para
  rastrear. Isso nao prova que o Google tenha indexado todas as variantes.
- Correcao: um builder compartilhado de canonical, com parametros permitidos
  por rota; remover parametros de campanha e redirecionar permanentemente
  segmentos normalizados e `/pagina/1`. Preservar paginas 2+ distintas.
- Fontes: [onRenderHtml.tsx](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/pages/+onRenderHtml.tsx:59),
  [App.tsx](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/App.tsx:101),
  [directorySnapshot.ts](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/lib/directorySnapshot.ts:173).
- Referencia: [Google sobre consolidacao de URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

### SEO-04 - P2 - Dados estruturados podem permanecer de outra pagina na navegacao SPA

- Evidencia por codigo: `setJsonLd` cria ou atualiza um script por ID, mas nao
  remove scripts de rotas anteriores. Os efeitos de negocio/evento nao fazem
  limpeza ao desmontar. O gerenciador global atualiza title/canonical/robots,
  mas nao possui ciclo de vida para os schemas especificos da rota.
- Exemplos: negocio -> home pode manter `business-local`; evento -> negocio
  pode manter `event`; entrar num anuncio pela navegacao React nao cria o
  Product/JobPosting que seria emitido numa carga SSR direta do anuncio.
- Impacto: o DOM pode descrever entidades que nao correspondem ao conteudo
  atual, e SSR e navegacao interna entregam conjuntos diferentes de schemas.
- Correcao: gerenciar a substituicao e limpeza dos schemas por rota e usar os
  mesmos builders em SSR e cliente. Conferir o DOM depois de navegar, nao
  somente o HTML de uma carga direta.
- Limitacao: nao reproduzido interativamente nesta rodada devido ao bloqueio
  do browser; identificado por revisao do ciclo de vida dos componentes.
- Fontes: [seo.ts](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/lib/seo.ts:48),
  [BusinessPage.tsx](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/pages/BusinessPage.tsx:600),
  [EventPage.tsx](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/pages/EventPage.tsx:75),
  [MarketplacePage.tsx](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/pages/MarketplacePage.tsx:1092).

### SEO-05 - P2 - JSON-LD do negocio muda de regra apos hidratacao

- Evidencia por codigo: o SSR omite geo quando latitude e longitude sao 0,0.
  O cliente usa apenas `Number.isFinite`, portanto inclui 0,0 para os registros
  que usam zero como ausencia de coordenadas. O builder cliente tambem
  substitui o schema SSR sem seu `@id`, datas e breadcrumbs de diretorio.
- Impacto: um negocio sem coordenadas pode ganhar uma localizacao falsa no
  DOM hidratado, e os dados estruturados variam conforme JavaScript e navegacao.
- Correcao: extrair o builder completo compartilhado, aplicar a mesma
  validacao de coordenadas e de modalidade de atendimento nos dois ambientes.
- Limitacao: comparacao das duas implementacoes; nao foi capturado o DOM de
  um negocio sem coordenadas no browser nesta rodada.
- Fontes: [onRenderHtml.tsx](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/pages/+onRenderHtml.tsx:289),
  [BusinessPage.tsx](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/pages/BusinessPage.tsx:548).

### SEO-06 - P2 - /eventos entrega uma pagina vazia indexavel no SSR

- Evidencia real em producao e no local: `/eventos` respondeu HTTP 200, title
  da home, canonical `/eventos`, robots index/ follow e nenhum H1.
- Causa: a rota existe no React como `Navigate` para `/buscar?eventos=1`, mas
  o servidor nao emite o redirecionamento equivalente.
- Impacto: uma URL de alias tem HTML sem conteudo principal e pode ser
  interpretada como soft 404 ou como uma pagina redundante.
- Correcao: redirecionamento HTTP permanente para `/buscar?eventos=1`, ou uma
  pagina de eventos propria com conteudo SSR e metadados coerentes.
- Fontes: [App.tsx](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/App.tsx:260),
  [onBeforeRender.ts](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/pages/app/+onBeforeRender.ts:319).
- Referencia: [Google sobre soft 404](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors).

### SEO-07 - P2 - Sitemaps podem declarar sucesso mesmo com perda temporaria dos dados

- Evidencia simulada: Supabase 503 produziu HTTP 200 com zero URLs no sitemap
  do Marketplace. No de negocios, Supabase 503 e fallback vazio produziram o
  mesmo resultado. O handler de negocios usa fallback sem mudar o status.
- Contexto: o fallback pode ser regenerado vazio se o indice falha durante o
  build, pois o prerender captura a falha e grava a lista vazia.
- Impacto: descoberta e diagnostico ficam prejudicados; uma interrupcao parece
  um sitemap valido sem conteudo. Nao significa desindexacao imediata de todas
  as URLs ja conhecidas.
- Correcao: distinguir lista genuinamente vazia de consulta fracassada;
  preservar um ultimo snapshot valido ou retornar 503 quando nao houver um
  fallback confiavel. Registrar explicitamente a origem e o estado degradado.
- Fontes: [sitemap-marketplace.js](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/api/sitemap-marketplace.js:31),
  [sitemap-businesses.js](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/api/sitemap-businesses.js:240),
  [onBeforePrerenderStart.ts](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/pages/app/+onBeforePrerenderStart.ts:63).
- Observacao: o sitemap do Marketplace real estava vazio, assim como o indice
  SSR real. Essa observacao isolada nao foi considerada prova de falha.

### SEO-08 - P2 - Sitemap do Marketplace nao pagina a consulta

- Evidencia: o handler envia uma unica consulta com `limit=50000`. Em
  simulacao de API com 1.500 registros e resposta limitada a 1.000, gerou
  somente 1.000 URLs e fez uma unica requisicao, sem ler o restante.
- Impacto: conforme o numero de anuncios cresce, registros podem deixar de
  aparecer no sitemap. O teto efetivo de linhas do projeto remoto nao foi
  consultado nesta auditoria; a simulacao usou o teto padrao documentado.
- Correcao: paginar com ordem estavel e desempate por ID; validar completude
  e separar arquivos ao atingir os limites do protocolo de sitemap.
- Fonte: [sitemap-marketplace.js](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/api/sitemap-marketplace.js:35).
- Referencia: [Supabase sobre limite padrao e paginacao](https://supabase.com/docs/reference/javascript/v1/select).

### SEO-09 - P2 - JobPosting pode informar o autor como empregador

- Evidencia por codigo: `hiringOrganization.name` vem de `listing.owner_name`,
  mesmo quando existe `seller_business_name`. O enriquecimento usa `Usuario`
  como fallback, que tambem passa pela verificacao de nome nao vazio.
- Exemplo de contrato: autor Ana, anuncio vinculado a Restaurante X; o schema
  informa Ana como organizacao empregadora em vez de Restaurante X.
- Impacto: vagas podem descrever uma empresa incorreta ou ficticia nos dados
  estruturados. Nenhuma vaga real foi alterada ou usada para uma candidatura.
- Correcao: usar o negocio empregador confirmado ou um campo explicito de
  empregador; nao emitir JobPosting quando faltarem informacoes factuais.
- Fontes: [onRenderHtml.tsx](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/pages/+onRenderHtml.tsx:81),
  [marketplace.ts](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/services/marketplace.ts:203).
- Referencia: [Google sobre hiringOrganization](https://developers.google.com/search/docs/appearance/structured-data/job-posting).

### SEO-10 - P3 - Compartilhamento de anuncios usa a imagem generica do site

- Evidencia por codigo: a selecao de `pageImage` no SSR possui ramos para
  negocio, evento e vendedor, mas nao para a foto principal do anuncio.
  O fallback e `/og-image.jpg`. No cliente, `setSeoMeta` atualiza textos,
  mas nao `og:image` ou `twitter:image` ao mudar de pagina.
- Impacto: previews podem mostrar a marca ou uma imagem da rota anterior em
  vez da foto do produto. Nao constitui erro de indexacao do texto da pagina.
- Correcao: builder compartilhado de metadados sociais, com imagem principal
  do anuncio e reposicao da imagem padrao nas rotas genericas.
- Fontes: [onRenderHtml.tsx](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/pages/+onRenderHtml.tsx:475),
  [seo.ts](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/lib/seo.ts:1).

### SEO-11 - P3 - Algumas descricoes terminam em fragmentos apesar de terem ponto final

- Evidencia real: Barbara Santana terminou em `em Paris, destinados.`; Green
  Spot Technologies terminou em `na categoria alimenticia e.`.
- Causa: quando nao cabe uma frase inteira, o builder corta por palavras e
  acrescenta ponto. A lista de conectivos removidos nao resolve truncamento
  gramatical e pode deixar outro conectivo apos remover o ultimo.
- Impacto: menor qualidade de snippet e de leitura; nao e uma falha de SSR ou
  uma garantia de penalizacao. Descricoes curtas continuam validas.
- Correcao: preferir frases completas; quando nao couberem, usar uma descricao
  factual curta composta de atividade, cidade e formas de contato, sem montar
  um fragmento que aparente ser uma frase inteira.
- Fonte: [businessMeta.ts](C:/Users/Tosin/Documents/Caramelo/Vike/caramelovike-dev/src/lib/seo/businessMeta.ts:85).

## Observacoes Sobre Testes e Cobertura

O script SEO original em producao falha porque o fallback customizado de
`api/ssr.js` possui `robots=noindex`, mas nao uma tag `googlebot` explicita.
Isso e uma divergencia entre a expectativa do teste e o fallback; nao significa
que o Google pode indexar a pagina. A regra generica `robots` tambem se aplica
ao Google, conforme sua [documentacao de meta tags](https://developers.google.com/search/docs/crawling-indexing/special-tags).
Padronizar os dois renderizadores ou verificar a regra efetiva no teste evita
interrupcao antes dos checks de busca e sitemap.

O teste SEO atual nao exercita falhas de eventos, alteracoes de publicacao em
conteudo pre-renderizado, troca de rota com limpeza de schemas, variantes
normalizadas do diretorio, imagem social de anuncio ou empregador em vagas.
Um resultado verde no script atual nao cobre esses achados.

Nao foi realizado rastreamento de todos os destinos externos de negocios,
acesso autenticado ao Search Console, Rich Results Test externo ou verificacao
de qual canonical o Google efetivamente selecionou. As correcoes recomendadas
nao garantem posicao, indexacao ou exibicao de resultados enriquecidos.

Eventos publicados tambem nao possuem uma secao propria no sitemap atual.
Adicionar um sitemap de eventos pode melhorar a descoberta, depois de resolver
os achados SEO-01 e SEO-02; sua ausencia isolada nao torna o SEO invalido.

## Ordem Recomendada

1. SEO-01 e SEO-02: status correto e publicacao atual de eventos.
2. SEO-03 e SEO-06: consolidacao de URLs e redirecionamento do alias de eventos.
3. SEO-04, SEO-05 e SEO-09: builders e ciclo de vida de dados estruturados.
4. SEO-07 e SEO-08: resiliencia e completude dos sitemaps.
5. SEO-10 e SEO-11: imagens de compartilhamento e qualidade das descricoes.

## Registro Operacional

O servidor local temporario de auditoria foi iniciado separadamente na porta
3001 e encerrado ao concluir. O servidor preexistente da porta 3000 nao foi encerrado. Artefatos de teste
com falhas simuladas ficaram no diretorio temporario do sistema; nao contem
credenciais nem fizeram gravacoes no Supabase. O build regenerou o sitemap
fallback, que ja estava modificado antes da auditoria; essa alteracao permanece
fora das modificacoes manuais deste relatorio.
