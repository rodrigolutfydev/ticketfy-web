# Ticketfy Web

Frontend do Ticketfy, em React + TypeScript. Consome a [Ticketfy API](https://github.com/rodrigolutfydev/Ticketfy-API).

## Rodar

Pré-requisitos: Node.js (LTS) e a API rodando em `http://localhost:8080`.

```bash
npm install       # baixa as dependências (uma vez)
npm run dev       # abre em http://localhost:5173
npm run build     # gera a versão de produção em dist/
npm run preview   # serve o dist/ com os cabeçalhos de segurança, em http://localhost:4173
```

O endereço da API fica no `.env` (`VITE_API_URL`). Para usar outro endereço só na sua máquina, como a API no Render, crie um `.env.local` com `VITE_API_URL=...`: ele tem prioridade sobre o `.env` e não vai para o Git. Nunca coloque segredos nesses arquivos, porque tudo que começa com `VITE_` fica visível no site publicado.

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
| Entrar / Criar conta | `/login`, `/register` | `POST /login`, `POST /users` |
| Minha conta | `/account` | `GET /users/me`, `POST /users/me/organizer` |
| Painel do organizador | `/organizer` | `GET /events/mine` |
| Meus eventos | `/organizer/events` | `GET /events/mine` |
| Criar / editar evento | `/organizer/events/new`, `/organizer/events/:id/edit` | `POST /events`, `PUT /events/{id}` |
| Gerenciar evento (abas Visão geral, Lotes, Configurações) | `/organizer/events/:id` | `GET /events/{id}/ticket-types`, `POST /events/{id}/ticket-types`, `DELETE /events/{id}` |
| Check-in | `/organizer/check-in` | `POST /tickets/{code}/check-in` |

### Rotas que o frontend espera e a API ainda precisa ter

- `GET /users/me` → `{ id, name, email, role }`: quem está logado e qual o papel.
- `organizerId` na resposta de `GET /events/{id}`: para saber se o evento é do usuário logado.
- `GET /events/mine` → página com os eventos do organizador logado.
- `featured` (booleano, opcional) em `GET /events`: marca os eventos da vitrine "Em destaque" da página inicial. Sem ele, a vitrine mostra os 5 próximos eventos.
- `imageUrl` (texto, opcional, só `https://`) em `GET /events`, `GET /events/{id}`, `POST /events` e `PUT /events/{id}`: a foto de capa do evento. Sem ele, o site mostra uma capa gerada a partir do nome e da data.

Enquanto elas não existem, as telas que dependem delas mostram um aviso em vez de botões que não funcionariam.

## Segurança

Resumo: a API protege; o frontend evita ser usado contra o usuário. CSP rígida com Trusted Types, cabeçalhos anti-clickjacking, sessão por aba com logout por inatividade, validação de IDs e redirecionamentos, fotos só em https, freio de tentativas no login e chave de idempotência nas compras.

Detalhes, tabela completa e o que precisa estar no backend: [docs/SEGURANCA.md](docs/SEGURANCA.md).

## Visual

- **Temas:** escuro por padrão e claro no botão de sol/lua. As cores são variáveis CSS em `src/index.css` (`--canvas`, `--surface`, `--line-strong`, `--accent`...): mudar uma delas muda o site inteiro. No tema claro, os cartões são brancos com borda e sombra sobre fundo cinza; no escuro, cada camada é um degrau mais clara e as bordas separam as caixas.
- **Vitrine de destaques:** só as fotos dos eventos, no topo da página inicial, trocando a cada 3 segundos (clicar abre o evento). Prioriza eventos com `featured: true`; sem isso, os próximos eventos que têm foto. Pausa com o mouse em cima, com foco do teclado ou no botão de pausa, e não se move para quem ativou "reduzir movimento".
- **Convite para organizadores:** aparece para visitantes (leva ao cadastro) e para compradores logados (leva à ativação na conta). Some para quem já é organizador.
- **Fotos sem corte:** na página do evento e na vitrine, a foto aparece inteira (`object-contain`), com uma cópia desfocada preenchendo as laterais. A altura acompanha a altura da tela, então em tela cheia a foto cresce. O botão "Ver foto inteira" abre a imagem sozinha sobre fundo preto.
- **Responsivo:** o conteúdo vai de 1 coluna no celular a 4 colunas em monitores grandes (largura máxima maior a partir de 1536px). No celular, a página do evento tem uma barra fixa com o preço e o botão de compra.
- **Fonte:** Plus Jakarta Sans, empacotada no build.

## Estrutura

```
src/
├── api/          # cliente HTTP, tipos dos DTOs e uma função por rota
├── auth/         # sessão (token), perfil (useMe) e guardas de rota
├── components/   # peças reutilizáveis (layout, abas, formulários, cartões)
├── theme/        # tema claro/escuro
├── pages/        # uma tela por rota
├── utils/        # formatação, carrinho, segurança e idempotência
├── App.tsx       # mapa de rotas
└── main.tsx      # ponto de entrada
```

## Ferramentas

Vite (servidor e build) · React · TypeScript · React Router · TanStack Query (chamadas à API e cache) · Tailwind CSS (visual) · qrcode.react (QR dos ingressos) · lucide-react (ícones) · Fontsource (fonte)
