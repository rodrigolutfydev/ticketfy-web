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

Em `npm run dev`, as rotas de sessão (`/api/auth/*` e a troca de senha) passam pelo proxy do Vite até `http://localhost:8080`, fazendo o papel da Function da Cloudflare.

**Publicação:** o site publicado sai só do build do CI. Não suba o `dist/` gerado na sua máquina: com um `.env.local` apontando para `localhost`, a CSP e o bundle ficam apontando para a API local.

## Testes e verificações

```bash
npm run typecheck        # TypeScript estrito, sem gerar arquivos
npm test                 # testes unitários (Vitest, ambiente node)
npm run check:problems   # confere se os tipos de erro e as categorias estão iguais aos da API
npm run build            # tsc + build de produção
```

Os testes ficam ao lado do código (`src/**/*.test.ts`) e em `tests/` (Function de sessão). Cobrem o client da API (renovação, tempo limite por rota, aviso de servidor lento, aquecimento da API), o Error Boundary, as defesas de `utils/security.ts` (open redirect, injeção em rotas, URL de imagem) e de `utils/cart.ts` (carrinho lido da URL), as traduções e as regras de negócio em `utils/`.

O `check:problems` lê `docs/problem-types.json` e `docs/event-categories.json` da API na pasta `../api` (ou em `API_DIR`). No CI, sem a pasta da API, use `PROBLEM_TYPES_URL` e `EVENT_CATEGORIES_URL` com o endereço desses arquivos. Para atualizar os arquivos locais: `npm run sync:problems`.

## Variáveis de ambiente

| Variável | Onde | Para quê |
|---|---|---|
| `VITE_API_URL` | `.env` (versionado, valor de produção) ou `.env.local` (só na sua máquina, fora do Git) | Endereço da API. Vai embutido no bundle e no `connect-src` da CSP. O build falha se não for https (exceto `localhost`) |
| `API_ORIGIN` | Cloudflare Pages → Settings → Variables (Functions) | Origem https da API para a qual a Function repassa as rotas de sessão |
| `PROXY_SHARED_SECRET` | Cloudflare Pages (tipo *Secret*, só Production) e Render, com o mesmo valor | Segredo que a Function envia à API. Nunca vai para o Git nem para variáveis `VITE_` |
| `PROBLEM_TYPES_URL`, `EVENT_CATEGORIES_URL` | CI | Fonte dos contratos para o `check:problems` quando a pasta da API não está disponível |
| `API_DIR` | Opcional, local | Pasta da API para o `check:problems` (padrão `../api`) |

Tudo que começa com `VITE_` fica visível para qualquer visitante do site publicado. Nunca coloque senha, token ou chave nessas variáveis.

## Servidor acordando e erros de tela

- **API no Render free:** a API hiberna depois de um tempo sem uso e pode levar até um minuto para responder. Ao abrir o site com sessão salva, o front chama `GET /actuator/health` direto na API e espera a resposta antes do primeiro `/auth/refresh`. As chamadas de sessão (`/auth/login`, `/auth/refresh`, `/auth/logout` e `GET /users/me`) esperam até 60 s; as demais, 15 s. Se alguma chamada passar de 5 s, aparece o aviso "O servidor está iniciando, isso pode levar até um minuto", que some quando a resposta chega. O refresh nunca é repetido automaticamente.
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
| Minha conta | `/account` | `GET /users/me`, `POST /users/me/organizer` |
| Painel do organizador | `/organizer` | `GET /events/mine` |
| Meus eventos | `/organizer/events` | `GET /events/mine` |
| Criar / editar evento | `/organizer/events/new`, `/organizer/events/:id/edit` | `POST /events`, `PUT /events/{id}` |
| Gerenciar evento (abas Visão geral, Lotes, Configurações) | `/organizer/events/:id` | `GET /events/{id}/ticket-types`, `POST /events/{id}/ticket-types`, `DELETE /events/{id}` |
| Check-in | `/organizer/check-in` | `POST /tickets/{code}/check-in` |

Rotas de sessão (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, troca de senha e exclusão de conta) passam pela Function da Cloudflare em `/api/...`, que guarda o refresh token num cookie `HttpOnly`. As demais vão direto à API com o access token, que fica só na memória.

## Privacidade (LGPD)

A política de privacidade (`/privacy`) e o rodapé mostram o e-mail de contato do responsável pelos dados, definido em `src/utils/contact.ts`. Por ele o titular pede acesso, correção, exportação e exclusão dos dados, inclusive com a conta suspensa. Os textos da política e dos termos ainda dependem de revisão jurídica.

## Segurança

Resumo: a API protege; o frontend evita ser usado contra o usuário. CSP rígida com Trusted Types, cabeçalhos anti-clickjacking, sessão por aba com logout por inatividade, validação de IDs e redirecionamentos, fotos só em https, freio de tentativas no login e chave de idempotência nas compras.

Detalhes, tabela completa e o que precisa estar no backend: [docs/SEGURANCA.md](docs/SEGURANCA.md).

## Visual

- **Temas:** escuro por padrão e claro no botão de sol/lua. As cores são variáveis CSS em `src/index.css` (`--canvas`, `--surface`, `--line-strong`, `--accent`...): mudar uma delas muda o site inteiro. No tema claro, os cartões são brancos com borda e sombra sobre fundo cinza; no escuro, cada camada é um degrau mais clara e as bordas separam as caixas.
- **Vitrine de destaques:** só as fotos dos eventos, no topo da página inicial, trocando a cada 3 segundos (clicar abre o evento). Prioriza eventos com `featured: true`; sem isso, os próximos eventos que têm foto. Pausa com o mouse em cima, com foco do teclado ou no botão de pausa, e não se move para quem ativou "reduzir movimento".
- **Convite para organizadores:** aparece para visitantes (leva ao cadastro) e para compradores logados (leva à ativação na conta). Some para quem já é organizador.
- **Fotos sem corte:** na página do evento e na vitrine, a foto aparece inteira (`object-contain`), com uma cópia desfocada preenchendo as laterais. A altura acompanha a altura da tela, então em tela cheia a foto cresce. O botão "Ver foto inteira" abre a imagem sozinha sobre fundo preto.
- **Responsivo:** o conteúdo vai de 1 coluna no celular a 4 colunas em monitores grandes (largura máxima maior a partir de 1536px). No celular, a página do evento tem uma barra fixa com o preço e o botão de compra.
- **Fontes:** Bricolage Grotesque (títulos) e Inter (texto), empacotadas no build pelo Fontsource.

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

Vite (servidor e build) · React · TypeScript · React Router · TanStack Query (chamadas à API e cache) · Tailwind CSS (visual) · qrcode.react (QR dos ingressos) · lucide-react (ícones) · Fontsource (fontes) · Vitest (testes)
