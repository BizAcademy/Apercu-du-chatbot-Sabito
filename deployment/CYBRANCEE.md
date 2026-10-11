# Installer Sabito sur Cybrancee / Plesk

Ce paquet contient le dashboard compilé et le serveur Node.js. Il ne contient
aucun secret, aucune base de données et aucune connexion automatique aux données
BCA. Le moteur de réponses utilise les connaissances approuvées, sans appel IA payant.

## Prérequis

- Une offre avec Node.js activable dans Plesk, version 22 ou supérieure.
- MySQL 8+ ou MariaDB 10.6+, moteur InnoDB et utf8mb4.
- Un domaine HTTPS et le support des connexions Socket.IO / WebSocket.
- L'utilisateur de la base doit pouvoir créer les tables, index et clés étrangères,
  puis lire/écrire/supprimer les données de cette base. Il n'a pas besoin de pouvoir
  créer une nouvelle base ni d'être administrateur du serveur.

Le paquet n'est pas un site statique : le déposer dans `httpdocs` ne suffit pas
à démarrer le chatbot. Si l'option Node.js n'existe pas, vérifier l'offre avec
Cybrancee avant tout achat ou changement.

## 1. Préparer le paquet

Dans l'environnement de développement :

```sh
pnpm run build:cybrancee
```

Le résultat est `generated-artifacts/sabito-cybrancee.zip`.
Décompresser son **contenu** dans un dossier privé dédié au domaine, par exemple
`sabito-app`. Ne pas écraser un autre site. La structure attendue est :

```text
sabito-app/
  app.js
  index.mjs
  package.json
  .env.example
  INSTALLATION.md
  public/
    index.html
    assets/
  ... fichiers workers du serveur
```

## 2. Configurer Node.js dans Plesk

Ouvrir Sites Web et domaines → le domaine Sabito → Node.js :

- Version Node.js : **22 ou supérieure**.
- Mode application : **production**.
- Racine de l'application : le dossier contenant `app.js` et `package.json`.
- Racine du document : le sous-dossier **`public`** de cette application.
- Fichier de démarrage : **`app.js`**.

La racine du document doit rester `public` : ne jamais exposer le dossier
contenant les secrets, les fichiers serveur ou `package.json`.
Laisser Plesk gérer son port d'application. Ne pas réutiliser les ports de Replit.
Activer Node.js, puis utiliser l'action d'installation NPM pour installer les
dépendances du `package.json` fourni. Aucune compilation ni pnpm n'est nécessaire
sur l'hébergement pour ce paquet précompilé.

## 3. Variables d'environnement privées

Dans les variables personnalisées Node.js, créer :

| Nom | Valeur |
| --- | --- |
| `DB_HOST` | Hôte MySQL/MariaDB ; `localhost` si Sabito et la base sont sur le même serveur |
| `DB_PORT` | Port MySQL/MariaDB, généralement `3306` |
| `DB_NAME` | Nom exact de la base créée dans Plesk |
| `DB_USER` | Nom exact de l'utilisateur de cette base |
| `DB_PASSWORD` | Mot de passe réel de cet utilisateur, sans encodage URL |
| `DB_SSL` | `true` si la connexion distante exige TLS ; sinon `false` |
| `ADMIN_API_KEY` | La clé administrateur Sabito, au moins 24 caractères |
| `JWT_SECRET` | La clé de signature Sabito, au moins 32 caractères |
| `CLIENT_SECRET_PEPPER` | La clé de protection des secrets, au moins 32 caractères |
| `PUBLIC_URL` | L'origine HTTPS du domaine Sabito, sans `/` final |
| `CORS_ORIGINS` | L'origine Sabito et les origines frontends BCA autorisées, séparées par des virgules |
| `SABITO_AI_ENABLED` | `false` |

Pour le domaine actuellement utilisé, `PUBLIC_URL` est
`https://sabito.bizconnectacademy.com`. Si le domaine change, modifier cette valeur.

