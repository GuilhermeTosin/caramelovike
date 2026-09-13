# Caramelinho: auditoria de design, UX, acessibilidade e usabilidade

Data: 13 de setembro de 2026. Ambiente: localhost:3000.

## Parecer

O Caramelinho tem uma identidade com potencial: mascote reconhecível, nome memorável, uma promessa útil e uma combinação de caramelo, verde e creme que combina com acolhimento e comunidade. Eu preservaria esses elementos.

A evolução mais importante é transformar o catálogo em uma experiência de descoberta local. Hoje, a interface oferece muitas entradas, mas nem sempre deixa claro o que está perto do visitante, o que é global e qual é a próxima ação. Algumas escolhas também passam sensação de pouca atividade: grandes grades com um único item, categorias vazias e blocos estatísticos antes do conteúdo útil.

Minha direção seria: **uma comunidade brasileira próxima, confiável e em movimento**, com busca fácil, conteúdo real e contato rápido. A modernidade deve vir da clareza, da tipografia, das imagens e das respostas da interface, sem depender de excesso de animação.

## Escopo e limites

Avaliação visual e de navegação no navegador, com desktop em 1440 x 900 e mobile em 390 x 844 e 360 x 800. Foram percorridos: home, marketplace, categoria sem resultados, diretório, busca de negócios, filtros, página de negócio, detalhe de produto, menu, cadastro e login.

Usei capturas de tela, árvore de acessibilidade, dimensões de elementos e estilos computados. Consultei pontualmente o código do login para conferir o destino após autenticação. Não enviei mensagens, denúncias, avaliações ou cadastros. Não fiz login, teste em aparelho físico, auditoria completa com leitor de tela, Lighthouse ou medição de Core Web Vitals. Eventos completos, área autenticada e publicação após login precisam de uma segunda rodada. O viewport mobile continua sendo um navegador desktop redimensionado, com scrollbar própria.

As constatações abaixo se referem ao localhost e aos dados exibidos nesta sessão. Propostas e metas não são funcionalidades já implementadas nem resultados medidos com usuários.

## 1. Prioridades confirmadas

| Prioridade | Evidência observada | Consequência | Melhoria recomendada |
|---|---|---|---|
| P0 | Em 360 px, a seção da home tinha cerca de 345 px úteis, mas o H1 e a descrição cerca de 398 px. A seção usava overflow hidden. | Texto e conteúdo cortados sem uma rolagem que permita recuperá-los. | Corrigir largura mínima dos filhos, grid/flex, quebra dos textos e dimensões dos CTAs. Validar também 320, 375 e 390 px. |
| P1 | Header com aproximadamente 200 px de altura em 390 x 844. Em 360 px, input de busca com 131 px de largura total, incluindo seus espaços internos. | Pouco espaço para digitar e pouca área para resultados. | Header compacto, busca em largura útil maior e localização como controle resumido. |
| P1 | Na página CHAVES ADVOGADOS, o WhatsApp estava aproximadamente a 1.608 px do topo no mobile. | O visitante percorre descrição e blocos antes de chegar ao contato. | Contato junto ao título e barra inferior contextual em páginas de detalhe. |
| P1 | Links de contato com cor computada rgb(249,115,22), tamanho 14 px, sobre branco. | Contraste calculado de aproximadamente 2,80:1, insuficiente para texto normal. | Usar caramelo escuro ou verde para texto; reservar laranja vivo para destaques compatíveis. |
| P1 | Cidade Montreal no header; novidade inicial em Baronissi, Itália; contagens globais de categorias com links para busca local. | Expectativa geográfica ambígua. | Declarar o escopo de cada seção e fazer contagem, destino e título usarem o mesmo contexto. |
| P1 | Campos da busca do header sem label associado e sem aria-label. Comboboxes do modal de filtros sem nomes próprios na árvore. | Identificação dependente de placeholder ou valor atual. | Nome persistente para cada campo: busca, cidade, categoria, país e distância. |
| P1 | Paginação mobile da busca com link e botão sem nome na árvore acessível. | Leitor de tela não explica o destino das setas. | Nomear Página anterior/Próxima página e indicar a página atual. |
| P1 | Entrar para conversar leva a /entrar sem redirect; o login usa /perfil quando não recebe esse parâmetro. | A autenticação interrompe a intenção de contatar aquele vendedor. | Preservar o anúncio e retornar ao início da conversa após autenticação. |
| P2 | Marketplace com zero resultados mantém paginação e só sugere tentar outra busca. | Saída pouco acionável. | Botões para limpar categoria, ampliar raio e publicar naquela categoria. |
| P2 | O único H1 do marketplace fica oculto no mobile junto ao bloco desktop. | Falta um título de página exposto para orientação. | Manter H1 compacto ou visualmente oculto, mas acessível. |
| P2 | Diretório apresenta descrição e painel estatístico antes dos países, que começam perto do fim da primeira tela mobile. | O visitante precisa rolar antes de escolher destino. | País/cidade primeiro; panorama depois ou recolhido. |

