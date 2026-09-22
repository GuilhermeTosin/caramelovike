# Auditoria de seguranca - 2026-09-20

Base: checkout local da branch dev em 2026-09-20, worktree inicialmente limpo.
Auditoria de codigo e configuracao versionada; nao e uma certificacao do ambiente remoto.
Correcoes locais posteriores estao identificadas nos achados correspondentes. Nenhuma migration ou alteracao de dados remotos foi aplicada.

## Decisao

Recomenda-se resolver os achados P1 e conferir as permissoes efetivas do Supabase antes de promover esta versao a producao. Nao foi demonstrado um P0 (comprometimento universal sem condicoes). Isso nao reduz a urgencia do XSS e dos problemas de autorizacao.

P1 = alta, bloqueia a recomendacao de deploy; P2 = media, corrigir em seguida; P3 = endurecimento preventivo.
Os numeros abaixo sao identificadores estaveis para solicitar correcoes.

## 1. P1 - XSS persistente no endpoint SSR antigo (corrigido localmente em 2026-09-22)

- Evidencia: `api/ssr-dynamic.ts:256` interpola `JSON.stringify(input.jsonLd)` diretamente em um elemento script. Titulos, descricoes e comentarios de usuarios alimentam esse objeto. O arquivo exporta handler e `/api/(.*)` permanece acessivel em `vercel.json`.
- Cenario: um campo persistido contendo fechamento de script e um novo script pode executar JavaScript quando a vitima visita `/api/ssr-dynamic?kind=event&eventId=...`, ou a variante de negocio. Exige que o endpoint esteja implantado e configurado com a chave de servidor.
- Impacto: execucao na origem do site, com possibilidade de ler a sessao persistida pelo cliente Supabase e agir com as permissoes da vitima, inclusive de um administrador.
- Validacao: transpilei o handler real com TypeScript e executei em VM Node com fetch simulado. A resposta foi 200 e continha literalmente um novo elemento `<script>globalThis.__audit_marker=1</script>`. Nao foi inserido payload no banco e nao foi executado script na origem de producao.
- Correcao aplicada: `src/lib/safeScriptJson.ts` escapa `<`, `>`, `&`, U+2028 e U+2029 como sequencias Unicode, e `api/ssr-dynamic.ts` usa o helper antes de inserir JSON-LD em HTML. Os caracteres mantem o valor original quando o JSON e analisado.
- Validacao apos a correcao: typecheck, ESLint direcionado e `git diff --check` passaram. O payload foi demonstrado vulneravel antes desta alteracao; nao executei testes nem repeti a requisicao contra o endpoint nesta solicitacao.
- Aceite: serializacao nao contem literal `<`, impedindo que um valor feche a tag script; parsing JSON preserva o valor. Ainda e necessario publicar o codigo para corrigir a rota remota.

## 2. P1 - Proprietario pode alterar campos administrativos do negocio (corrigido localmente; migration pendente)

- Evidencia original: `supabase/migrations/00001_initial_schema.sql:90` e `:95` autorizavam insert/update pelo owner_id. `00016_business_moderation_queue.sql:5` adiciona moderation_status com default approved. A policy de editores em `00042` tambem permite update amplo. `00052` limita quantidade, mas nao protege esses campos.
- Cenario: conta comum chama a API de dados diretamente para criar um negocio aprovado ou aprovar seu negocio pendente/rejeitado; pode tentar alterar owner_verified e average_rating. owner_verified_until e usado pelo frontend, mas sua definicao nao esta integralmente versionada, exigindo inspecao remota.
- Impacto: bypass da moderacao, selo de confianca e reputacao adulterados. A policy do editor atribuido tambem permite updates amplos e exige revisar alteracoes de owner_id.
- Confianca: lacuna confirmada no schema versionado; explorabilidade em producao depende de grants e triggers adicionais instalados fora do repositorio.
- Correcao local: `supabase/migrations/00056_protect_business_admin_fields.sql` adiciona trigger que força negocios criados por usuarios comuns a iniciar pendentes e nao verificados; bloqueia alteracoes de moderacao/verificacao e titularidade por proprietarios e editores; registra admin e horario no banco; exige pedido aprovado e validade futura para o selo; e limita `average_rating` ao trigger interno de avaliacoes. A migration adiciona tambem policy de UPDATE para administradores, necessaria aos fluxos de moderacao e verificacao via cliente autenticado.
- Validacao local: `npm run typecheck`, `npm test` (22 arquivos, 104 testes) e `git diff --check` passaram. A migration nao foi executada: nao ha PostgreSQL local/psql nem Docker neste ambiente.
- Aceite/limites: pendente aplicar em `dev` e testar diretamente como anon, usuario comum, editor e admin. O schema remoto de verificacoes nao esta versionado por completo; o trigger usa as colunas `business_id` e `status` ja referenciadas pela migration `00024`. Nao afirmar corrigido em producao ate aplicar e verificar a migration remota.