Le port MySQL est souvent 3306, mais utiliser celui indiqué dans Plesk.
L'hôte n'est `localhost` que si Plesk indique que la base est accessible localement.
Le mot de passe est celui de **l'utilisateur de la base**, pas celui du compte Plesk.
Avec les champs séparés, saisir le mot de passe tel quel, sans encoder ses
caractères spéciaux. Dans un fichier `.env`, entourer le mot de passe de guillemets
adaptés si nécessaire, notamment s'il contient `#` ou des espaces ; les variables
personnalisées Plesk n'exigent pas ces guillemets.
Si le serveur MySQL distant exige TLS, définir `DB_SSL=true` ; la validation des
certificats reste activée. Une autorité privée nécessite une configuration adaptée,
pas une désactivation des contrôles TLS.

Les champs `DB_*` sélectionnent MySQL/MariaDB et sont prioritaires sur
`DATABASE_URL`. Une configuration partielle est refusée : Sabito ne revient pas
silencieusement à PostgreSQL. L'ancien format `DATABASE_URL=mysql://...` reste
compatible uniquement en l'absence des champs `DB_*`.

Dans Replit, ne pas modifier le `DATABASE_URL` géré automatiquement. Ajouter
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` et `DB_PASSWORD` aux Secrets, puis
redémarrer le serveur API. `localhost` désigne alors Replit : pour une base
Cybrancee, il faut un hôte distant accessible, sauf si Sabito tourne sur Cybrancee.
Changer les paramètres ne transfère pas les plateformes ou connaissances de
l'ancienne base. Aucune base PostgreSQL n'est supprimée.

Réutiliser les trois clés internes existantes si l'on conserve les mêmes
identifiants de plateforme. Ne jamais publier les valeurs dans un dépôt, une capture
ou le chat. Les variables de Replit ne sont **pas** copiées automatiquement à Cybrancee.

Si les variables personnalisées ne sont pas accessibles, une alternative est un
fichier `.env` privé **à côté de `app.js`, jamais dans `public`**.
Le `.env.example` n'est qu'un modèle : ses valeurs fictives ne doivent pas être utilisées.

## 4. Démarrer et vérifier

Redémarrer l'application Node.js. Sabito crée de façon additive les tables
`sabito_*` dans la base MySQL sélectionnée. Aucune table existante n'est supprimée
ou convertie. La création peut prendre quelques secondes et exige les droits
indiqués plus haut.

Vérifier :

- `/api/healthz` → `{"status":"ok"}` ;
- `/api/v1/status` → `"configured": true` et `"missingSecrets": []` ;
- `/admin` → connexion Sabito, puis ouverture du dashboard avec la clé administrateur ;
- créer une plateforme de test, ajouter une connaissance approuvée et poser une
  question dans son chat ;
- recharger ce chat pour vérifier son historique.

La connexion Socket.IO doit fonctionner sur `/socket.io`, avec les transports
HTTP long-polling et WebSocket. Vérifier dans Plesk/Cybrancee que le proxy et le
certificat autorisent ces connexions ; un dashboard qui s'affiche seul ne prouve
pas que le chat fonctionne.

Si la page d'installation Cybrancee s'affiche encore, vérifier que l'on a configuré
**le bon domaine**, sa racine du document et son application Node.js. Ne pas
supprimer au hasard les fichiers d'un autre site.

## Données existantes et connexion BCA

La base MySQL de production est indépendante de PostgreSQL dans le Preview.
Les plateformes, identifiants, connaissances et conversations déjà créés ici
ne sont pas transférés automatiquement.

Pour commencer sur une base neuve, créer BCA dans le dashboard publié et conserver
son nouveau Client ID/Client Secret. Configurer ensuite ces nouveaux identifiants
dans le backend BCA avec `SABITO_URL` égal à l'adresse HTTPS publique de Sabito.
Ne pas utiliser les identifiants du Preview avec une base de production vide.

Un transfert des données existantes demande une opération séparée, explicite et
contrôlée, avec sauvegarde. Ne pas remplacer la base PostgreSQL du Preview.
L'accès aux données BCA en temps réel reste une intégration distincte.