P0: corrigir antes da próxima rodada de refinamento. P1: alto impacto em acesso, confiança ou conversão. P2: melhoria importante de organização e eficiência.

## 2. Home: acolher e levar à ação

### O que manter

Manter mascote, slogan e faixa tricolor como assinatura. O fundo creme dá personalidade e evita aparência fria de ferramenta administrativa. As fotografias reais ajudam a mostrar que existe uma comunidade por trás do produto. Há bons títulos de seção e CTAs já compreensíveis, como Explorar negócios e Ver produtos.

### O que mudar

O hero tem título longo, texto de apoio, dois botões, três descritores, quadro de recém-chegados, duas outras entradas para diretório/marketplace e estatísticas. Há repetição de caminhos e um volume alto antes das listas úteis.

No desktop, reduzir o espaço vertical do hero e simplificar a moldura verde do quadro lateral. Apresentar uma composição editorial mais leve: proposta principal de um lado e dois ou três negócios reais do outro. Os títulos precisam aparecer em duas linhas quando necessário, evitando truncar o nome da empresa logo na apresentação.

No mobile, usar uma mensagem curta, como “Seu Brasil, mais perto.”, com apoio explícito: “Negócios, produtos e encontros da comunidade brasileira em Montreal.” Essa é uma proposta de texto a testar, não uma substituição automática. A busca do header continua sendo a busca principal; não acrescentar outra searchbar à home.

Ordem proposta no mobile:

1. Marca e busca compacta, com localização clara.
2. Mensagem curta de acolhimento.
3. Categorias ou necessidades mais procuradas na região.
4. Negócios próximos, com informações suficientes para decidir.
5. Produtos recentes e encontros futuros, quando houver conteúdo.
6. Histórias da comunidade e convite para publicar.
7. Exploração global e footer.

As estatísticas devem apoiar a confiança, sem ocupar uma seção dominante. A home mostrou “15 categorias”, enquanto havia 16 entradas contando Outros; o diretório apresentou 79 tipos. Definir e explicar essa taxonomia para que os números sejam compreensíveis.

### Local versus global

Usar “Perto de Montreal” e “Novidades pelo mundo” como seções distintas. Se houver poucos resultados locais, dizer: “Ainda temos poucas opções por aqui. Veja também novidades pelo mundo.” Não alterar silenciosamente o alcance da lista.

Um link com “273 negócios no mundo” deve levar ao escopo global. Se leva a Montreal, mostrar a contagem local ou omitir a contagem até conhecê-la.

## 3. Header e navegação

No desktop, os três ícones de modalidade são discretos e exigem interpretação. Expor os nomes Negócios, Produtos e Eventos no seletor ou em uma navegação curta. Usar Publicar como ação principal e deixar clara a diferença entre criar conta, cadastrar negócio e publicar produto.

No mobile, preservar o reconhecimento da logo, mas evitar que ela determine uma altura excessiva. Proposta: uma linha de marca/menu e outra de busca; a cidade pode aparecer como chip “Montreal · 50 km”, abrindo um painel próprio. O seletor de modalidade deve ter texto no estado ativo, em vez de três ícones competindo com o campo de digitação.

O menu observado oferece Marketplace, Entrar e Cadastrar negócio. Acrescentar entradas explícitas para Negócios e Eventos. Escolher uma taxonomia única: Produtos na navegação pode ser mais compreensível que alternar entre Produtos e Marketplace sem explicação.

Evitar somar header alto, navegação inferior global e barra fixa de ação em todas as páginas. Se houver barra inferior, aplicá-la onde ajuda: Falar com o negócio ou Falar com o vendedor no detalhe.

## 4. Busca e diretório