## 3. P1 - Dados nao publicados podem ser lidos por caminhos alternativos (corrigido localmente; migration pendente)

- Evidencia A: `00001_initial_schema.sql:85` permite SELECT irrestrito de businesses; as migrations posteriores filtram as buscas, mas nao substituem essa policy publica.
- Evidencia B: `api/ssr-dynamic.ts:222` usa chave de servidor para buscar eventos por id, sem status published. A consulta do negocio associado tambem nao exige aprovacao.
- Cenario: leitura direta da tabela de negocios pode retornar pendentes/rejeitados; o endpoint legado pode retornar evento draft/archived se o id for conhecido, ignorando a RLS por usar chave privilegiada.
- Validacao: o handler real retornou 200 com um evento simulado em status draft; a URL consultada nao possuia filtro de status. A leitura irrestrita de businesses foi confirmada nas policies versionadas, nao testada com dados reais.
- Correcao local: `supabase/migrations/00057_restrict_unpublished_content.sql` remove a policy ampla versionada e aplica policies RLS de limite tambem contra policies permissivas configuradas fora do repositorio. Leitores anonimos veem apenas negocios aprovados; proprietarios, admins e editores atribuidos mantem acesso privado. Eventos publicos precisam estar `published` e, quando vinculados, pertencer a negocio aprovado; policies preservam acesso e gestao privada de donos/gestores/admins.
- Correcao local do SSR: `api/ssr-dynamic.ts` filtra `status=published`, verifica o status novamente mesmo usando service role, oculta evento associado a negocio nao aprovado, filtra e verifica negocios retornados, e desativa cache para evitar servir metadados privados obsoletos apos despublicacao.
- Regressao: `src/lib/ssrDynamicSecurity.test.ts` cobre evento draft, evento publicado ligado a negocio pendente, negocio pendente no SSR e evento publicado sem negocio. Typecheck, ESLint direcionado, build e 108 testes passaram.
- Aceite/limites: a migration nao foi executada; nao ha PostgreSQL local/psql nem Docker. `events` nao esta totalmente definida nas migrations existentes; os campos `status`, `owner_id` e `business_id` sao usados pela aplicacao, mas a policy e grants reais devem ser confirmados com consulta somente de leitura no schema de producao antes de aplicar. O endpoint legado nao foi chamado contra producao.

## 4. P1 - Perfil pessoal integral exposto pela policy publica (corrigido localmente; migration pendente)

