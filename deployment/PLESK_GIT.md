# Sabito : push GitHub → Pull → Deploy Now → Restart

Production : Cybrancee/Plesk, Node.js 21.7.3.
Dépôt de déploiement : `BizAcademy/Apercu-du-chatbot-Sabito`.
Replit sert seulement à développer
et vérifier le projet ; aucun service ou crédit Replit n'est requis au démarrage.

## Ce qui change

Après chaque push sur `main`, GitHub Actions compile le serveur et le dashboard,
embarque leurs dépendances JavaScript et les teste avec Node.js 21.7.3.
Il publie ensuite un ZIP et son SHA-256 dans une GitHub Release.
Les fichiers compilés ne sont pas ajoutés à l'historique du dépôt source.

Dans Plesk, au redémarrage, le lanceur télécharge le paquet qui correspond
exactement aux sources récupérées si cette version n'est pas déjà installée.
Il vérifie le checksum et active une version locale par changement atomique
du lien `current`. Pas de compilation, pas de
`npm install`, pas de pnpm dans Plesk. Une erreur de téléchargement, une version
non prête ou un checksum incorrect laisse la version précédente intacte.

## Configuration initiale, une seule fois

1. Pousser ces modifications dans GitHub. Vérifier que GitHub Actions est autorisé
   dans l'organisation et que le workflow « Sabito - build prêt pour Plesk » passe
   en vert. Il utilise le `GITHUB_TOKEN` automatique du workflow, pas un secret de
   production. Les tests provisionnent une MariaDB locale isolée.
2. Dans Plesk → domaine Sabito → Git, garder le dépôt GitHub et la branche `main`.
   Choisir le déploiement **manuel** et un dossier **privé**, par exemple
   `/sabito-source`. Ne pas déployer le dépôt à la racine publique du site.
   Ne pas supprimer le dossier de l'ancienne installation.
3. Les actions de déploiement supplémentaires sont **facultatives** : le lanceur
   fait le téléchargement au Restart si nécessaire. Si elles sont autorisées,
   on peut préinstaller la version pendant Deploy Now en ajoutant :

   ```sh
   /opt/plesk/node/21/bin/node deployment/deploy-plesk.mjs
   ```

   Exécuter la commande depuis la racine des fichiers déployés.
   Le chemin Node.js ci-dessus est un exemple du chemin standard Plesk Linux :
   vérifier le chemin réel sur l'hébergement et le remplacer si nécessaire.
   Le script nécessite Node.js 21.7.3+ et la commande `unzip`, pas un compilateur.
   Si l'accès SSH est interdit, Plesk peut exécuter les actions Git dans un chroot
   qui n'a pas accès à `/opt/plesk`. Dans ce cas, ne pas ajouter cette action :
   laisser le lanceur Node.js faire le téléchargement au Restart.
4. Pour un dépôt **privé**, copier le modèle
   `deployment/plesk-deploy-config.example.json` vers `.sabito-deploy.json`
   à la racine privée `/sabito-source`, puis renseigner `githubToken` uniquement
   dans ce fichier côté Plesk. Utiliser un jeton GitHub fine-grained limité à ce
   dépôt, permission **Contents: Read-only**, autorisé dans l'organisation.
   La clé SSH servant au clone Git ne donne pas accès à l'API des Releases.
   Limiter les permissions du fichier à **600** (lecture/écriture du propriétaire
   seulement). Ne pas l'envoyer dans GitHub, le chat ou une capture.
   Aucun jeton n'est nécessaire pour un dépôt public.