A busca é mais direta que o diretório: no mobile testado, já mostrava o total e o primeiro negócio abaixo dos controles. Preservar essa orientação para resultados.

Melhorar a organização dos filtros:

- Mostrar resumo editável: Montreal · até 50 km · Todas as categorias.
- Separar modalidade Eventos do conjunto de filtros de Negócios; hoje há acesso a eventos no header e também um switch no modal.
- Definir uma fonte única para localização. O seletor País apareceu sem valor enquanto o header e a consulta já usavam Montreal/Canadá.
- Mostrar quantidade de filtros ativos no botão.
- No painel mobile, manter rótulos, Limpar e uma ação final como Ver resultados.
- Adicionar ordenação apenas com critérios realmente suportados: relevância, distância e recentes.

O diretório funciona como exploração global e estrutura de descoberta por país. Deve ser apresentado como tal, sem prometer proximidade. Adicionar um atalho “Ir para Montreal” usando a cidade já escolhida e permitir pesquisar país/cidade sem atravessar várias telas.

Nos cards, limitar o resumo a uma frase útil e remover URLs soltas da descrição resumida. Evitar que o nome acessível do link contenha toda a descrição longa do negócio. Distâncias precisam comunicar origem e precisão: “distância aproximada do centro de Montreal” é diferente de distância até o usuário.

## 5. Marketplace

### Mobile

A linha horizontal de categorias e as duas colunas são boas bases. Manter duas colunas e 12 anúncios por página, conforme a decisão anterior. A amostra tinha apenas um anúncio, portanto não foi possível validar visualmente uma página cheia com 12 itens.

Deixar uma parte do próximo chip aparente para indicar rolagem, garantir que a categoria selecionada venha para a área visível e oferecer Todas as categorias em um painel opcional. A rolagem horizontal deve continuar acessível por teclado.

Separar o total de resultados das ações Publicar e Meus anúncios. Na largura testada, os três textos quebram em linhas e disputam a mesma faixa. Publicar merece um botão claro; Meus anúncios pode ficar no menu da conta.

Nos cards, priorizar foto, título, preço e cidade. Categoria e data ficaram muito pequenas e truncadas. Usar metadados curtos ou mover os menos decisivos para o detalhe. Esconder paginação quando só existir uma página, especialmente em estado vazio.

### Desktop

O hero com formulário e grade de categorias ocupa quase toda a primeira dobra; o produto começa perto do fim da tela. Reduzir esse bloco, eliminar a duplicação de busca com o header e usar categorias compactas. Filtros podem ficar em uma barra ou lateral curta.

### Detalhe

Manter a explicação de que o contato pela plataforma evita expor telefone/e-mail. Preservar o anúncio ao entrar na conta. Recolher Denunciar anúncio em uma ação secundária que abre um painel, em vez de manter o formulário inteiro exposto ao lado do contato.

Para Vagas de emprego, prever campos próprios: cargo, local/remoto, tipo de contratação, empresa e candidatura. Condição do produto e preço de venda não descrevem bem uma vaga. Essa evolução exige definição de produto e modelo de dados.

## 6. Confiança e qualidade dos dados

A foto de Baixo Fender exibiu uma arte de perfil feminino; CHAVES ADVOGADOS e Les Brasileirinhos mostraram imagem de loja de roupas. Não determinei se são uploads, placeholders ou dados de demonstração. Independentemente da origem, a associação visual enfraquece a confiança.

Implementar fallback neutro por categoria, sem simular uma fotografia real daquele estabelecimento. Dar instruções de upload com exemplos e prévia do corte. Priorizar fotos autênticas, logo correta, categoria específica e descrição curta revisada.

Na página jurídica, a classificação Outros levou a sugestões de capoeira e acessórios como similares. Priorizar atividade, serviços e localização; quando só houver proximidade geográfica, chamar de Outros negócios na região.

Não mostrar nota 0,0 quando não existem avaliações. Usar Ainda sem avaliações, sem transmitir julgamento negativo. Ocultar o histograma vazio e apresentar um convite curto para avaliar. Explicar o que significa Verificado; identidade confirmada não é garantia de qualidade.

Evitar destacar “1 negócio verificado” entre 800 como principal prova de confiança. Preferir informações úteis por cadastro: atualização, contato disponível, atendimento em português e confirmação do responsável, apenas quando houver evidência.

