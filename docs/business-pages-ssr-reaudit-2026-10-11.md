# Reauditoria das Quatro Correcoes de Negocios

Data: 2026-10-11 13:37:14 -04:00 (America/Toronto).
Escopo: worktree local da branch dev, build atualizado de producao, handler real `api/ssr.js` e browser in-app. Supabase somente leitura; falhas e mutacoes simuladas em processos locais.
Decisao: os quatro cenarios originais estao corrigidos. O caso residual P2 da exclusao de avaliacao foi corrigido localmente: a tela atualiza o snapshot antes do refetch e permite nova tentativa se a sincronizacao falhar. A validacao estatica passou; o fluxo de falha ainda precisa de nova simulacao e o deployment Vercel precisa de smoke test.

## Achado Residual

### P2 - Exclusao confirmada seguida de falha no refresh preservava a avaliacao removida

- Referencias atuais: `src/pages/BusinessPage.tsx:758` (exclusao e atualizacao otimista), `src/pages/BusinessPage.tsx:371` (refetch com resultado booleano), `src/pages/BusinessPage.tsx:911` (estado quando negocio nao carregou) e `src/pages/BusinessPage.tsx:1326` (aviso e nova tentativa).
- A regra que preservava listas maiores foi removida corretamente. Quando a consulta funciona, `setBusiness(localizeBusiness(biz))` atualiza a lista e a nota.
- Entretanto, `handleDeleteOwnReview` espera `loadBusiness` depois que `deleteReview` confirma sucesso. Se o lookup falha, `loadBusiness` captura o erro, marca `businessLoadFailed` e retorna sem atualizar `business`. O handler entao mostra `Avaliação removida!`.
- O alerta de indisponibilidade so e renderizado dentro de `if (!business)`. Nesse caso, o negocio carregado ainda existe em memoria; portanto, a pagina continua mostrando a avaliacao excluida e a nota antiga, sem exibir esse alerta.
- Reproducao isolada: extrairam-se os handlers atuais de `BusinessPage.tsx`, transpilaram-se com TypeScript e executaram-se em VM com setters de estado e servicos simulados. Estado inicial: avaliacoes de notas 5 e 1, media 3. `deleteReview` retornou true; `getBusinessBySlug` lancou erro 503. Resultado: ambas as avaliacoes continuaram no estado, media 3, `businessLoadFailed=true` e toast de sucesso.
- Nenhuma avaliacao real foi excluida. A simulacao valida o fluxo dos handlers; a condicao de apresentacao foi confirmada por revisao do JSX, sem uma exclusao autenticada no browser.
- Correcao local em 2026-10-11 14:12:45 -04:00: apos a exclusao confirmada, a pagina remove o registro local e recalcula nota e distribuicao. `loadBusiness` retorna sucesso/falha; em falha, um aviso oferece nova tentativa e a avaliacao removida nao volta ao snapshot. Em sucesso, o snapshot inteiro e atualizado pelo servidor.
- Validacao desta correcao: typecheck, ESLint direcionado, verificacao de encoding e `git diff --check` passaram. A simulacao de falha descrita acima nao foi repetida apos a mudanca, e nao houve exclusao real.

## Resultado por Correcao

| Correcao | Resultado local | Evidencia |
| --- | --- | --- |
| Hidratacao em regioes de tres letras | Aprovada nos casos exercitados | Carregamentos completos em `eng`, `idf` e comparativo `qc`; cliente montado, interacao com Fotos, navegacao interna em Londres; console sem erros ou warnings. Helper compartilhado coberto por 12 testes, incluindo `nsw`. |
| Erro temporario vira 404/noindex | Aprovada nos casos exercitados | Falhas 503 injetadas em lookup canonico completo, lookup por pais, historico dinamico, tombstone e link curto produziram HTTP 503 sem noindex. Ausencia real produziu 404 com noindex. |
| Avaliacoes excluidas preservadas por contagem | Correcao local aprovada estaticamente; reteste de falha pendente | Simulacoes anteriores confirmaram atualizacao quando o refetch funciona e reproduziram o P2 anterior. A implementacao agora remove localmente e mostra nova tentativa em falha; validacao de runtime desta nova resposta pendente. |
| Teste SEO depende de texto removido | Aprovada | Script terminou com 21 verificacoes e nenhum skip, incluindo sitemap de negocios e pagina de categoria. |

