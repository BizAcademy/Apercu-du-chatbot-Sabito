# Widget hébergé par Sabito

Chaque plateforme du dashboard possède une section **Widget de cette plateforme**.
Le script y est généré automatiquement à partir de son identifiant et du nom de
l'assistant. Il reste disponible après rechargement et ne contient aucun secret.

1. Créer une plateforme, ou en sélectionner une existante.
2. Ajouter ses origines HTTPS exactes, par exemple `https://exemple.com`.
   Ajouter `https://www.exemple.com` séparément si le site l'utilise.
3. Enregistrer les domaines, puis copier le script.
4. Coller le script dans le frontend de ce site, avant `</body>`.

Le chargement du bouton, le chat, les sessions visiteurs et les réponses restent
dans Sabito. Aucun endpoint du backend de la plateforme n'est nécessaire pour ce
mode. Le visiteur est anonyme ; son jeton et sa conversation restent en mémoire,
et un rechargement crée une nouvelle session. Les renouvellements conservent
l'identité de cette session. Aucune identité membre fournie par le navigateur
n'est acceptée.

Les références de la plateforme sont accessibles au widget visiteur : ne pas y
mettre d'informations confidentielles. Les contrôles de domaine protègent
l'intégration dans les navigateurs, mais Origin peut être imité par un client
non-navigateur. Ils ne constituent pas une authentification pour des données
privées. Les identifiants serveur existants restent nécessaires pour une future
connexion aux comptes et transactions privées.

## Mise à jour de Plesk

Configurer aussi `PUBLIC_URL` dans les variables de l'application Node.js Plesk
avec l'origine HTTPS exacte de Sabito, sans chemin ni `/` final, par exemple
`https://sabito.bizconnectacademy.com`. Cette valeur est publique, pas une clé :
elle autorise les connexions du chat depuis l'iframe hébergée par Sabito.
Les domaines des sites qui intègrent le widget restent à configurer séparément
dans le dashboard de chaque plateforme.

Le chat démarre en HTTP polling et peut ensuite passer en WebSocket si le proxy
l'autorise. Il n'est pas nécessaire d'activer WebSocket dans Plesk pour envoyer
des messages via polling. Un refus d'origine reste bloquant pour les deux
transports : ne pas le contourner en autorisant tous les domaines.

Cette version ajoute uniquement la table de configuration du widget dans
`002_widget_settings.sql`. Elle ne supprime ni ne modifie les données existantes.
Après installation de la nouvelle release compilée :

1. Exécuter `plesk:migrate:status` depuis le dossier source du dépôt.
2. Relire le plan avec `plesk:migrate:plan`.
3. Appliquer cette migration additive avec `plesk:migrate:apply:reviewed`.
4. Redémarrer l'application, puis utiliser le dashboard en ligne pour copier
   un script portant l'adresse de production de Sabito, et non celle du Preview.

Depuis le dossier runtime, l'équivalent est `node migrate.js --apply --reviewed`.
Aucun nouveau build dans Plesk n'est nécessaire.