## 7. Página de negócio e conversão

O conteúdo é rico, mas a ação principal precisa ficar perto do nome. No desktop, tornar o painel de contato facilmente acessível durante a leitura, cuidando para que não cubra conteúdo. No mobile, incluir CTA próximo ao título e barra inferior contextual com uma ação primária e outra secundária.

Reduzir a altura da capa mobile quando ela não acrescenta informação. Resumir a apresentação antes do texto completo: atividade, cidade, atendimento presencial/online e idiomas confirmados. Um serviço descrito como 100% remoto não deveria dar a Ver rota o mesmo destaque de Contato sem explicar onde atende.

Se não há fotos, não reservar um bloco grande com Nenhuma foto disponível. Mostrar seções conforme o conteúdo. Horários precisam ser dados confirmados, não apenas um preenchimento conveniente. Avaliação de usuário não autenticado deve avisar sobre login antes de incentivar uma escrita longa e preservar o rascunho se houver autenticação.

## 8. Cadastro e login

O cadastro tem quatro campos claros e um formulário simples. Entretanto, Cadastrar negócio desemboca em Criar Conta sem explicar as próximas etapas. Usar um texto como “Crie sua conta para cadastrar seu negócio gratuitamente”, se essa continuar sendo a política do produto, e indicar a sequência Conta → Negócio → Revisão.

Diminuir o espaço acima do formulário no mobile e considerar um header simplificado para autenticação. A busca de negócios não é a tarefa principal nessa tela. Adicionar controle para mostrar senha, preenchimento automático adequado e mensagens de erro junto ao campo. Preservar dados após falha e explicar confirmação de e-mail se fizer parte do fluxo.

O retorno do login deve guardar a intenção: contato, favorito ou publicação. O caminho observado de contato do produto perde essa referência porque não passa o parâmetro redirect já suportado pelo login.

## 9. Acessibilidade

Esta avaliação não é uma certificação WCAG. Há, porém, correções concretas e critérios de aceite:

| Tema | Ação e verificação |
|---|---|
| Contraste | Substituir laranja claro nos textos pequenos. Buscar pelo menos 4,5:1 em texto normal e 3:1 em texto grande, conforme as exceções do critério. Medir também estados hover, foco e erro. |
| Campos | Labels persistentes e nomes programáticos. Não depender só do placeholder ou do valor selecionado. |
| Teclado | Adicionar Pular para o conteúdo, ausente na home inspecionada. Validar sequência de Tab, foco visível, fechamento de painéis e retorno do foco sem mudar o viewport durante o teste. |
| Header fixo | O elemento focado não pode ficar totalmente coberto. Aplicar offsets de rolagem onde necessário. |
| Toque | Adotar 44 x 44 px como objetivo de conforto para ações principais. O mínimo AA de 24 x 24 px tem exceções e regras de espaçamento; não confundir objetivo de produto com exigência universal. |
| Hierarquia | Garantir H1 acessível no marketplace mobile e uma identificação clara da página de resultados. |
| Idioma | Traduzir o botão Close do modal para Fechar filtros. |
| Resultados | Anunciar quantidade atualizada e erros de forma discreta, sem ler novamente toda a lista. |
| Cards | Nome do link curto e específico. Evitar repetição de nome por alt da imagem e textos extensos no mesmo link. |
| Movimento | Respeitar preferência por movimento reduzido. Se houver rotação automática de carrossel, fornecer pausa e não trocar conteúdo durante interação. |

