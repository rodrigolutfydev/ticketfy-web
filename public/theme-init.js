// Aplica o tema salvo ANTES do React carregar, para a tela não piscar em
// branco ao abrir no tema escuro (ou vice-versa).
// Fica num arquivo próprio (e não num <script> dentro do HTML) porque a
// Content-Security-Policy do projeto proíbe scripts inline.
(function () {
  try {
    var saved = localStorage.getItem("ticketfy.theme");
    var theme = saved === "light" || saved === "dark" ? saved : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();
