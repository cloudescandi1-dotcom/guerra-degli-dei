// Niente incorniciamento da altri siti: se il gioco e' dentro la pagina di qualcun altro,
// prova a portare la finestra intera al gioco, altrimenti svuota la pagina.
// Va caricato per primo, come file esterno (la CSP vieta gli script scritti dentro la pagina).
(function (root) {
  'use strict';
  if (root.top !== root.self) {
    try { root.top.location = root.self.location.href; } catch (e) { document.documentElement.innerHTML = ''; }
  }
})(window);
