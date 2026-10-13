(function () {
  var locale = "pt-BR";
  function match(tag) {
    if (typeof tag !== "string") return null;
    var lower = tag.trim().toLowerCase();
    if (lower === "pt" || lower.indexOf("pt-") === 0) return "pt-BR";
    if (lower === "en" || lower.indexOf("en-") === 0) return "en";
    return null;
  }
  try {
    var saved = localStorage.getItem("ticketfy.locale");
    if (saved === "pt-BR" || saved === "en") {
      locale = saved;
    } else {
      var languages = navigator.languages || [navigator.language];
      for (var i = 0; i < languages.length; i++) {
        var found = match(languages[i]);
        if (found) {
          locale = found;
          break;
        }
      }
    }
  } catch (e) {
    locale = "pt-BR";
  }
  document.documentElement.setAttribute("lang", locale);
})();