5. Cliquer **Pull Updates**, puis **Deploy Now**, une fois le workflow terminé.
6. Dans Node.js :
   - Version : **21.7.3** ;
   - Racine de l'application : `/sabito-source` ;
   - Fichier de démarrage : **`app.js`**, déjà dans le dépôt ;
   - Après le premier Restart, racine du document :
     `/sabito-source/.sabito-runtime/current/public` ;
   - Mode : **production** ;
   - conserver les variables privées `MYSQL_*`, `ADMIN_API_KEY`, `JWT_SECRET`,
     `CLIENT_SECRET_PEPPER`, `PUBLIC_URL` et `CORS_ORIGINS` ;
   - ne pas cliquer « NPM Install » : ce mode ne nécessite aucune installation.

Au premier démarrage, cliquer Restart pour télécharger la version compilée.
Si la base n'est pas encore initialisée, le serveur refusera ensuite de démarrer,
mais la version sera disponible pour exécuter les scripts de migration ci-dessous.
Configurer alors la racine du document sur le sous-dossier `public` indiqué.
Ne pas rendre le dépôt source public en attendant ; conserver la racine publique
de l'ancienne installation jusqu'à cette configuration.

Les variables Plesk ne sont pas copiées depuis Replit. Si l'on utilise un fichier
`.env`, il reste à la racine privée `/sabito-source`, jamais dans `public`.
Le lanceur transmet son emplacement au paquet compilé.

### Première initialisation de la base

Les migrations ne sont pas exécutées automatiquement par Deploy Now ou Restart.
Dans le lanceur de scripts Node.js de Plesk, utiliser les scripts du dépôt :

1. `plesk:migrate:status` : consulter l'historique et les fichiers en attente ;
2. `plesk:migrate:plan` : lire le SQL et vérifier l'impact ;
3. après validation, `plesk:migrate:apply:reviewed` : appliquer les migrations
   approuvées. Ce bouton constitue l'action explicite de validation.

Ces scripts n'ont pas besoin de `npm install` ; ils lancent le migrateur compilé.
La première migration ne crée que les tables manquantes. Aucun changement
destructif n'est autorisé par ce script. Sauvegarder la base existante avant de
valider une évolution du schéma.

Cliquer ensuite **Restart** et ouvrir le domaine HTTPS. Le dashboard et le chat
utilisent la base MariaDB configurée dans Plesk, pas la base de test du Preview.

## Pour les mises à jour suivantes

1. Push sur `main`.
2. Attendre le workflow GitHub Actions en vert.
3. Plesk : **Pull Updates → Deploy Now → Restart**.

Pas de build ni d'installation de dépendances sur Plesk. Si la mise à jour
introduit une nouvelle migration, sa validation reste nécessaire avant Restart.
Un schéma non préparé bloque le démarrage plutôt que de modifier silencieusement
les données de production.

## Diagnostic

- `RELEASE_NOT_READY_OR_ACCESS_DENIED` : attendre le workflow, ou vérifier l'accès
  au dépôt privé. Ne pas redémarrer sur une version qui n'a pas été déployée.
- `PRIVATE_CONFIG_PERMISSIONS_REQUIRED` : régler `.sabito-deploy.json` sur 600.
- `UNZIP_FAILED` : vérifier que `unzip` est disponible et que le paquet est valide.
- `RELEASE_DOES_NOT_MATCH_SOURCE` : le ZIP ne correspond pas au code déployé ;
  ne pas contourner ce contrôle.
- `DEPLOYMENT_ALREADY_RUNNING` : attendre l'autre opération. Si un processus a
  été interrompu brutalement, vérifier qu'aucun déploiement ne tourne avant de
  retirer manuellement le seul fichier `.sabito-runtime/.deploy.lock`.
- « all 9 workspace projects » : une installation du monorepo a été lancée ;
  elle n'est pas nécessaire dans ce mode.

Les anciennes versions compilées sont conservées dans `.sabito-runtime/versions`.
Ce mécanisme ne restaure pas la base de données. Ne pas supprimer une version
pendant qu'un processus ou un worker l'utilise.

Référence : documentation Plesk « Using remote Git hosting », notamment les
actions de déploiement supplémentaires exécutées depuis le dossier déployé.