## SSR e SEO

- Novo bundle gerado por `npm run build`: typecheck e 29 arquivos/148 testes passaram. `npm run lint` global passou.
- Servidor temporario em `127.0.0.1:3104`: importou `dist/server/entry.mjs` e executou `api/ssr.js` para as paginas, servindo assets do build e o handler real `api/sitemap-businesses.js` para o sitemap de negocios.
- HTTP 200, H1 e tres blocos JSON-LD parseaveis em `/ca/qc/montreal/tapi-go`, `/gb/eng/londres/elohim-sabor-brasileiro` e `/fr/idf/paris/bref-design-art`. Nenhum campo serializado `ownerId`, `ownerName` ou `owner_id` foi encontrado nesses HTMLs.
- O browser exibiu os tres negocios com o cliente montado e nao registrou erros React 418/422. A navegacao Elohim -> Angel's Bakery tambem atualizou a pagina sem erro no console.
- O script `scripts/check-seo-ssr.mjs` rodou com `SEO_REQUIRE_SITEMAP=1` no handler compilado. Verificou home, institucionais, diretorios, negocio, redirects 301, rotas invalidas 404/noindex, busca noindex, sitemap index, sitemap estatico e sitemap de negocios.
- A pagina de categoria descoberta no sitemap `/negocios/ca/ab/calgary/cabeleireiras-brasileiras` tambem passou.

## Matriz de Erros HTTP

| Falha simulada | Rota | Status | Robots |
| --- | --- | --- | --- |
| businesses | `/ca/qc/montreal/tapi-go` | 503 | index,follow,max-image-preview:large |
| businesses | `/ca/tapi-go` | 503 | index,follow,max-image-preview:large |
| business_slug_history | `/ca/qc/montreal/slug-historico-auditoria` | 503 | index,follow,max-image-preview:large |
| business_url_tombstones | `/ca/qc/montreal/slug-inexistente-auditoria` | 503 | index,follow,max-image-preview:large |
| business_short_links | `/go/santos-design` | 503 | index,follow,max-image-preview:large |
| Sem falha; slug ausente | `/ca/qc/montreal/slug-inexistente-auditoria` | 404 | noindex,nofollow,noarchive |

As falhas foram injetadas somente no fetch do processo local para a tabela alvo; os demais fetches continuaram normais. O caminho de historico dinamico usou um slug de teste para exercitar a consulta de historico; aliases legados conhecidos que usam mapa local foram validados separadamente pelos redirects do teste SEO.

## Limites e Encerramento

- Auditoria local: nenhum deployment Vercel foi promovido ou testado nesta execucao.
- Nenhuma migration, commit ou escrita remota. Escritas autenticadas reais continuam fora desta verificacao.
- O build conserva o aviso tolerado de top-level await em `BusinessPageRoute.tsx:7`; os carregamentos de producao no browser exercitados passaram.
- As respostas 503 simuladas emitiram avisos de hook acima de quatro segundos; isso ocorreu durante a indisponibilidade injetada e nao constitui uma medicao de latencia normal.
- Aba e servidor temporarios encerrados. Harness temporario removido. O sitemap regenerado pelo build foi restaurado, pois estava limpo antes desta auditoria. Alteracoes preexistentes preservadas.
- Para concluir a aprovacao dessas quatro correcoes: repetir a simulacao de falha apos a implementacao e fazer smoke test no deployment que sera promovido.
