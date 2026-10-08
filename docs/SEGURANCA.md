# Segurança do Ticketfy Web

Regra de ouro: **quem protege é a API.** O frontend roda no computador do usuário e pode ser alterado por ele. Tudo o que está aqui serve para não deixar a interface ser usada contra o usuário e para dificultar abusos simples, nunca para substituir a validação do backend.

## O que o frontend faz

| Proteção | Onde | Contra o quê |
|---|---|---|
| Content-Security-Policy rígida (sem script inline, sem `unsafe-inline` em estilos, Trusted Types) | `vite.config.ts` | XSS: script injetado não executa e não consegue mandar dados para fora |
| `frame-ancestors 'none'` e `X-Frame-Options: DENY` | `dist/_headers` | Clickjacking (site aberto escondido dentro de um iframe) |
| `Referrer-Policy: no-referrer` | `index.html` e `_headers` | Vazamento do endereço da página para sites de imagens e mapas |
| Token só no `sessionStorage`, conferido (formato e expiração) antes de usar | `src/auth/AuthContext.tsx` | Sessão esquecida aberta, token adulterado ou vencido |
| Logout por inatividade (30 min) e a cada 401 | `src/auth/AuthContext.tsx` | Computador compartilhado |
| Cache das consultas limpo no login/logout e `cache: "no-store"` em requisições logadas | `AuthContext.tsx`, `api/client.ts` | Dados de um usuário aparecendo para o próximo |
| `credentials: "omit"` em todo fetch | `src/api/client.ts` | CSRF (não existe cookie para ser abusado) |
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

## O que precisa estar na API (o frontend não resolve)

- Limite de tentativas de login por IP e por e-mail, respondendo `429`.
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

Para conferir, abra o site publicado, aperte F12, vá na aba Network, clique na primeira requisição e veja os Response Headers.

## Aviso sobre fotos externas

Como a foto é uma URL de outro site, esse site fica sabendo o IP de quem viu o evento (o `no-referrer` esconde de qual página, mas não o acesso em si). Para eliminar isso, o caminho seria o backend receber o upload e guardar a imagem num storage próprio (S3, Cloudinary).
