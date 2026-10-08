// Configuração do Vite (servidor de desenvolvimento e build de produção).
//
// A maior parte daqui é segurança. Resumo do que cada peça faz:
//
// 1. Content-Security-Policy (CSP): uma lista do que o navegador pode
//    carregar. Se um atacante conseguir injetar um <script> na página
//    (XSS), o navegador se recusa a executá-lo, porque só scripts do
//    próprio site são permitidos. Também limita para onde a página pode
//    mandar dados (só para a API), então um script malicioso não
//    conseguiria enviar o token para um servidor de fora.
//
// 2. Cabeçalhos HTTP de segurança: proteções que só funcionam como
//    cabeçalho (não como <meta>), como impedir que o site seja aberto
//    dentro de um <iframe> de outro site (clickjacking). O build gera o
//    arquivo dist/_headers, que Netlify e Cloudflare Pages leem sozinhos.
//    Em outras hospedagens, copie os valores para a configuração delas
//    (veja docs/SEGURANCA.md).
//
// 3. Checagem da URL da API: o build falha se a API de produção não for
//    https, para nunca publicar um site que manda senha sem criptografia.

import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function buildCsp(apiOrigin: string, { forHeader }: { forHeader: boolean }) {
  const directives = [
    "default-src 'self'", // por padrão, só o próprio site
    "script-src 'self'", // nada de script inline, eval ou de outros domínios
    "style-src 'self'", // CSS só dos arquivos do build
    "img-src 'self' data: https:", // fotos de evento vêm de URLs https externas
    "font-src 'self'", // fontes empacotadas no build (sem Google Fonts)
    `connect-src 'self' ${apiOrigin}`, // fetch só para a API
    "object-src 'none'", // sem plugins (Flash, Java applet...)
    "frame-src 'none'", // a página não abre iframes
    "worker-src 'none'",
    "manifest-src 'self'",
    "base-uri 'self'", // impede trocar a base dos links relativos
    "form-action 'self'", // formulários não enviam para outros domínios
    // Trusted Types: bloqueia atribuições perigosas como element.innerHTML = texto.
    // É a principal porta de entrada de XSS, e o React não precisa dela.
    "require-trusted-types-for 'script'",
  ];
  // Só como cabeçalho: no <meta> o navegador ignora esta diretiva.
  if (forHeader) directives.push("frame-ancestors 'none'");
  if (apiOrigin.startsWith("https://")) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

// Cabeçalhos que valem para qualquer resposta do site.
const securityHeaders = {
  "X-Content-Type-Options": "nosniff", // o navegador não "adivinha" o tipo do arquivo
  "X-Frame-Options": "DENY", // versão antiga do frame-ancestors, para navegadores velhos
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin", // outra aba aberta por link não controla esta
};

function securityPlugin(apiOrigin: string): Plugin {
  const headerCsp = buildCsp(apiOrigin, { forHeader: true });
  return {
    name: "ticketfy-security",
    // CSP no index.html do build (fica fora do modo dev porque o Vite usa
    // scripts inline para recarregar a página automaticamente).
    transformIndexHtml: {
      order: "post",
      handler(html, ctx) {
        if (!ctx.bundle) return html; // só no build
        const meta = `<meta http-equiv="Content-Security-Policy" content="${buildCsp(apiOrigin, { forHeader: false })}" />`;
        // Logo depois do charset (que precisa ser a primeira coisa do <head>).
        return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    ${meta}`);
      },
    },
    // Gera dist/_headers para hospedagens que entendem esse formato.
    generateBundle() {
      const lines = ["/*", `  Content-Security-Policy: ${headerCsp}`, ...Object.entries(securityHeaders).map(([k, v]) => `  ${k}: ${v}`)];
      // Os arquivos de /assets têm hash no nome: podem ficar em cache para sempre.
      lines.push("", "/assets/*", "  Cache-Control: public, max-age=31536000, immutable", "");
      this.emitFile({ type: "asset", fileName: "_headers", source: lines.join("\n") });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiUrl = env.VITE_API_URL || "http://localhost:8080";

  let apiOrigin: string;
  try {
    apiOrigin = new URL(apiUrl).origin;
  } catch {
    throw new Error(`VITE_API_URL inválida: "${apiUrl}"`);
  }
  const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(apiOrigin);
  if (command === "build" && !apiOrigin.startsWith("https://") && !isLocal) {
    throw new Error(`Em produção a API precisa usar https. VITE_API_URL atual: ${apiUrl}`);
  }

  return {
    plugins: [react(), tailwindcss(), securityPlugin(apiOrigin)],
    // Em dev, só os cabeçalhos que não atrapalham o recarregamento automático.
    server: { port: 5173, strictPort: true, headers: securityHeaders },
    // "npm run preview" serve o build igual à produção, com CSP completa.
    preview: {
      port: 4173,
      headers: { ...securityHeaders, "Content-Security-Policy": buildCsp(apiOrigin, { forHeader: true }) },
    },
    build: {
      sourcemap: false, // não publica o código-fonte original junto com o site
      // Não embute arquivos pequenos como "data:" dentro do CSS/JS: assim
      // fontes e imagens respeitam a CSP (font-src 'self').
      assetsInlineLimit: 0,
    },
  };
});
