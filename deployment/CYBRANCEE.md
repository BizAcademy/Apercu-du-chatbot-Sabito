# Installer Sabito sur Cybrancee / Plesk

Ce paquet contient le dashboard compilé et le serveur Node.js. Il ne contient
aucun secret, aucune base de données et aucune connexion automatique aux données
BCA. Le moteur de réponses utilise les connaissances approuvées, sans appel IA payant.

## Prérequis

- Une offre avec Node.js activable dans Plesk, version **21.7.3** ou supérieure.
- MySQL 8+ ou MariaDB 10.6+, moteur InnoDB et utf8mb4.
- Un domaine HTTPS et le support des connexions Socket.IO / WebSocket.
- L'utilisateur de la base doit pouvoir créer les tables, index et clés étrangères,
  puis lire/écrire/supprimer les données de cette base. Il n'a pas besoin de pouvoir
  créer une nouvelle base ni d'être administrateur du serveur.

Le paquet n'est pas un site statique : le déposer dans `httpdocs` ne suffit pas
à démarrer le chatbot. Si l'option Node.js n'existe pas, vérifier l'offre avec
Cybrancee avant tout achat ou changement.

Le paquet cible Node.js 21.7.3 pour l'hébergement actuel. Cette version n'est plus
maintenue par Node.js : sa compatibilité technique ne fournit pas de correctifs
de sécurité. Une version LTS maintenue reste préférable lorsque l'hébergement
la proposera. Le dashboard est déjà compilé ; Vite, esbuild et pnpm ne sont pas
nécessaires sur Cybrancee.

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

- Version Node.js : **21.7.3** (ou une version LTS plus récente disponible).
- Gestionnaire de paquets : **npm**, pas pnpm pour ce paquet autonome.
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

Si l'installation affiche « all 9 workspace projects » ou bloque le script
esbuild, Plesk utilise encore le dépôt complet. Décompresser le paquet dans un
dossier privé séparé et sélectionner sa racine, sans supprimer le dépôt existant
ni ses secrets. Vérifier que `app.js` est directement dans la racine sélectionnée.

## 3. Variables d'environnement privées

Dans les variables personnalisées Node.js, créer :

| Nom | Valeur |
| --- | --- |
| `MYSQL_HOST` | Hôte MySQL/MariaDB ; `localhost` seulement si l'API et la base sont sur le même serveur |
| `MYSQL_PORT` | Facultatif, port par défaut `3306` |
| `MYSQL_DATABASE` | Nom exact de la base créée dans Plesk |
| `MYSQL_USER` | Nom exact de l'utilisateur de cette base |
| `MYSQL_PASSWORD` | Mot de passe réel de cet utilisateur, sans encodage URL |
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
Le backend utilise uniquement `MYSQL_*`, jamais `DATABASE_URL` ou les anciens
champs `DB_*`. Une configuration partielle est refusée, sans repli PostgreSQL.

Le Preview Replit démarre une base MariaDB locale de test isolée, liée à la boucle
locale et avec des identifiants générés uniquement en mémoire pour cette base.
Il ne réutilise jamais les identifiants MySQL de production. Les valeurs de
production doivent rester dans l'environnement Plesk ou son fichier `.env` privé.
Ne jamais créer de variables `VITE_*` contenant les paramètres MySQL.
Changer les paramètres ne transfère pas les plateformes ou connaissances de
l'ancienne base. Aucune base PostgreSQL n'est supprimée.

Réutiliser les trois clés internes existantes si l'on conserve les mêmes
identifiants de plateforme. Ne jamais publier les valeurs dans un dépôt, une capture
ou le chat. Les variables de Replit ne sont **pas** copiées automatiquement à Cybrancee.

Si les variables personnalisées ne sont pas accessibles, une alternative est un
fichier `.env` privé **à côté de `app.js`, jamais dans `public`**.
Le `.env.example` n'est qu'un modèle : ses valeurs fictives ne doivent pas être utilisées.

## 4. Démarrer et vérifier

Avant de démarrer une nouvelle production, examiner les migrations et leur
historique. Les fichiers sont dans `migrations/mysql/`, triés par numéro.

```sh
npm run migrate:status
npm run migrate:plan
# Après vérification de l'historique, du SQL et de l'impact :
npm run migrate:apply -- --reviewed
```

Sans accès à un terminal, demander à l'opérateur de l'hébergement d'exécuter ces
commandes, ou utiliser un lanceur de commandes/scripts Node.js fourni par Plesk.
Ne pas supposer que le dépôt des fichiers applique les migrations.

La table `schema_migrations` suit les fichiers appliqués ; ils ne sont pas
rejoués. La première migration crée uniquement les tables `sabito_*` manquantes.
Le démarrage en production refuse des migrations en attente au lieu de les
appliquer automatiquement. Les migrations destructives sont bloquées sans
approbation distincte (`--allow-destructive`), après sauvegarde et validation.
Les instructions DDL MySQL ne sont pas transactionnelles : une application
partiellement échouée doit être examinée avant reprise.

Redémarrer ensuite l'application Node.js.

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
