# Widget : session membre et déplacement

## Deux connexions différentes

Un canal backend connecté permet au worker de traiter des vérifications.
Il ne crée pas la session du membre dans le navigateur.

Sur BCA, les essais publics POST sans identifiants du 2 novembre 2026 donnent :
- `/api/sabito/session` : 404, page Next.js ;
- `/api/v2/sabito/session` : 404, route Laravel introuvable.

Cela ne prouve pas l'absence d'un autre endpoint privé : si le développeur en utilise
un autre, raccorder son URL ou son adaptateur existant. Ne pas deviner une identité,
un emplacement de JWT ou une route à partir du seul code produit.

## Correction du loader

- Avec seulement `data-project-id` ou `data-product-code`, le script ouvre le mode
  visiteur propre à la plateforme, après les contrôles d'origine.
- `data-session-url` et `window.SabitoWidgetSession` restent prioritaires : un
  identifiant de projet ne peut plus écraser une URL membre explicite.
- Une erreur 404 membre est expliquée. Le visiteur peut choisir explicitement
  « Consulter les guides en visiteur », si la configuration autorise ce site.
- Aucun repli automatique après un refus membre 401/403. Le mode visiteur ne
  donne jamais accès aux données personnelles, aux transactions ou à l'identité membre.

Pour BCA Laravel/JWT, installer ou vérifier le kit `deployment/bca/laravel/README.md` :
`POST /api/v2/sabito/session`, contrôleur, configuration serveur et import de route.
Le frontend membres utilise `deployment/bca/laravel/frontend/sabito-bca.mjs` avec
la fonction d'authentification réellement utilisée par BCA. Aucun secret dans le
script. Les variables serveur existantes suffisent.

Sur le serveur BCA, vérifier :

```sh
php artisan route:list --path=sabito
```

Après installation, reconstruire les caches de configuration/routes selon le
déploiement BCA. Sans JWT valide, la route doit refuser la session, pas délivrer
une identité de membre fictive. Tester ensuite avec un vrai compte autorisé.

## Activer le déplacement

Dans chaque plateforme, section **Widget de cette plateforme** :
1. Cocher **Autoriser le déplacement du widget**.
2. Cliquer **Enregistrer les réglages**.
3. Sur le site, faire glisser le bouton Sabito au doigt ou à la souris.

Une pression courte ouvre toujours le chat. Le déplacement ne déclenche pas
l'ouverture et reste dans l'écran. La position est conservée pendant la page
courante, y compris après fermeture/réouverture du chat. Elle n'est pas enregistrée
comme préférence permanente du membre.

Sur téléphone, le chat ouvert reste plein écran ; le bouton se déplace quand le
chat est fermé. Sur ordinateur, le panneau suit la position du bouton et reste
dans l'écran. Une désactivation remet le widget à sa position fixe.

La configuration est relue toutes les 60 secondes et à chaque chargement de page :
pas besoin de recopier le script pour changer cette option. Vider le cache du
navigateur si l'ancien fichier JavaScript reste chargé.

## Plesk

Déployer la nouvelle release compilée, puis, dans **Run script**, sans préfixe `pnpm run` :

```text
plesk:migrate:status
plesk:migrate:plan
plesk:migrate:apply:reviewed
plesk:migrate:status
```

La migration additive `011_widget_preferences.sql` crée uniquement une table de
préférences du widget. Les migrations antérieures éventuellement en attente doivent
également être relues. Aucun nouveau secret requis. Terminer par **Restart App**.
Ne pas confondre ce déploiement Sabito avec l'installation de la route membre sur BCA.