- Evidencia: `00001_initial_schema.sql:9` inclui telefone e localizacao em profiles. `00006_fix_conversation_inserts.sql:102` recria SELECT USING (true). `00044` restringe escrita de role, mas nao restringe leitura de campos privados.
- Cenario: leitura direta de profiles permite coletar os campos pessoais disponiveis, mesmo quando a interface exibe somente nome/avatar.
- Impacto: coleta automatizada de telefones, localizacao e identificadores, facilitando spam e correlacao entre contas. Nao foi identificado email em profiles no schema inicial; nao se afirma vazamento de auth.users.
- Confianca: confirmado no schema versionado; grants reais devem ser conferidos.
- Correcao local: `supabase/migrations/00058_protect_private_profile_data.sql` remove a policy publica, revoga SELECT de anon e grants por coluna, restringe a tabela base a linha do proprio usuario/admin com teto RLS restritivo, e cria `public_profiles` com allowlist `id`, `name`, `avatar` e `created_at`. Consumidores publicos de negocios, marketplace, reviews, achadinhos e mensagens usam a view; perfil completo e `role` permanecem na tabela base para o usuario autenticado/admin.
- Validacao local: `npm run typecheck`, `npm test` (23 arquivos, 108 testes), ESLint direcionado, `npm run build` e `git diff --check` passaram. O build manteve o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`.
- Limites: nao ha PostgreSQL local/psql/Docker, e grants/policies do banco remoto nao foram consultados. Confirmar a existencia de `public.is_admin()` e das colunas usadas antes de aplicar. O metadata publico do vendedor continua incluindo `created_at` porque a interface exibe a data de entrada na comunidade.
- Aceite: apos aplicar a migration, anon nao pode consultar `profiles` nem via REST nem com grants por coluna; usuario autenticado comum le somente a propria linha na tabela base; admin le todas; anon/authenticated le apenas os campos allowlisted pela view. Nao declarar corrigido em producao antes de validar esses casos com chamadas reais.

## 5. P1 - Transferencia de negocio mantem acesso do antigo dono aos chats (corrigido no codigo local; migration pendente)

- Evidencia original: `00024_verified_badge_only_real_verification.sql:69` e `:128` adicionavam o novo dono em todas as conversas do negocio. `api/admin-users.ts` repetia a operacao. Nenhum desses caminhos removia o antigo dono. A RLS de mensagens autoriza por participacao.
- Cenario: apos transferencia administrativa, o antigo proprietario continua participante e pode ler/enviar mensagens nos chats existentes. O novo proprietario recebe todo o historico automaticamente, inclusive conversas legadas de contexto misturado.
- Impacto: exposicao continuada de comunicacoes de clientes a um ex-proprietario. Os chats passam a ter tres ou mais participantes, enquanto `getConversationPartner` assume apenas um parceiro.
- Correcao local: `supabase/migrations/00059_close_business_chats_on_transfer.sql` acrescenta iniciador e estado de encerramento, preenche iniciador legado pela primeira mensagem, fecha conversas com sinais de transferencia e mantem somente o iniciador historico. Um trigger atomico no owner_id fecha conversas antigas e remove os demais participantes; as RPCs deixam de anexar o novo owner; um trigger bloqueia novos membros em chats fechados; um teto RLS impede envio em chats encerrados. `api/admin-users.ts` nao sincroniza mais novos participantes; o popup e Perfil > Mensagens mostram o encerramento e nao oferecem composer.
- Modelo de identidade: `conversation_participants.user_id` e a identidade que concede acesso, vinculada a conta. `business_id` permanece como contexto da conversa, nao como autorizacao herdada por quem se torna dono.
- Validacao local: `npm run typecheck`, `npm test` (23 arquivos, 108 testes), ESLint direcionado, `npm run build` e `git diff --check` passaram. Nao ha PostgreSQL local/psql/Docker para executar a migration ou validar as policies reais. A limpeza de historico legado assume que o autor da primeira mensagem e o cliente que iniciou a conversa, como fazem os fluxos da aplicacao.
- Aceite pendente em banco: ex-proprietario e novo proprietario nao participam nem podem ler o chat antigo; o cliente iniciador conserva o historico sem poder enviar; conversas iniciadas apos a transferencia sao criadas com o owner atual. Verificar tambem transferencias por claim, e-mail e endpoint admin. Nao declarar corrigido em producao ate aplicar a migration e validar os casos.

## 6. P2 - Contato publico permite abuso de email/banco e injecao de HTML

- Evidencia: `supabase/functions/send-contact-email/config.toml:1` desliga verify_jwt; o handler nao possui CAPTCHA, limite de frequencia ou teto de tamanho. `index.ts:63` grava via service role e `:87` interpola os quatro campos no HTML do email. `00017_contact_messages.sql` permite inserts publicos diretamente na tabela, sem limite superior de tamanho.
- Impacto: consumo de quota de emails, banco e execucoes; inundacao da caixa de contato; insercao de links/conteudo enganoso no email recebido pela equipe. Nao se afirma envio para destinatarios arbitrarios: o destinatario vem da configuracao do servidor.
- Correcao: CAPTCHA validado no servidor, limites de frequencia e tamanho, escape de HTML ou corpo em texto simples e fechamento do insert anon direto que contornaria o endpoint.
- Confirmacao remota: verificar se ja existe rate limiting na infraestrutura, que nao esta versionado aqui.

## 7. P2 - Metadados comerciais de destaques ativos ficam publicos

- Evidencia: `00008_featured_placements.sql:15` inclui notes e price_cents. A policy de SELECT publico a partir da linha 32 filtra registros ativos, mas nao limita colunas.
- Impacto: anotacoes administrativas e precos comerciais de campanhas ativas podem ser consultados diretamente se houver grant SELECT publico. Exposicao independe das colunas escolhidas pelo frontend.
- Correcao: mover notas/precos para armazenamento administrativo ou expor uma view/RPC publica com somente os campos necessarios; revisar os grants reais.

## 8. P2 - Reputacao e validade de achadinhos podem ser manipuladas

- Evidencia: `00019_community_finds.sql:24` define upvotes, downvotes e expires_at na mesma tabela; as policies de insert/update, linhas 123-137, verificam apenas user_id.
- Cenario: proprietario pode informar diretamente contadores elevados e validade arbitraria. A interface de votos e seu indice unico nao impedem alteracoes diretas nos contadores.
- Correcao: reservar contadores ao banco, derivar a validade no servidor e restringir colunas de insert/update. Rever tambem a funcao de recomputacao, que atualmente executa como invoker e depende das permissoes do votante.

## 9. P2 - Avaliacoes sem unicidade por autor e negocio

- Evidencia: `00002_create_reviews_table.sql:5` nao define UNIQUE(business_id,user_id); a policy de insert confere apenas auth.uid() = user_id. user_name tambem e fornecido pelo cliente, assim como business_id em updates.
- Cenario: uma conta envia varias avaliacoes ao mesmo negocio, controlando o nome exibido; uma avaliacao existente pode ser movida entre negocios via update, afetando o calculo agregado.
- Impacto: fraude de reputacao e atribuicao enganosa. O atacante nao pode falsificar user_id de outra conta por essa policy, mas pode falsificar o nome textual exibido.
- Correcao: unicidade por autor/negocio, identidade derivada de profiles e imutabilidade dos campos de autoria/destino. Decidir se autoavaliacao sera permitida e testar a atualizacao do agregado.

## 10. P2 - Eventos de analytics podem ser forjados anonimamente

- Evidencia: `00030_fix_business_click_events_access.sql:10` usa WITH CHECK(true) e concede INSERT a anon/authenticated. user_id, created_at e business_id sao aceitos como dados da linha.
- Impacto: inflacao de metricas, falsa atribuicao de cliques a usuarios e armazenamento abusivo. Uma chave publica nao e segredo e nao protege esse endpoint.
- Correcao: funcao de ingestao com identidade e horario derivados no servidor, limite de frequencia, validacao de negocio publicado e acesso direto de escrita restrito.

## 11. P2 - Localizacao por IP usa cache compartilhado (corrigido localmente; deploy pendente)

- Evidencia: `api/geoip.ts:24` define s-maxage=300 e stale-while-revalidate=3600 para uma resposta calculada a partir do IP, sem variar a chave por usuario.
- Cenario: usuarios que acessam a mesma URL por um cache compartilhado podem receber cidade/coordenadas aproximadas obtidas para outro visitante.
- Impacto: exposicao de localizacao aproximada entre visitantes e resultados regionais incorretos. O comportamento efetivo depende da politica do CDN.
- Correcao local: `api/geoip.ts` remove `s-maxage` e `stale-while-revalidate` e usa `Cache-Control: private, no-store`, `CDN-Cache-Control: no-store` e `Vercel-CDN-Cache-Control: no-store`, alem de `Pragma`/`Expires` como compatibilidade. O cliente envia `cache: no-store` ao chamar o endpoint. O cache de 24 horas em `localStorage` permanece no proprio navegador e nao e compartilhado pelo CDN.
- Validacao: `src/lib/geoipCache.test.ts` confirma as politicas de resposta e que o fetch cliente usa `no-store`; ESLint direcionado, `npm run typecheck`, `npm test` (24 arquivos, 110 testes), `npm run build` e `git diff --check` passaram. O build mantem o aviso preexistente de top-level await em `src/pages/BusinessPageRoute.tsx`.
- Limite/acao de deploy: nao verifiquei o CDN remoto. Respostas ja armazenadas pela politica antiga podem persistir ate invalidadas ou ate a expiracao da janela stale; invalidar `/api/geoip` apos deploy quando possivel e confirmar os cabecalhos publicados. Um endpoint GeoIP externo configurado controla sua propria politica de resposta.

## Endurecimento e lacunas de verificacao

- Nao ha CSP, frame-ancestors/X-Frame-Options ou politica equivalente versionada para toda a aplicacao. Conferir headers reais do deploy; configurar defesa contra clickjacking e CSP compativel com Vike/Maps/analytics.
- Uploads: as migrations definem regras para o prefixo Marketplace, mas nao versionam toda a configuracao do bucket business-images, limites/MIME nem policies antigas. Policies permissivas sao combinadas; uma policy antiga ampla pode anular a restricao nova. Nao foi demonstrado acesso indevido a arquivos de terceiros.
- As definicoes completas de events, business_verification_requests, business_reports, search_settings e outras estruturas usadas pelo app nao estao todas reproduzidas nas migrations. O arquivo production-schema.sql tem zero bytes. Nao e possivel atestar RLS dessas tabelas a partir deste checkout.
- MFA/reauthentication administrativa, CAPTCHA do Auth, limites de login/reset, validade de sessoes e allowlist de redirects devem ser conferidos no Supabase. Sua ausencia no frontend nao prova que estejam desativados no servico.
- A paginacao recente de mensagens usa somente created_at como cursor. Empates no limite da pagina podem omitir mensagens mais antigas com o mesmo timestamp; nao sao recuperadas por outra chamada com o mesmo filtro estrito. E um defeito de integridade/UX, nao uma nova quebra de autorizacao. Recomenda-se cursor composto (created_at,id) e tratamento de erros sem confundi-los com historico vazio.

## Protecoes presentes

- API administrativa valida o token no Auth e consulta role no servidor; nao confia no papel enviado pelo navegador.
- A migration 00044 protege role por trigger e por privilegios de coluna.
- A migration 00051 remove escrita direta de participantes e impede reescrita de autor/texto/conversa em mensagens.
- A migration 00045 protege transicoes de moderacao do Marketplace.
- O renderizador principal ja escapa '<' ao serializar JSON e os pins de mapa escapam nomes antes de inserir HTML.
- `.env*` nao aparece nos arquivos rastreados consultados. Uma busca por alguns padroes comuns de chaves privadas/secretas nao encontrou correspondencias nos arquivos de codigo pesquisados. Isso nao equivale a uma varredura de todo o historico Git nem garante ausencia de segredos.

## Verificacoes realizadas e limites

- Revisao de migrations 00001-00055 por superficie de permissao, com leitura integral dos caminhos relevantes e conferencia de redefinicoes posteriores.
- Revisao de autenticacao/recuperacao, APIs, SSR principal/legado, contatos, uploads, conversas, transferencia de dono e exibicao de HTML.
- Reproducao local do handler SSR com fetch simulado: status 200; novo script presente no HTML; evento draft retornado.
- npm audit e npm audit --omit=dev: zero vulnerabilidades reportadas na consulta desta auditoria. Isso se refere ao banco de advisories e ao lockfile, nao as falhas da aplicacao listadas acima.
- Nao executei ataques, inserts, envios de email, SQL de escrita ou carga contra producao. Nao executei os testes SQL porque nao havia banco descartavel configurado e validado para isso.
- Nao medi explorabilidade no CDN nem consultei registros pessoais reais. Os achados baseados em migrations exigem confirmacao de grants/policies/triggers reais.

## Ordem sugerida de tratamento

1. Remover/corrigir o SSR legado (1 e parte de 3).
2. Conferir schema efetivo e proteger campos/leituras de negocios e perfis (2, 3, 4).
3. Corrigir transferencia de acesso a conversas (5).
4. Fechar abuso de contato, metadados publicos e manipulacao de reputacao/metricas (6-10).
5. Corrigir cache por IP e concluir o endurecimento do deploy (11 e lacunas).

O arquivo `security-audit-readonly.sql` contem consultas de metadados para a conferencia remota; nao aplica correcoes nem lista mensagens/perfis de usuarios.

## Referencias tecnicas

- Supabase: https://supabase.com/docs/guides/database/postgres/column-level-security
- Supabase: https://supabase.com/docs/guides/database/postgres/row-level-security
- OWASP: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
- OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
