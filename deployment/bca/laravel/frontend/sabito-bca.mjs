// Import into the actual BCA frontend. No dependency, no localStorage assumption.
export function installSabitoBca({ apiOrigin, getAccessToken,
  sabitoOrigin = "https://sabito.bizconnectacademy.com" }) {
  const api = new URL(apiOrigin);
  const sabito = new URL(sabitoOrigin);
  for (const url of [api, sabito]) {
    if (url.protocol !== "https:" || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash) throw new Error("Origine HTTPS invalide.");
  }
  if (typeof getAccessToken !== "function") throw new Error("Le fournisseur de session BCA est requis.");
  if (window.SabitoWidget || document.querySelector("[data-sabito-bca]")) {
    throw new Error("Le widget Sabito est déjà installé.");
  }
  window.SabitoWidgetSession = async ({ signal }) => {
    // Get the CURRENT auth state every time, including after refresh/account switch.
    const jwt = await getAccessToken();
    if (typeof jwt !== "string" || !jwt) {
      return new Response(JSON.stringify({ error: "AUTHENTICATION_REQUIRED" }), { status: 401 });
    }
    return fetch(new URL("/api/v2/sabito/session", api), {
      method: "POST", credentials: "omit", redirect: "error", cache: "no-store",
      signal, headers: { Accept: "application/json", Authorization: `Bearer ${jwt}` },
    });
  };
  const script = document.createElement("script");
  script.dataset.sabitoBca = "";
  script.src = new URL("/widget/sabito-chat.js", sabito).href;
  script.dataset.apiUrl = sabito.origin;
  script.dataset.productCode = "bca";
  script.dataset.title = "Sabito — Assistant BCA";
  script.dataset.primaryColor = "#4f46e5";
  script.defer = true;
  const ready = new Promise((resolve, reject) => {
    script.onload = () => window.SabitoWidget
      ? resolve(window.SabitoWidget) : reject(new Error("Le widget Sabito n'a pas démarré."));
    script.onerror = () => { script.remove(); reject(new Error("Chargement du widget Sabito impossible.")); };
  });
  document.head.appendChild(script);
  return ready;
}
