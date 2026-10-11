# Intégration spécifique au backend BCA fourni

Ce kit remplace, pour BCA, l'exemple Express `../sabito-session.mjs`.
L'archive reçue est un backend Laravel 12 / PHP >= 8.2. Son frontend membres
est séparé (`FRONT_URL`) et l'API utilise `App\Services\JwtTokenService`.
Ne pas ajouter le widget au layout d'administration Blade par erreur.

## 1. Backend : uniquement ces ajouts

Depuis le dépôt Sabito, prévisualiser puis appliquer les ajouts à une copie
locale du dépôt backend BCA :

```sh
node deployment/bca/install-laravel.mjs /chemin/backend-bca
node deployment/bca/install-laravel.mjs /chemin/backend-bca --apply
```

Le script ajoute les quatre fichiers, enregistre la route et complète le CORS
sans retirer localhost. Il refuse d'écraser une version différente des fichiers
Sabito ou une configuration CORS différente de l'archive. Relire le `git diff`
du dépôt BCA avant son push. Il ne touche ni aux secrets ni à la base.
Les instructions manuelles équivalentes suivent.

Copier les fichiers fournis aux mêmes chemins relatifs dans le dépôt BCA :

- `app/Http/Controllers/SabitoSessionController.php`
- `config/sabito.php`
- `routes/sabito.php`
- `tests/Feature/SabitoSessionTest.php`

Ajouter à la fin du **fichier existant** `routes/api.php` :

```php
require __DIR__.'/sabito.php';
```

La route résultante est **POST /api/v2/sabito/session**. Ne pas ajouter un
second préfixe `/api`. Elle utilise le vrai JWT BCA : signature, expiration,
liste de révocation, jeton actif et état du compte en base. Aucune identité
du corps de requête n'est acceptée. Les comptes suspendus/inactifs sont refusés
(les administrateurs restent autorisés lorsqu'ils ne sont pas suspendus).

Dans l'environnement **du backend BCA**, et jamais dans Git :

```dotenv
SABITO_ENABLED=true
SABITO_URL=https://sabito.bizconnectacademy.com
SABITO_CLIENT_ID=<identifiant généré pour BCA dans Sabito>
SABITO_CLIENT_SECRET=<secret généré pour BCA dans Sabito>
SABITO_FRONTEND_ORIGINS=https://bizconnectacademy.com
```

Adapter la dernière valeur à l'origine réellement utilisée par le frontend
(ajouter `https://www.bizconnectacademy.com` séparé par une virgule seulement si
ce site est aussi utilisé). Les origines ne contiennent aucun chemin ni `*`.
Puis exécuter `php artisan config:cache` et vérifier
`php artisan route:list --path=sabito`. Si les routes sont mises en cache,
exécuter aussi `php artisan route:cache`. Aucun changement de base requis.

## 2. Frontend membres : branchement à la connexion existante

Copier `frontend/sabito-bca.mjs` dans les sources du vrai frontend BCA.
Après l'initialisation de son état d'authentification :

```js
import { installSabitoBca } from "./sabito-bca.mjs";

const widget = await installSabitoBca({
  apiOrigin: "https://DOMAINE-REEL-DU-BACKEND-BCA",
  getAccessToken: () => authStore.getState().accessToken,
});
```

`authStore.getState().accessToken` est **le seul exemple à remplacer** par le
getter réel du frontend. Ne pas copier un JWT en dur. Ce frontend n'est pas
dans l'archive fournie, son getter ne peut donc pas être déduit ici.
Le getter doit lire le jeton courant après toute actualisation de connexion.
Gérer le rejet de `installSabitoBca` pour signaler un échec de chargement.

Appeler `window.SabitoWidget?.logout()` avant la déconnexion et avant un changement
de compte ; appeler `window.SabitoWidget?.login()` après la nouvelle connexion.
Ne pas charger en plus une deuxième balise script Sabito.

Le JWT BCA est envoyé **uniquement au backend BCA**, en Authorization Bearer.
Le backend remet un jeton Sabito temporaire ; seul celui-ci entre dans l'iframe.
Cette route ne s'authentifie pas avec des cookies : le mécanisme anti-CSRF
du kit Express ne s'applique pas. Les deux contrôles sont JWT BCA vérifié
et origine frontend autorisée, puis authentification serveur-à-serveur Sabito.

Vérifier que le CORS BCA autorise l'origine frontend, POST, Authorization et Accept.
Dans l'archive reçue, `config/cors.php` n'autorise que localhost.
Dans son tableau `allowed_origins`, **conserver les valeurs existantes** et
ajouter les origines de production, ou remplacer sa valeur par :

```php
'allowed_origins' => array_values(array_unique(array_merge(
    ['http://localhost:5173', 'http://127.0.0.1:5173'],
    array_filter(array_map('trim', explode(',', (string) env('SABITO_FRONTEND_ORIGINS', ''))))
))),
```

Ne pas changer les autres paramètres CORS des routes BCA existantes.
Le widget emploie `credentials: omit`, pas de cookies intersites.
Dans Sabito/Plesk, ajouter cette même origine à `CORS_ORIGINS`, conserver
`PUBLIC_URL=https://sabito.bizconnectacademy.com`, puis Restart.
La CSP du frontend doit autoriser le domaine Sabito dans `script-src` et
`frame-src`, et son backend BCA dans `connect-src`.

## Limites et vérifications

Publier d'abord la nouvelle version du widget Sabito, puis installer ces fichiers
dans BCA. Le code est fourni ici, il n'a pas été poussé dans le dépôt BCA ni publié.
Tester `php artisan test --filter=SabitoSessionTest` dans le backend BCA.
Tester deux comptes réels après branchement frontend, sans données de production
dans les tests automatisés. Utiliser un cache serveur partagé en multi-instance
pour préserver la révocation BCA et la limitation de débit.

Un jeton Sabito déjà émis expire après au plus 15 minutes. La déconnexion ferme
le widget, mais ne révoque pas instantanément ce jeton côté Sabito.
Cette étape n'autorise **aucune lecture de transactions** ni de données métier :
le chat répond encore uniquement depuis les références validées de Sabito.
