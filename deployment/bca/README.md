# BCA / Buzzbooster : connexion du chat Sabito

Le backend BCA n'est pas présent dans ce dépôt. Ce module doit être installé
dans ce backend par Yvan ; il ne crée pas automatiquement une route BCA depuis
le serveur Sabito. Les accès aux transactions ne font pas partie de cette étape.

## Installation serveur

Copier `sabito-session.mjs` dans le backend de la plateforme.
Variables privées : `SABITO_URL=https://sabito.bizconnectacademy.com`,
`SABITO_CLIENT_ID`, `SABITO_CLIENT_SECRET` (générés dans Sabito).
Utiliser des identifiants distincts pour BCA et Buzzbooster.

Exemple de montage Express (adapter les deux fonctions à l'authentification
existante ; ne pas les remplacer par un utilisateur fixe ni par `return true`) :

```js
import { createSabitoSessionHandler } from "./sabito-session.mjs";

app.post("/api/sabito/session",
  platformSessionMiddleware,
  platformRateLimiter, // Exemple : 30 requêtes/minute par session, stockage partagé.
  createSabitoSessionHandler({
    sabitoUrl: process.env.SABITO_URL,
    clientId: process.env.SABITO_CLIENT_ID,
    clientSecret: process.env.SABITO_CLIENT_SECRET,
    platformOrigin: process.env.APP_ORIGIN, // origine publique exacte de BCA
    getAuthenticatedUser: async req => {
      // Fonction du projet : contrôle expiration, révocation, compte désactivé.
      const user = await findCurrentActiveSessionUser(req);
      return user ? { id: String(user.id) } : null;
    },
    verifyCsrf: async req => {
      // Fonction du projet : vérifier X-CSRF-Token contre la session actuelle.
      return await validateSessionCsrf(req);
    },
  }),
);
```

Ces noms de middlewares/fonctions représentent les fonctions à raccorder dans
BCA, pas des exports fournis par Sabito. En cas d'identifiants multiples entre
organisations, produire une identité serveur stable et unique par organisation.
La route doit répondre 401 lorsqu'une session est absente/révoquée.
Ne pas accepter de `user_id` du navigateur. Ne pas activer CORS pour cette route.
Sécuriser les cookies de session (Secure, HttpOnly, SameSite adapté au projet).

## Montage frontend

Exposer le jeton CSRF de la session dans une balise meta échappée par le moteur
de templates (ce n'est pas le secret Sabito), ou adapter le transport du widget
au mécanisme CSRF de votre framework :

```html
<meta name="csrf-token" content="JETON_CSRF_DE_LA_SESSION">
<script defer
  src="https://sabito.bizconnectacademy.com/widget/sabito-chat.js"
  data-api-url="https://sabito.bizconnectacademy.com"
  data-session-url="/api/sabito/session"
  data-product-code="bca"
  data-title="Sabito — Assistant BCA"
  data-language="fr"
  data-primary-color="#4f46e5"
  data-position="right"></script>
```

Lors de la déconnexion/changement de compte dans une SPA, appeler
`window.SabitoWidget?.logout()` **avant** de terminer la déconnexion.
Après une nouvelle authentification réussie, appeler
`window.SabitoWidget?.login()`. La vérification périodique détecte aussi une
session expirée ; un jeton déjà délivré expire au plus tard après 15 minutes.
Ne pas prétendre à une révocation instantanée de ce jeton au niveau du serveur
Sabito : un mécanisme serveur-à-serveur serait nécessaire pour cela.

## Configuration Sabito sur Plesk

Garder `PUBLIC_URL=https://sabito.bizconnectacademy.com`.
Ajouter les origines exactes des sites autorisés à `CORS_ORIGINS`, séparées par
des virgules, puis Restart. Pas de `*` et pas de chemin après le domaine.
Autoriser dans la CSP de BCA le script et l'iframe du domaine Sabito
(`script-src`, `frame-src`). Le widget contacte le backend BCA en même origine.
Le code produit public n'est jamais utilisé comme autorisation.

## Vérifications avant publication

1. Sans connexion BCA : pas de jeton, pas d'historique.
2. Session valide + CSRF valide : réponse avec jeton temporaire, jamais un secret.
3. Mauvaise origine, CSRF absent/faux : refus 403.
4. Un `user_id` ajouté dans le corps ne change pas l'identité.
5. Deux comptes/plateformes ne peuvent pas consulter les conversations de l'autre.
6. Déconnexion/changement de compte : fermeture et effacement du widget.
7. Envoyer une question avec une référence validée correspondante dans Sabito.
8. Panne de Sabito : erreur explicite et réessai, pas de réponse simulée.

Compiler sur GitHub puis Pull / Deploy Now / Restart dans Plesk, sans build
sur l'hébergement. Aucun accès direct aux données métier n'est activé ici.
