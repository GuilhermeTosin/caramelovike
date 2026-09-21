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
