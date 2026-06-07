# Caramelinho.com

Diretório internacional de negócios, serviços, eventos e achadinhos da comunidade brasileira no exterior.

O Caramelinho permite descobrir empresas brasileiras por nome, categoria, cidade, país e proximidade; consultar páginas públicas otimizadas para mecanismos de busca; publicar eventos e achadinhos; avaliar negócios; trocar mensagens; e administrar cadastros, verificações, denúncias, destaques e transferências de propriedade.

## Sumário

- [Visão geral](#visão-geral)
- [Principais funcionalidades](#principais-funcionalidades)
- [Stack tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Estrutura de diretórios](#estrutura-de-diretórios)
- [Pré-requisitos](#pré-requisitos)
- [Configuração local](#configuração-local)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados e Supabase](#banco-de-dados-e-supabase)
- [Scripts disponíveis](#scripts-disponíveis)
- [SEO, SSR e sitemaps](#seo-ssr-e-sitemaps)
- [Busca e geolocalização](#busca-e-geolocalização)
- [Autenticação e autorização](#autenticação-e-autorização)
- [Imagens e armazenamento](#imagens-e-armazenamento)
- [Testes e qualidade](#testes-e-qualidade)
- [Deploy na Vercel](#deploy-na-vercel)
- [Troubleshooting](#troubleshooting)
- [Roadmap técnico](#roadmap-técnico)

## Visão geral

O projeto resolve um problema de descoberta local para brasileiros que vivem ou viajam no exterior. Em vez de depender exclusivamente de buscas genéricas, o usuário encontra negócios e conteúdos comunitários organizados por localização, categoria e relevância.

Os principais diferenciais são:

- busca geográfica com filtros por cidade, estado, país e raio;
- suporte a negócios presenciais, online e híbridos;
- diretório hierárquico por país, estado e cidade;
- páginas públicas de negócio renderizadas no servidor;
- sinônimos configuráveis por categoria;
- eventos e achadinhos integrados à busca;
- área do proprietário e painel administrativo;
- verificação de negócios com validade controlada;
- URLs canônicas, dados estruturados e sitemaps;
- tratamento conservador de localizações incompletas para evitar resultados em regiões incorretas.

## Principais funcionalidades

### Área pública

- Página inicial com busca por negócios, eventos e achadinhos.
- Busca textual, categórica e geográfica.
- Filtro por raio e localização atual.
- Diretório em `/negocios`, organizado por país, estado e cidade.
- Página pública de negócio com contatos, serviços, cardápio, promoções, fotos, eventos e avaliações.
- Página pública de evento.
- Links curtos de negócio em `/go/:slug`.
- Páginas institucionais, termos, privacidade e contato.
- Página 404 própria com resposta HTTP adequada.

### Área autenticada

- Cadastro e login com Supabase Auth.
- Recuperação e alteração de senha.
- Edição do perfil e avatar.
- Cadastro, edição, visualização e exclusão de negócios.
- Upload de logo, capa, fotos, cardápio PDF e flyers.
- Gerenciamento de horários, serviços, cardápio, promoções e eventos.
- Publicação e edição de achadinhos.
- Mensagens e avaliações.
- Solicitação e acompanhamento de verificação.
- Transferência de propriedade de negócios.

### Administração

- Moderação de negócios.
- Aprovação e remoção de verificações.
- Gestão de denúncias.
- Gestão de destaques.
- Gestão de transferências de propriedade.
- Configuração de sinônimos da busca.
- Controle de links externos com `follow` por negócio.
- Atualização e acompanhamento de sitemap.

## Stack tecnológica

| Categoria | Tecnologias |
|---|---|
| Interface | React 18, TypeScript, JSX/TSX |
| Renderização | Vike 0.4, SSR, prerender parcial |
| Build | Vite 5, Node.js, npm |
| Roteamento | React Router DOM 7 |
| Estilos | Tailwind CSS 3, PostCSS, Autoprefixer |
| Componentes | Radix UI, componentes locais em `src/components/ui` |
| Ícones | Lucide React |
| Backend | Supabase Auth, PostgreSQL, PostgREST, Storage e Realtime |
| Geolocalização | Google Maps API, Geolocation API, GeoIP configurável, PostGIS |
| Deploy | Vercel, funções serverless e arquivos estáticos |
| Analytics | Vercel Web Analytics |
| Testes | Vitest |
| Qualidade | ESLint, TypeScript, verificador próprio de UTF-8 |
| Imagens | WebP, Sharp e transformação de imagens do Supabase |

## Arquitetura

O projeto utiliza uma arquitetura híbrida:

```text
Navegador
   |
   +-- HTML prerenderizado para páginas estáticas e diretórios
   |
   +-- SSR do Vike para páginas públicas dinâmicas
   |
   +-- React Router após a hidratação/navegação interna
   |
   +-- Supabase
   |    +-- Auth
   |    +-- PostgreSQL/PostgREST
   |    +-- Storage
   |    +-- Realtime
   |
   +-- APIs serverless da Vercel
        +-- SSR
        +-- GeoIP
        +-- Sitemaps
```

### Camadas principais

| Camada | Responsabilidade |
|---|---|
| `pages/` | Integração com o Vike, SSR, prerender, HTML e metadados |
| `src/pages/` | Telas e rotas da aplicação |
| `src/components/` | Componentes visuais compartilhados |
| `src/services/` | Operações de domínio e acesso ao Supabase |
| `src/lib/` | Busca, geolocalização, SEO, imagens e utilitários |
| `src/contexts/` | Estado global de autenticação |
| `api/` | Funções serverless e adaptadores de produção |
| `supabase/` | Migrations, seed e Edge Functions |
| `scripts/` | Sitemaps, encoding e manutenção de imagens |

### Renderização

O Vike recebe todas as rotas por meio de `pages/app/+route.ts`. Antes de renderizar:

1. `pages/app/+onBeforeRender.ts` identifica o tipo da rota.
2. Dados públicos necessários são carregados no servidor.
3. `pages/+onRenderHtml.tsx` gera o HTML, metatags e JSON-LD.
4. `pages/+onRenderClient.tsx` monta ou hidrata a aplicação no navegador.
5. Navegações seguintes são tratadas pelo React Router.

O prerender parcial está configurado em `pages/+config.ts`. O build mantém o bundle do servidor para que páginas dinâmicas continuem disponíveis por SSR.

## Estrutura de diretórios

```text
.
├── api/
│   ├── ssr.js                         # Entrada SSR para a Vercel
│   ├── geoip.ts                       # Endpoint de geolocalização por IP
│   ├── sitemap-businesses.js          # Sitemap dinâmico de negócios
│   ├── sitemap-refresh.js             # Endpoint administrativo leve
│   ├── sitemap-index.ts               # Índice de sitemaps
│   └── sitemap-static.ts              # Sitemap de páginas estáticas
├── pages/
│   ├── +config.ts                     # Configuração global do Vike
│   ├── +onRenderClient.tsx            # Entrada de renderização no cliente
│   ├── +onRenderHtml.tsx              # HTML SSR, SEO e dados estruturados
│   ├── _error/+Page.tsx               # Página de erro/404 do Vike
│   └── app/
│       ├── +Page.tsx                  # Ponte entre Vike e React
│       ├── +route.ts                  # Catch-all da aplicação
│       ├── +onBeforeRender.ts          # Carregamento de dados SSR
│       └── +onBeforePrerenderStart.ts  # Lista de URLs e artefatos do prerender
├── public/
│   ├── sitemap.xml                    # Índice público
│   ├── sitemaps/                      # Sitemaps e fallback de negócios
│   └── assets estáticos               # Logos, imagens e arquivos públicos
├── scripts/
│   ├── generate-sitemaps.mjs
│   ├── check-encoding.mjs
│   ├── fix-encoding.mjs
│   ├── migrate-images-to-webp.mjs
│   ├── migrate-db-image-urls-to-webp.mjs
│   └── refresh-image-cache-control.mjs
├── src/
│   ├── App.tsx                        # Rotas React e providers globais
│   ├── components/
│   │   ├── ui/                        # Primitivos visuais
│   │   ├── SiteFooter.tsx
│   │   ├── SiteHeaderAuthActions.tsx
│   │   ├── SearchInputWithSuggestions.tsx
│   │   ├── AddressAutocomplete.tsx
│   │   └── MapView.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx            # Sessão, perfil e mensagens não lidas
│   ├── hooks/                         # Hooks reutilizáveis
│   ├── lib/
│   │   ├── search/                    # Ranking, filtros e localização
│   │   ├── seo/                       # Regras para links externos
│   │   ├── images.ts                  # URLs e srcsets otimizados
│   │   ├── google-maps.ts
│   │   └── supabase.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── SearchResults.tsx
│   │   ├── BusinessPage.tsx
│   │   ├── BusinessDirectoryPage.tsx
│   │   ├── EventPage.tsx
│   │   ├── UserProfile.tsx
│   │   └── user-profile/              # Tabs, dialogs, hooks e tipos do perfil
│   ├── services/                      # Regras de negócio e persistência
│   └── types/database.ts              # Contratos do banco e frontend
├── supabase/
│   ├── migrations/                    # Evolução versionada do schema
│   ├── functions/send-contact-email/  # Edge Function de contato
│   └── seed.sql
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── vercel.json
```

Diretórios gerados como `dist/`, `node_modules/`, `.next/` e `build/` não devem ser versionados.

## Pré-requisitos

- Node.js 20 ou superior.
- npm 10 ou superior.
- Projeto no Supabase.
- Supabase CLI para aplicar migrations e trabalhar com Edge Functions.
- Chave do Google Maps para autocomplete, mapa e geocodificação.
- Conta na Vercel para reproduzir o ambiente de produção.

## Configuração local

1. Clone o repositório:

```bash
git clone https://github.com/GuilhermeTosin/caramelovike.git
cd caramelovike
```

2. Instale as dependências:

```bash
npm install
```

3. Crie o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
VITE_GOOGLE_MAPS_API_KEY=SUA_CHAVE_GOOGLE_MAPS
```

4. Configure o banco:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

5. Inicie o servidor:

```bash
npm run dev
```

6. Acesse:

```text
http://localhost:3000
```

O script `predev` gera os arquivos básicos de sitemap antes de iniciar o Vike.

## Variáveis de ambiente

### Aplicação cliente

Variáveis com prefixo `VITE_` são incorporadas ao bundle do navegador. Nunca coloque uma service role key em uma variável `VITE_*`.

| Variável | Obrigatória | Uso |
|---|---:|---|
| `VITE_SUPABASE_URL` | Sim | URL pública do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sim | Chave pública anon do Supabase |
| `VITE_GOOGLE_MAPS_API_KEY` | Recomendada | Mapas, autocomplete e geocodificação |
| `VITE_GEOIP_ENDPOINT` | Opcional | Endpoint de localização aproximada por IP |
| `VITE_STRICT_SEARCH_MODE` | Opcional | Ativa busca estrita; padrão `1` |
| `VITE_STRICT_SEARCH_MIN_SCORE` | Opcional | Pontuação mínima da busca estrita; padrão `3` |
| `VITE_SEARCH_BACKEND` | Opcional | Estratégia de busca; padrão `client` |

### Servidor, scripts e Vercel

| Variável | Obrigatória | Uso |
|---|---:|---|
| `SUPABASE_URL` | Recomendada | URL do Supabase no runtime serverless |
| `SUPABASE_ANON_KEY` | Recomendada | Leitura pública no servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Apenas manutenção | Scripts administrativos e operações privilegiadas |
| `SUPABASE_SECRET_KEY` | Alternativa | Chave de servidor compatível, quando aplicável |
| `SUPABASE_BUCKET` | Opcional | Bucket de imagens; padrão `business-images` |
| `SITE_URL` | Opcional | Domínio usado na geração de sitemap |
| `PUBLIC_SITE_URL` | Opcional | Alternativa para `SITE_URL` |

As variáveis de produção devem ser cadastradas em **Vercel > Project Settings > Environment Variables** para os ambientes necessários.

## Banco de dados e Supabase

As migrations ficam em `supabase/migrations` e devem ser aplicadas em ordem.

Os principais domínios persistidos são:

- perfis de usuário;
- negócios e links curtos;
- avaliações;
- conversas, participantes e mensagens;
- transferências de propriedade;
- destaques;
- serviços, promoções, cardápios e eventos;
- verificações;
- moderação;
- achadinhos, mensagens e denúncias;
- configurações globais da busca;
- funções PostGIS para pesquisa por raio.

### Aplicar migrations

No projeto remoto vinculado:

```bash
npx supabase db push
```

Para desenvolvimento local com Supabase:

```bash
npx supabase start
npx supabase db reset
```

Não execute migrations destrutivas diretamente em produção sem backup e revisão do SQL.

### Edge Function de contato

A função está em:

```text
supabase/functions/send-contact-email
```

Deploy:

```bash
npx supabase functions deploy send-contact-email
```

Configure os secrets exigidos pela função no Supabase antes do deploy.

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o Vike em desenvolvimento |
| `npm run build` | Gera build cliente, servidor e prerender |
| `npm run preview` | Executa o build localmente |
| `npm run lint` | Executa o ESLint |
| `npm run test:search` | Testa ranking e filtros de negócios |
| `npm run test:events` | Testa a busca de eventos |
| `npm run check:encoding` | Detecta arquivos com encoding problemático |
| `npm run fix:encoding` | Executa a correção automatizada de encoding |
| `npm run generate:sitemaps` | Gera índice, sitemap estático e fallback |
| `npm run migrate:webp` | Converte imagens existentes para WebP |
| `npm run migrate:webp:db` | Atualiza URLs migradas no banco |
| `npm run refresh:image-cache` | Atualiza cache-control das imagens existentes |

Antes de abrir um pull request ou publicar:

```bash
npm run check:encoding
npx tsc --noEmit
npm run test:search
npm run test:events
npm run build
```

## SEO, SSR e sitemaps

O SEO é gerado principalmente em `pages/+onRenderHtml.tsx`.

### Recursos implementados

- títulos e descriptions server-side;
- canonical por URL;
- diretivas `robots` e `googlebot`;
- Open Graph e Twitter Cards;
- `WebSite` com `SearchAction`;
- `LocalBusiness` para páginas de negócio;
- `BreadcrumbList` para páginas de negócio;
- preload da imagem LCP do hero;
- `404` com `noindex`;
- `noindex` para rotas privadas e previews;
- diretório hierárquico crawlável;
- SSR para negócios criados após o último deploy.

### Sitemaps

| URL | Conteúdo |
|---|---|
| `/sitemap.xml` | Índice dos sitemaps |
| `/sitemaps/static.xml` | Páginas institucionais e públicas fixas |
| `/sitemaps/businesses.xml` | Negócios públicos e aprovados |

O sitemap de negócios é servido por `api/sitemap-businesses.js`. Ele consulta os campos mínimos no Supabase e usa `businesses-fallback.xml` se a origem estiver indisponível.

O sitemap inclui apenas negócios com `moderation_status = approved` ou status legado nulo.

## Busca e geolocalização

A busca é composta por:

- `src/pages/SearchResults.tsx`: estado da tela, URL e integração dos filtros;
- `src/lib/search/businessSearch.ts`: ranking e filtragem;
- `src/lib/search/locationResolver.ts`: aliases, geocodificação e origem;
- `src/lib/utils/geo.ts`: GPS, GeoIP, cache e distância de Haversine;
- migrations PostGIS: busca server-side por raio.

### Relevância textual

Resultados com correspondência direta em nome, descrição, serviço, cardápio ou palavra-chave recebem maior prioridade. Sinônimos podem expandir uma consulta para toda uma categoria, mantendo os matches diretos no topo.

As categorias são identificadas por IDs estáveis, evitando dependência de labels que podem mudar ou conter acentos.

### Localização

Uma localização confiável exige:

- cidade;
- país;
- estado ou código do estado;
- latitude e longitude válidas.

Negócios com endereço preciso participam normalmente da busca por raio. Registros somente em nível de cidade entram apenas em raios amplos, reduzindo falsos positivos entre cidades e países.

A origem da busca pode vir de:

1. coordenadas presentes na URL;
2. geocodificação do texto informado;
3. localização do navegador;
4. GeoIP;
5. dados confiáveis dos negócios cadastrados.

## Autenticação e autorização

O `AuthProvider` centraliza:

- leitura e renovação da sessão;
- sincronização com eventos do Supabase Auth;
- carregamento do perfil;
- papel `user` ou `admin`;
- contagem de mensagens não lidas;
- logout.

Rotas privadas são protegidas pela interface e marcadas como `noindex`. As regras reais de segurança devem continuar sendo garantidas por Row Level Security no Supabase.

### Recuperação de senha

O fluxo utiliza:

- `supabase.auth.resetPasswordForEmail`;
- rota `/redefinir-senha`;
- `supabase.auth.updateUser` para definir a nova senha.

As URLs permitidas precisam estar configuradas em **Supabase Authentication > URL Configuration**.

## Imagens e armazenamento

Uploads são centralizados em `src/services/storage.ts`.

O fluxo:

1. reduz a imagem conforme o tipo;
2. converte formatos suportados para WebP;
3. limita dimensões e qualidade;
4. usa nomes versionados;
5. envia ao Supabase Storage;
6. aplica cache de um ano.

Presets distintos são usados para hero, logo, foto, flyer e avatar.

Imagens públicas são entregues com URLs responsivas e `srcset`. A imagem LCP do negócio usa preload, `loading="eager"` e `fetchpriority="high"`. Cards fora da primeira dobra permanecem lazy para evitar competição de rede.

## Testes e qualidade

Os testes existentes cobrem principalmente:

- busca textual;
- expansão por sinônimos;
- IDs de categoria;
- localização completa e incompleta;
- filtros por raio;
- negócios online;
- ordenação por relevância;
- busca de eventos.

O projeto também possui um verificador de encoding para evitar mojibake e caracteres corrompidos.

Novas regras de busca devem ser acompanhadas de testes em `src/lib/search`.

## Deploy na Vercel

O arquivo `vercel.json` configura:

- `npm run build`;
- saída estática em `dist/client`;
- inclusão de `dist/server` na função SSR;
- redirecionamento do domínio sem `www`;
- rotas privadas para o shell cliente;
- sitemap dinâmico de negócios;
- fallback das rotas públicas para `api/ssr`.

### Checklist de deploy

1. Configure as variáveis de ambiente na Vercel.
2. Ative o Vercel Web Analytics no projeto.
3. Execute localmente:

```bash
npm run check:encoding
npx tsc --noEmit
npm run build
```

4. Publique a branch vinculada ao ambiente.
5. Verifique:

```text
/
/buscar
/negocios
/sitemap.xml
/sitemaps/static.xml
/sitemaps/businesses.xml
/uma-url-real-de-negocio
/uma-url-inexistente
```

6. Confirme status HTTP, canonical, robots, JSON-LD e HTML inicial.

## Troubleshooting

### `Supabase credentials not found`

Confirme:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Reinicie o servidor após alterar `.env`.

### `Failed to fetch` no login ou nas consultas

- valide URL e anon key;
- confira CORS e URL Configuration no Supabase;
- verifique políticas RLS;
- confira se o projeto Supabase está ativo.

### Página funciona por navegação interna, mas falha ao acessar a URL diretamente

- confira as rotas no `vercel.json`;
- confirme que `dist/server` está incluído na função SSR;
- verifique os logs de `api/ssr.js`;
- execute `npm run build` antes de publicar.

### Negócio não aparece na busca

Confira no banco:

- `moderation_status`;
- `category_id`;
- `country_code`;
- `state_code`;
- `city`;
- `lat` e `lng`;
- `attendance_type`;
- palavras-chave e sinônimos da categoria.

### Sitemap de negócios vazio

- confirme as variáveis do Supabase no runtime da Vercel;
- abra `/sitemaps/businesses-fallback.xml`;
- confira se existem negócios aprovados;
- consulte os logs da função `api/sitemap-businesses.js`.

### Alteração de imagem não aparece imediatamente

Os arquivos usam cache longo e nomes versionados. Reenvie a imagem para gerar uma URL nova. Para arquivos antigos:

```bash
npm run refresh:image-cache
```

## Roadmap técnico

### Prioridade alta

- aumentar a cobertura de testes para autenticação, perfil e operações administrativas;
- adicionar testes end-to-end para criação, aprovação, busca e exclusão de negócios;
- consolidar tipos gerados diretamente do schema Supabase;
- revisar e documentar todas as políticas RLS;
- adicionar observabilidade para SSR e funções serverless;
- remover warnings de build relacionados a opções depreciadas do Vite;
- eliminar o top-level await tolerado em `BusinessPageRoute.tsx`.

### Performance

- dividir `BusinessPage` e `UserProfile` em chunks menores por funcionalidade;
- monitorar LCP, CLS e INP por tipo de página;
- implementar placeholders responsivos derivados das próprias imagens;
- avaliar CDN dedicada ou transformação de imagens no edge;
- reduzir o volume inicial enviado para páginas de diretório e busca.

### SEO

- adicionar `BreadcrumbList` e `ItemList` às páginas do diretório;
- usar `updated_at` real também no fallback estático do sitemap;
- adicionar testes automatizados de canonical, robots e JSON-LD;
- monitorar soft 404, cobertura e sitemap no Google Search Console;
- criar páginas indexáveis por categoria e localização quando houver conteúdo suficiente.

### Arquitetura

- mover constantes de categorias e países para módulos de domínio independentes;
- separar consultas públicas mínimas de consultas administrativas completas;
- padronizar tratamento e telemetria de erros;
- adicionar cache control explícito por tipo de resposta SSR;
- documentar ADRs para SSR, busca geográfica, moderação e sitemaps.

## Licença

Este repositório é privado. O uso, distribuição e reprodução do código dependem da autorização do proprietário do projeto.