Referências: [Contraste WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum), [Tamanho mínimo de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum), [Foco não encoberto](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

## 10. Direção visual: convidativo, vivo e moderno

Estabelecer papéis para as cores: creme como ambiente, verde para orientação e confiança, caramelo escuro para marca e ações textuais, azul para informação secundária. A faixa tricolor já representa o Brasil; não é necessário repetir as três cores em cada componente.

Definir uma escala de títulos, corpo e metadados. Como ponto de partida, corpo de 16 px e metadados úteis próximos de 13–14 px no mobile, ajustados por teste. Usar duas linhas para títulos de cards e reservar caixa alta para rótulos curtos. Reduzir a quantidade de caixas dentro de caixas, sombras e molduras pesadas.

Trazer vida com pessoas e acontecimentos reais: histórias curtas de empreendedores, novos negócios com data verdadeira, encontros futuros e coleções locais. O mascote pode acolher em onboarding e estados vazios sem ocupar a primeira dobra inteira. Animar entradas e confirmações brevemente; não usar animação para disfarçar demora.

As seções devem se adaptar ao acervo. Uma única oferta pode virar um destaque editorial compacto, em vez de um card isolado numa grade enorme. Nunca preencher vazio com números, depoimentos ou atividade inventados.

## 11. Novas implementações propostas

| Implementação | Valor | Dependências e cuidado |
|---|---|---|
| Home da cidade | Torna a descoberta imediatamente relevante. | Contexto de localização único, contagens coerentes e alternativa global explícita. |
| Coleções curadas | Exemplos: Sabores do Brasil em Montreal, Serviços para quem acabou de chegar. | Curadoria real e responsabilidade por atualização. |
| Guia para recém-chegados | Ajuda por necessidade, além da taxonomia de empresas. | Conteúdo revisado; separar orientação geral de serviços comerciais. |
| Favoritos e vistos recentemente | Facilita voltar e comparar. | Favorecer continuidade após login e política clara de armazenamento. |
| Busca salva com alertas | Útil para produtos raros ou novas vagas. | Implementar depois de haver volume suficiente; adesão explícita e cancelamento fácil. |
| Perfil de anunciante mais claro | Aumenta confiança no marketplace. | Dados verificáveis, anúncios ativos e regras de privacidade. |
| Qualidade do cadastro | Melhora fotos, categorias e informações desatualizadas. | Checklist para o dono, prévia mobile e lembrete de atualização. |
| Agenda local | Torna o site recorrente, não apenas consultivo. | Eventos futuros suficientes e processo para remover eventos encerrados. |

Evitaria começar por feed social genérico, chat automático ou notificações frequentes. O maior retorno inicial está em descoberta, conteúdo confiável e contato simples.

## 12. Plano de execução e critérios de sucesso

### Etapa 1: remover obstáculos

Corrigir corte da home, contraste, labels e paginação acessível; compactar header mobile; aproximar o contato do título; preservar destino após login. Confirmar qualidade das imagens e substituir nota zero por estado sem avaliações.

Aceite: texto completo em 320–430 px; uso por teclado sem bloqueio; contraste aferido; contato visível sem atravessar toda a descrição; retorno ao anúncio após login. A home em 360 px deve deixar de cortar seu conteúdo mesmo sem aumentar a tela.

### Etapa 2: simplificar a descoberta

Unificar escopo geográfico, reduzir hero do marketplace desktop, reorganizar diretório, melhorar cards e estados vazios. Manter seleção de filtros e posição de leitura ao voltar de um detalhe.

Aceite: títulos, contagens e resultados concordam sobre o local; visitantes entendem onde ampliar a busca; primeiro anúncio ou estado vazio acionável aparece na primeira dobra de referência do marketplace mobile quando os dados chegam.

### Etapa 3: reforçar comunidade

Implementar home local, coleções, histórias e agenda conforme disponibilidade de conteúdo. Criar fluxo de qualidade para anunciantes e linguagem específica para vagas.

### Etapa 4: medir e iterar

Instrumentar, com privacidade, busca realizada, resultados vazios, detalhe aberto, contato iniciado, início/conclusão de cadastro e publicação. Separar desktop/mobile e região. Não registrar conteúdo privado das mensagens nem consultas potencialmente sensíveis sem necessidade e avaliação adequada.

Métricas: tempo até encontrar um resultado útil, proporção de buscas sem resultado, conversão de detalhe em contato, abandono durante login, conclusão de cadastro e retorno de visitantes. Para desempenho real, medir LCP, INP e CLS em produção; não inferir nota de velocidade a partir do localhost.

Fazer sessões curtas com brasileiros recém-chegados e residentes de longa data. Tarefas: encontrar comida brasileira, localizar um profissional, contatar vendedor, mudar cidade e publicar algo. Observar hesitações, não apenas pedir opinião estética. Incluir pessoas que navegam por teclado, usam ampliação ou leitor de tela.

## Decisão recomendada

Começar por header, home mobile e contato no detalhe. Essa combinação torna o site mais fácil de usar imediatamente. Depois, alinhar conteúdo e localização para que a experiência pareça próxima e confiável. O refinamento visual deve acompanhar essas mudanças, preservando a personalidade do Caramelinho.
