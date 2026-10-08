// Gera a chave de idempotência de uma tentativa de compra.
//
// "Idempotente" quer dizer: repetir a mesma operação dá o mesmo resultado.
// A mesma chave é reenviada se o usuário clicar duas vezes ou tentar de novo
// depois de um erro de rede, e a API devolve o mesmo pedido em vez de criar outro.
//
// crypto.randomUUID usa o gerador criptográfico do navegador: a chave não
// dá para ser adivinhada (Math.random daria). Só existe em páginas seguras
// (https ou localhost), por isso o plano B com getRandomValues.
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b: number) => b.toString(16).padStart(2, "0")).join("");
}
