/* Sabito embeddable chat loader. Usage:
 * <script src="https://sabito.example/widget/sabito-chat.js" data-api-url="https://sabito.example"
 *   data-session-url="/api/sabito/session" data-title="Assistant" data-primary-color="#2f3bd6" data-position="right" async></script>
 * Token stays in memory only; identity comes only from the host backend session endpoint.
 */
(function () {
  "use strict";
  if (window.SabitoWidget) return;
  var script = document.currentScript;
  if (!script) return;
  var ds = script.dataset;
  // Optional BCA adapter: exchanges the host app's existing JWT on its own API.
  // The provider returns a fetch Response, never sends the BCA JWT to this iframe.
  var sessionProvider = typeof window.SabitoWidgetSession === "function" ? window.SabitoWidgetSession : null;
  function fail(m) { if (window.console) console.error("[Sabito] " + m); }

  var apiUrl;
  try { apiUrl = new URL(ds.apiUrl || ""); } catch (e) { return fail("data-api-url invalide"); }
  var local = apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1";
  if (apiUrl.protocol !== "https:" && !(local && apiUrl.protocol === "http:")) return fail("data-api-url doit être en HTTPS");
  if (apiUrl.username || apiUrl.password || apiUrl.hash || apiUrl.search || apiUrl.pathname !== "/") return fail("data-api-url doit être une origine simple (sans identifiants, chemin, requête ni fragment)");
  var sabitoOrigin = apiUrl.origin;
  var projectId = ds.projectId || "";
  var visitorToken = null;
  if (projectId && !/^[a-f0-9-]{36}$/i.test(projectId)) return fail("data-project-id invalide");
  if (projectId && !sessionProvider) sessionProvider = function (options) {
    return fetch(new URL("/v1/widget/" + projectId + "/session", sabitoOrigin), {
      method: "POST", mode: "cors", credentials: "omit", cache: "no-store",
      redirect: "error", signal: options.signal, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(visitorToken ? { visitor_token: visitorToken } : {})
    }).then(function (response) {
      if (response.status === 401) visitorToken = null;
      if (!response.ok) return response;
      return response.clone().json().then(function (data) {
        if (!options.signal.aborted) visitorToken = data.access_token;
        return response;
      });
    });
  };

  var rawSession = ds.sessionUrl || "/api/sabito/session";
  if (rawSession.indexOf("#") !== -1) return fail("data-session-url ne doit pas contenir de fragment");
  var sessionUrl;
  try { sessionUrl = new URL(rawSession, location.href); } catch (e) { return fail("data-session-url invalide"); }
  if (sessionUrl.origin !== location.origin) return fail("data-session-url doit être same-origin");
  if (sessionUrl.username || sessionUrl.password) return fail("data-session-url ne doit pas contenir d'identifiants");

  var HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  var title = (ds.title || "Sabito").slice(0, 60);
  var rawColor = ds.primaryColor || ds.color || "";
  var color = HEX.test(rawColor) ? rawColor : "#2f3bd6";
  var position = ds.position === "left" ? "left" : "right";
  var productCode = (ds.productCode || "").slice(0, 80); // project slug used for frame authorization, never member authentication
  var HANDSHAKE_MS = 12000, FETCH_MS = 10000;

  var rnd = new Uint8Array(16); crypto.getRandomValues(rnd);
  var channel = Array.prototype.map.call(rnd, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");

  var loggedOut = false, generation = 0, open = false, iframe = null, handshaken = false, hsTimer = 0;
  var inflight = null; // { gen, ctrl }

  var host = document.createElement("div");
  host.setAttribute("data-sabito-widget", "");
  var root = host.attachShadow({ mode: "closed" });
  var side = position + ":20px";
  var safeTitle = title.replace(/['<>&"]/g, "");
  root.innerHTML =
    "<style>:host{all:initial}" +
    ".btn{position:fixed;bottom:20px;" + side + ";z-index:2147483000;height:46px;padding:0 20px 0 16px;border-radius:999px;border:1px solid rgba(178,92,255,.75);cursor:pointer;background:linear-gradient(#17151f,#17151f) padding-box,linear-gradient(120deg,#7c4dff,#d63fd0 55%,#6a3cff) border-box;border-color:transparent;color:#fff;box-shadow:0 10px 28px rgba(14,10,30,.38);display:inline-flex;align-items:center;gap:10px;font:600 15px/1 system-ui,-apple-system,'Segoe UI',sans-serif;letter-spacing:.01em;white-space:nowrap;transition:transform .2s,box-shadow .2s}" +
    ".btn:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(14,10,30,.45)}.btn svg{flex:none;display:block}button:focus-visible{outline:3px solid #f2b84b;outline-offset:3px}" +
    ".panel{position:fixed;bottom:90px;" + side + ";z-index:2147483000;width:380px;height:min(620px,calc(100dvh - 110px));border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(20,24,60,.3);background:#f6f4ee;opacity:0;transform:translateY(12px);visibility:hidden;pointer-events:none;transition:opacity .2s,transform .2s,visibility 0s .2s}" +
    ".panel.open{opacity:1;transform:none;visibility:visible;pointer-events:auto;transition:opacity .2s,transform .2s,visibility 0s}iframe{border:0;width:100%;height:100%;display:block}" +
    ".err{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;font:14px/1.5 system-ui,sans-serif;color:#8a3417;background:#f6f4ee}" +
    ".err.show{display:flex}.err .row{display:flex;gap:8px}.err button{border:0;border-radius:12px;padding:9px 14px;font:600 13px system-ui,sans-serif;cursor:pointer}" +
    ".retry{background:" + color + ";color:#fbfaf6}.close{background:#e7e3d8;color:#1a1d2e}" +
    "@media (max-width:520px){.panel{inset:0;width:100%;height:100dvh;border-radius:0;bottom:0}.panel.open~.btn{display:none}}</style>" +
    "<div class='panel' role='dialog' aria-label='" + safeTitle + "' aria-hidden='true'>" +
    "<div class='err' role='alert'><p class='msg'>Le chat n'a pas pu être chargé.</p><div class='row'>" +
    "<button type='button' class='retry'>Réessayer</button><button type='button' class='close'>Fermer</button></div></div></div>" +
    "<button class='btn' type='button' aria-expanded='false' aria-label='Ouvrir le chat'>" +
    "<svg width='22' height='22' viewBox='0 0 24 24' fill='#fff' aria-hidden='true'><path d='M3 4.5 11 9 8.6 12z'/><path d='M3 19.5 11 15 8.6 12z'/><path d='M12.5 6 21 12l-8.5 0z'/><path d='M12.5 18 21 12l-8.5 0z'/><path d='M8.6 12l3.9-2.2v4.4z'/></svg><span>Sabito AI</span></button>";
  var panel = root.querySelector(".panel");
  var btn = root.querySelector(".btn");
  var errBox = root.querySelector(".err");
  var errMsg = root.querySelector(".msg");
  panel.inert = true;

  function showFrameError(m) {
    errMsg.textContent = m;
    errBox.classList.add("show");
  }
  function hideFrameError() { errBox.classList.remove("show"); }

  function buildIframe() {
    if (iframe) { iframe.remove(); iframe = null; }
    handshaken = false; hideFrameError();
    iframe = document.createElement("iframe");
    var u = new URL("/widget/chat", sabitoOrigin);
    u.searchParams.set("parentOrigin", location.origin);
    u.searchParams.set("channel", channel);
    u.searchParams.set("title", title);
    u.searchParams.set("color", color);
    if (productCode) u.searchParams.set("product", productCode);
    if (projectId) u.searchParams.set("projectId", projectId);
    iframe.src = u.toString();
    iframe.title = title;
    panel.insertBefore(iframe, errBox);
    clearTimeout(hsTimer);
    hsTimer = setTimeout(function () {
      if (!handshaken) showFrameError("Le chat n'a pas pu être chargé (site non autorisé ou service indisponible).");
    }, HANDSHAKE_MS);
  }
  function ensureIframe() { if (!iframe) buildIframe(); }
  function post(msg) {
    // Before the child confirms its channel it may still be about:blank, whose
    // origin is the host site's rather than Sabito's.
    if (!iframe || !iframe.contentWindow || !handshaken) return;
    msg.channel = channel;
    iframe.contentWindow.postMessage(msg, sabitoOrigin);
  }
  function setOpen(v) {
    open = v;
    panel.classList.toggle("open", v);
    panel.inert = !v;
    panel.setAttribute("aria-hidden", String(!v));
    btn.setAttribute("aria-expanded", String(v));
    btn.setAttribute("aria-label", v ? "Fermer le chat" : "Ouvrir le chat");
    if (v) { ensureIframe(); post({ type: "sabito:focus" }); }
  }
  btn.addEventListener("click", function () { setOpen(!open); });
  root.querySelector(".retry").addEventListener("click", buildIframe);
  root.querySelector(".close").addEventListener("click", function () { setOpen(false); btn.focus(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && open) { setOpen(false); btn.focus(); } });

  function csrf() { var m = document.querySelector('meta[name="csrf-token"]'); return m ? m.getAttribute("content") || "" : ""; }
  function err(code, message) { var e = new Error(message); e.code = code; return e; }
  function abortInflight() { if (inflight) { try { inflight.ctrl.abort(); } catch (e) { /* ignore */ } inflight = null; } }

  function fetchSession() {
    if (loggedOut) { post({ type: "sabito:error", code: "logged_out", message: "Session terminée. Reconnectez-vous." }); return; }
    if (inflight && inflight.gen === generation) return; // serialize: one request per generation at a time
    abortInflight();
    var gen = generation;
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, FETCH_MS);
    var me = { gen: gen, ctrl: ctrl };
    inflight = me;
    var headers = { "Accept": "application/json", "Content-Type": "application/json" };
    var t = csrf(); if (t) headers["X-CSRF-Token"] = t;
    var operation = sessionProvider
      ? Promise.resolve().then(function () { return sessionProvider({ signal: ctrl.signal }); })
      : fetch(sessionUrl.toString(), { method: "POST", credentials: "same-origin", redirect: "error", headers: headers, body: "{}", cache: "no-store", signal: ctrl.signal });
    Promise.race([operation, new Promise(function (_, reject) {
      ctrl.signal.addEventListener("abort", function () { reject(err("timeout", "Session interrompue ou délai dépassé.")); }, { once: true });
    })])
      .then(function (r) {
        if (r.status === 401 || r.status === 403) throw err("unauthenticated", "Non connecté");
        if (!r.ok) throw err("session_failed", "Session indisponible (" + r.status + ")");
        return r.json();
      })
      .then(function (j) {
        if (inflight !== me || gen !== generation || loggedOut) return; // stale
        var d = j && j.data && j.data.access_token ? j.data : j;
        var ttl = d ? Number(d.expires_in) : NaN;
        if (!d || typeof d.access_token !== "string" || !d.access_token || typeof d.external_user_id !== "string" || !d.external_user_id)
          throw err("invalid_session", "Réponse de session invalide");
        if (!isFinite(ttl) || ttl < 1 || ttl > 900) throw err("invalid_session", "Durée de session invalide");
        post({ type: "sabito:session", session: { access_token: d.access_token, expires_in: ttl, socket_path: "/socket.io", external_user_id: d.external_user_id } });
      })
      .catch(function (e) {
        if (inflight !== me || gen !== generation) return;
        var code = e && e.code ? e.code : (e && e.name === "AbortError" ? "timeout" : "network");
        post({ type: "sabito:error", code: code, message: code === "timeout" ? "Délai dépassé pour la session." : (e && e.code ? e.message : "Erreur réseau") });
      })
      .then(function () { clearTimeout(timer); if (inflight === me) inflight = null; });
  }

  window.addEventListener("message", function (e) {
    if (!iframe || e.origin !== sabitoOrigin || e.source !== iframe.contentWindow) return;
    var d = e.data;
    if (!d || typeof d !== "object" || d.channel !== channel) return;
    if (!handshaken) { handshaken = true; clearTimeout(hsTimer); hideFrameError(); }
    if (d.type === "sabito:session-request") fetchSession();
    else if (d.type === "sabito:close") { setOpen(false); btn.focus(); }
  });

  function logout() {
    visitorToken = null;
    loggedOut = true; generation++; abortInflight();
    post({ type: "sabito:logout" });
    setOpen(false);
  }
  function login() {
    loggedOut = false; generation++; abortInflight();
    post({ type: "sabito:login" });
  }
  document.addEventListener("sabito:logout", logout);
  document.addEventListener("sabito:login", login);

  window.SabitoWidget = Object.freeze({ open: function () { setOpen(true); }, close: function () { setOpen(false); }, logout: logout, login: login });
  (document.body || document.documentElement).appendChild(host);
})();
