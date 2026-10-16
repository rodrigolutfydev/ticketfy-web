# Ticketfy Web

Frontend do Ticketfy, em React + TypeScript. Consome a [Ticketfy API](https://github.com/rodrigolutfydev/Ticketfy-API).

## Rodar

Pré-requisitos:

- **Node.js 24** (fixado em `.nvmrc` e em `engines` no `package.json`). Com nvm: `nvm install` e `nvm use` na pasta do projeto.
- A API rodando em `http://localhost:8080` (veja o repositório da API).

```bash
npm ci            # instala exatamente as versões do package-lock.json (use npm install só para mudar dependências)
npm run dev       # abre em http://localhost:5173
npm run build     # gera a versão de produção em dist/
npm run preview   # serve o dist/ com os cabeçalhos de segurança, em http://localhost:4173
```

Em `npm run dev`, as rotas de sessão (`/api/auth/*`, inclusive `/api/auth/google`, e a troca de senha) passam pelo proxy do Vite até `http://localhost:8080`, fazendo o papel da Function da Cloudflare.

**Publicação:** o site publicado sai só do build do CI (veja [Publicação](#publicação)). Não suba o `dist/` gerado na sua máquina: com um `.env.local` apontando para `localhost`, a CSP e o bundle ficam apontando para a API local.

## Testes e verificações

```bash
npm run typecheck        # TypeScript estrito, sem gerar arquivos
npm test                 # testes unitários (Vitest, ambiente node)
npm run check:problems   # confere se os tipos de erro e as categorias estão iguais aos da API
npm run build            # tsc + build de produção
npm run check:dist       # confere o dist/ (precisa de VITE_API_URL com a API https esperada)
```

Os testes ficam ao lado do código (`src/**/*.test.ts`) e em `tests/` (Function de sessão). Cobrem o client da API (renovação, tempo limite por rota, aviso de servidor lento, aquecimento da API), o Error Boundary, as defesas de `utils/security.ts` (open redirect, injeção em rotas, URL de imagem) e de `utils/cart.ts` (carrinho lido da URL), as traduções e as regras de negócio em `utils/`.

O `check:problems` lê `docs/problem-types.json` e `docs/event-categories.json` da API na pasta `../api` (ou em `API_DIR`). No CI, sem a pasta da API, use `PROBLEM_TYPES_URL` e `EVENT_CATEGORIES_URL` com o endereço desses arquivos. Para atualizar os arquivos locais: `npm run sync:problems`.

## Publicação

O site é publicado na Cloudflare Pages pelo GitHub Actions (`.github/workflows/ci.yml`), em Direct Upload: o arquivo publicado é exatamente o `dist/` que passou nas checagens.

| Quando | Job | O que faz |
|---|---|---|
| Pull request e push na `main` | `build` | `npm ci`, typecheck, testes, `check:problems` (contra os JSON da API no GitHub), build com `VITE_API_URL`, `check:dist` e `npm audit --audit-level=high`. Guarda o `dist/` como artefato por 7 dias |
| Só push na `main`, se o `build` passou | `deploy` | Environment `production`. Baixa o mesmo `dist/`, confere de novo e roda `wrangler pages deploy` da raiz do repositório (é dali que a pasta `functions/` é compilada). Dois pushes seguidos publicam em ordem |
| Depois do deploy | `smoke` | `scripts/smoke-test.sh` contra `SITE_URL`: acorda a API, espera a versão nova entrar no ar, confere página inicial, cabeçalhos de segurança, fallback de SPA, ausência de source map e a Function de sessão (`POST /api/auth/refresh` precisa responder **401 `session-expired`** vindo da API; 500 indica `API_ORIGIN`/`PROXY_SHARED_SECRET` faltando na Pages, 403 indica `CORS_ALLOWED_ORIGINS` sem a origem do site). Só leitura: não cria nada em produção |

O `check:dist` (`scripts/check-dist.mjs`) falha se o `dist/` tiver `localhost:<porta>`, `127.0.0.1`, arquivos `.map` ou `sourceMappingURL`, nomes ou formatos de segredo (segredo do proxy, JWT, chaves privadas, tokens conhecidos), o valor de alguma variável de ambiente com cara de segredo, se faltar `_headers` ou `_routes.json`, se o `connect-src` da CSP (no `_headers` e no `<meta>`) não for exatamente `'self'` + a origem de `VITE_API_URL`, ou se o JS inicial passar de 220 KB gzip.

Configuração no GitHub (Settings → Secrets and variables → Actions):

| Nome | Tipo | Onde | Valor |
|---|---|---|---|
| `VITE_API_URL` | Variable | Repositório | URL https da API de produção |
| `VITE_GOOGLE_CLIENT_ID` | Variable | Repositório | Client ID OAuth do Google (`<números>-<letras>.apps.googleusercontent.com`). Sem ele, o CI avisa e o botão do Google não aparece; com um `GOCSPX-...` (client secret), o CI falha |
| `CLOUDFLARE_ACCOUNT_ID` | Variable | Repositório | Id da conta da Cloudflare |
| `CF_PAGES_PROJECT` | Variable | Repositório | Nome do projeto na Pages |
| `CLOUDFLARE_API_TOKEN` | Secret | Environment `production` | Token com só "Account → Cloudflare Pages → Edit" |
| `SITE_URL` | Variable | Environment `production` | URL publicada do site, sem barra no final |
| `PROBLEM_TYPES_URL`, `EVENT_CATEGORIES_URL` | Variable (opcional) | Repositório | Só se os JSON da API mudarem de lugar; o padrão é a `main` de `rodrigolutfydev/Ticketfy-API` |

`API_ORIGIN` e `PROXY_SHARED_SECRET` não passam pelo GitHub: ficam nas variáveis da própria Pages (veja a tabela abaixo).

Para rodar o teste rápido à mão: `SITE_URL=https://... VITE_API_URL=https://... bash scripts/smoke-test.sh`.

### Como voltar uma versão

| Situação | O que fazer |
|---|---|
| Deploy novo quebrou o site | Painel da Cloudflare → Workers & Pages → projeto → **Deployments** → no deploy anterior, **⋯ → Rollback to this deployment**. É instantâneo e volta os arquivos e as Functions juntos. Não volta variáveis de ambiente |
| Prefere refazer pelo GitHub | Actions → abra a execução do CI do commit bom na `main` → **Re-run all jobs**. Gera um deployment novo com aquele código. Para listar os deployments: `npx wrangler pages deployment list --project-name=<projeto>` |
| O problema veio de variável da Pages (`API_ORIGIN`, `PROXY_SHARED_SECRET`) | Corrija no painel e publique de novo (re-run do último CI): variáveis só valem para deployments criados depois da mudança |
| O problema é na API | Volte a versão no Render; o front não precisa voltar se o contrato não mudou |

Depois de voltar, corrija na `main`: o próximo push publica de novo por cima do rollback.

## Login com Google

Fluxo authorization code + PKCE (`src/auth/google.ts`). O botão gera `state` e `code_verifier` aleatórios, guarda os dois (e a página para onde a pessoa ia, passada por `safeRedirectPath`) no `sessionStorage` e manda para o Google com o `code_challenge` S256. A volta cai em `/auth/google/callback`, que confere o `state`, apaga o que estava guardado, tira o `code` da URL e chama `POST /api/auth/google` pela mesma Function de sessão do login com senha. O `redirectUri` é a origem atual + `/auth/google/callback` e precisa estar, igual, nas **Authorized redirect URIs** do client no Google Cloud e em `GOOGLE_REDIRECT_URIS` na API. A CSP não muda: a ida ao Google é uma navegação de página, não um `fetch`.

## Variáveis de ambiente

| Variável | Onde | Para quê |
|---|---|---|
| `VITE_API_URL` | `.env` (versionado, valor de produção) ou `.env.local` (só na sua máquina, fora do Git) | Endereço da API. Vai embutido no bundle e no `connect-src` da CSP. O build falha se não for https (exceto `localhost`) |
| `VITE_GOOGLE_CLIENT_ID` | `.env.local` (sua máquina) ou Variable do repositório (CI) | Client ID do login com Google. É público e vai no bundle. O client secret (`GOCSPX-...`) fica só na API: o build e o `check:dist` falham se ele aparecer |
| `API_ORIGIN` | Cloudflare Pages → Settings → Variables (Functions) | Origem https da API para a qual a Function repassa as rotas de sessão |
| `PROXY_SHARED_SECRET` | Cloudflare Pages (tipo *Secret*, só Production) e Render, com o mesmo valor | Segredo que a Function envia à API. Nunca vai para o Git nem para variáveis `VITE_` |
| `PROBLEM_TYPES_URL`, `EVENT_CATEGORIES_URL` | CI (opcional; o workflow já usa a `main` da API no GitHub) | Fonte dos contratos para o `check:problems` quando a pasta da API não está disponível |
| `API_DIR` | Opcional, local | Pasta da API para o `check:problems` (padrão `../api`) |

Tudo que começa com `VITE_` fica visível para qualquer visitante do site publicado. Nunca coloque senha, token ou chave nessas variáveis.

## Servidor acordando e erros de tela

- **API no Render free:** a API hiberna depois de um tempo sem uso e pode levar até um minuto para responder. Ao abrir o site com sessão salva, o front chama `GET /actuator/health` direto na API e espera a resposta antes do primeiro `/auth/refresh`. As chamadas de sessão (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/password-reset/*` e `GET /users/me`) esperam até 60 s; as demais, 15 s. Se alguma chamada passar de 5 s, aparece o aviso "O servidor está iniciando, isso pode levar até um minuto", que some quando a resposta chega. O refresh nunca é repetido automaticamente.
- **Error Boundary:** um erro ao desenhar uma tela mostra uma tela de recuperação ("Tentar de novo" e "Voltar para o início") sem derrubar o cabeçalho; outro Error Boundary na raiz cobre erros do próprio layout. Detalhes técnicos do erro nunca aparecem para o usuário. Se faltar um arquivo JS depois de um deploy, a página recarrega sozinha uma única vez (marca `ticketfy.chunkReload` no `sessionStorage`).

## Telas e rotas da API

| Tela | Endereço | Rotas da API usadas |
|---|---|---|
| Início e busca de eventos | `/` | `GET /events` |
| Como funciona | `/how-it-works` | nenhuma |
| Central de ajuda | `/help` | nenhuma |
| Página do evento | `/events/:id` | `GET /events/{id}`, `GET /events/{id}/ticket-types` |
| Revisar pedido | `/checkout` | `POST /orders` (com `Idempotency-Key`) |
| Pagamento | `/orders/:id/payment` | `GET /orders/{id}`, `POST /orders/{id}/payment`, `DELETE /orders/{id}` |
| Confirmação | `/orders/:id/confirmation` | `GET /orders/{id}` |
| Meus pedidos | `/orders` | `GET /orders` |
| Detalhe do pedido | `/orders/:id` | `GET /orders/{id}`, `DELETE /orders/{id}`, `POST /orders/{id}/refund` |
| Meus ingressos | `/tickets` | `GET /tickets/me` |
| Entrar / Criar conta | `/login`, `/register` | `POST /api/auth/login` (pela Function), `POST /users` |
| Recuperar senha | `/forgot-password`, `/reset-password` | `POST /api/auth/password-reset/request` e `/confirm` (pela Function) |
| Minha conta | `/account` | `GET /users/me`, `POST /users/me/organizer` |
| Painel do organizador | `/organizer` | `GET /events/mine` |
| Meus eventos | `/organizer/events` | `GET /events/mine` |
| Criar / editar evento | `/organizer/events/new`, `/organizer/events/:id/edit` | `POST /events`, `PUT /events/{id}` |
| Gerenciar evento (abas Visão geral, Lotes, Configurações) | `/organizer/events/:id` | `GET /events/{id}/ticket-types`, `POST /events/{id}/ticket-types`, `DELETE /events/{id}` |
| Check-in | `/organizer/check-in` | `POST /tickets/{code}/check-in` |

Rotas de sessão (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, recuperação de senha, troca de senha e exclusão de conta) passam pela Function da Cloudflare em `/api/...`, que guarda o refresh token num cookie `HttpOnly`. As demais vão direto à API com o access token, que fica só na memória.

## Privacidade (LGPD)

A política de privacidade (`/privacy`) e o rodapé mostram o e-mail de contato do responsável pelos dados, definido em `src/utils/contact.ts`. O build (e o `check:dist`) falha se um texto provisório como `SEU-EMAIL-AQUI` chegar ao site. Por ele o titular pede acesso, correção, exportação e exclusão dos dados, inclusive com a conta suspensa. Os textos da política e dos termos ainda dependem de revisão jurídica.

## Segurança

Resumo: a API protege; o frontend evita ser usado contra o usuário. CSP rígida com Trusted Types, cabeçalhos anti-clickjacking, sessão por aba com logout por inatividade, validação de IDs e redirecionamentos, fotos só em https, freio de tentativas no login e chave de idempotência nas compras.

Detalhes, tabela completa e o que precisa estar no backend: [docs/SEGURANCA.md](docs/SEGURANCA.md).

## Visual

O visual segue o protótipo "pista" (fundo quase preto, laranja de pirotecnia, ingressos com picote). Todas as telas usam dados da API: nenhum evento, preço ou número é fixo no código.

- **Cores:** variáveis CSS em `src/index.css`. A cor de destaque (`--accent`) fica num lugar só, em `:root`; os tons de apoio (suave, contorno, brilho) saem dela com `color-mix`. Violeta (`--glow`) aparece só em brilhos, e verde-limão (`--lime`) só no selo "últimos ingressos".
- **Temas:** escuro por padrão e claro no botão de sol/lua. O palco do topo da página inicial é sempre escuro (`data-theme="dark"` só nele), nos dois temas.
- **Componentes de ingresso:** os recortes do picote são máscaras CSS (`.tf-cut-y`, `.tf-cut-x`), então o fundo aparece de verdade pelo furo. Card de evento (`EventCard`), ingresso do topo (`PaperTicket`), ingresso deitado de Meus ingressos, resumo da compra, convite para organizadores e placa neon (`NeonSign`).
- **Movimento:** inclinação 3D, reflexo, flutuação e faixas que deslizam com a rolagem ficam em `src/hooks/motion.ts`. A inclinação e o reflexo só ligam com mouse; tudo desliga com "reduzir movimento" no sistema.
- **Capa sem foto:** quando o evento não tem imagem (ou ela não carrega), a capa é desenhada com as iniciais do evento sobre um gradiente da marca. Nunca uma foto genérica.
- **Responsivo:** de 1 coluna no celular a 4 colunas no computador. No celular, a página do evento tem uma barra fixa com o preço e o botão de compra.
- **Fontes:** Unbounded (títulos) e Inter Tight (texto), empacotadas no build pelo Fontsource (licença SIL Open Font License 1.1). Sem Google Fonts, para a CSP continuar com `font-src 'self'`.

### Imagens e licenças

As duas fotos de fundo ficam em `src/assets` e saem no build com o resto do site (nada de imagem externa, a CSP continua igual):

| Arquivo | Uso | Origem e licença |
|---|---|---|
| `src/assets/stage-orange.jpg` | Palco da página inicial, convite para organizadores e telas de entrada | Foto do Unsplash (`images.unsplash.com/photo-1501612780327-45045538702b`), [Licença Unsplash](https://unsplash.com/license): uso livre, inclusive comercial, sem atribuição obrigatória. Convertida para tons de laranja e reduzida para 1800 px. |
| `src/assets/neon-sign-orange.jpg` | Placa neon do 404 e da tela de erro | Foto do Unsplash (`images.unsplash.com/photo-1508700115892-45ecd05ae2ad`), [Licença Unsplash](https://unsplash.com/license). Recolorida para o laranja da marca e reduzida para 1800 px. |

As fotos dos eventos continuam vindo da URL https cadastrada pelo organizador.

### Fotos dos eventos de demonstração

Os eventos fictícios criados pelo script `scripts/seed-demo.sh` da API usam fotos servidas pelo próprio site, em `public/demo/` (publicadas em `https://ticketfy-6fd.pages.dev/demo/...`). Como são do mesmo domínio, a CSP (`img-src 'self'`) aceita. Todas vêm do Unsplash, sob a [Licença Unsplash](https://unsplash.com/license): uso livre, inclusive comercial, sem atribuição obrigatória. Foram recortadas em 1200 × 675 px e recomprimidas em JPEG (até 200 KB cada).

| Arquivo | Evento | Origem |
|---|---|---|
| `public/demo/festival-praia.jpg` | Festival Maré Alta | `images.unsplash.com/photo-1470229722913-7c0e2dbbafd3` |
| `public/demo/show-rock.jpg` | Noite Elétrica: Tributo ao Rock Nacional | `images.unsplash.com/photo-1516450360452-9312f5e86fc7` |
| `public/demo/teatro.jpg` | O Último Ato de Helena | `images.unsplash.com/photo-1503095396549-807759245b35` |
| `public/demo/stand-up.jpg` | Stand-up: Tô Rindo de Nervoso | `images.unsplash.com/photo-1507676184212-d03ab07a01bf` |
| `public/demo/festa.jpg` | Baile do Pôr do Sol | `images.unsplash.com/photo-1492684223066-81342ee5ff30` |
| `public/demo/corrida.jpg` | Corrida Orla Carioca 10K | `images.unsplash.com/photo-1461896836934-ffe607ba8211` |
| `public/demo/oficina-fotografia.jpg` | Oficina de Fotografia de Rua | `images.unsplash.com/photo-1504609773096-104ff2c73ba4` |
| `public/demo/conferencia.jpg` | DevSul Conf: Software que Escala | `images.unsplash.com/photo-1540575467063-178a50c2df87` |
| `public/demo/exposicao.jpg` | Exposição Cores do Cerrado | `images.unsplash.com/photo-1518998053901-5348d3961a04` |
| `public/demo/gastronomia.jpg` | Festival Sabores do Norte | `images.unsplash.com/photo-1555939594-58d7cb561ad1` |
| `public/demo/oficina-infantil.jpg` | Oficina Pequenos Artistas | `images.unsplash.com/photo-1560421683-6856ea585c78` |

## Estrutura

```
src/
├── api/          # cliente HTTP, tipos dos DTOs e uma função por rota
├── auth/         # sessão (token), perfil (useMe) e guardas de rota
├── components/   # peças reutilizáveis (layout, abas, formulários, cartões)
├── theme/        # tema claro/escuro
├── pages/        # uma tela por rota
├── i18n/         # catálogos pt-BR e en, idioma e mensagens de erro da API
├── hooks/        # hooks compartilhados (título da página)
├── utils/        # formatação, carrinho, segurança e idempotência
├── App.tsx       # mapa de rotas
└── main.tsx      # ponto de entrada
functions/        # Pages Functions: proxy das rotas de sessão até a API
tests/            # testes da Function
```

## Ferramentas

Vite (servidor e build) · React · TypeScript · React Router · TanStack Query (chamadas à API e cache) · Tailwind CSS (visual) · qrcode.react (QR dos ingressos) · lucide-react (ícones) · Fontsource (fontes Unbounded e Inter Tight) · Vitest (testes)
