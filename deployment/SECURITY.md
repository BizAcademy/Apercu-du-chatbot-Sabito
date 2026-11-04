# Sécurité Sabito — déploiement et limites

Les protections sont dans les sources ; elles ne seront actives en production
qu'après le push GitHub et le déploiement manuel Cybrancy par le propriétaire.
Aucune migration SQL n'est nécessaire pour ces changements.

## Protections et contrôles

- Dépendances actualisées et verrouillées ; Zod utilise sa version corrigée.
- La dépendance indirecte du dernier `@tailwindcss/typography` compatible impose
  encore un parseur vulnérable : une surcharge ciblée force son correctif 6.x.
- Les JSON et formulaires refusent la compression entrante ; les tailles,
  paramètres et profondeurs des formulaires sont limités.
- Les erreurs HTTP ne retournent pas d'exception interne ou de stack.
- CSP sans scripts inline ni eval, nosniff, politique de référent et restrictions
  des fonctions du navigateur. Les polices Google existantes restent autorisées.
- Le dashboard refuse son intégration dans une iframe ; seul le document widget
  autorise les parents exacts validés par la configuration BCA / Buzz Booster.
- HSTS d'un an sur les requêtes HTTPS, sans preload ni includeSubDomains.
- Les réponses authentifiées ne doivent pas être mises en cache.
- Les source maps frontend restent désactivées.
- Les contrôles CI auditent les dépendances et testent les protections avant build.

L'alerte SQL sur l'appel `DatabaseConnection.query` a été revue : ce n'est pas
l'API mysql2 brute. Le wrapper prépare les requêtes avec `execute(sql, values)`.
Un test vérifie qu'une valeur contenant du SQL reste liée séparément. Une
annotation ciblée documente cette fausse alerte, sans désactiver les autres règles.

## Actions manuelles hors du code

1. Le dépôt GitHub est public. Si la confidentialité du code est souhaitée,
   le propriétaire doit décider de le rendre privé. Avant cela, vérifier l'accès
   du déploiement et des releases privées ; ne pas communiquer les identifiants
   dans les sources. Rendre privé ne retire pas les copies déjà téléchargées.
2. Si un secret a déjà été publié, le retirer du code ne suffit pas : le révoquer,
   le remplacer par le mécanisme sécurisé de l'hébergeur et examiner l'historique.
   Aucun secret n'a été révoqué ou régénéré automatiquement ici.
3. Cybrancy doit terminer le HTTPS et transmettre correctement le protocole au
   serveur Node. Vérifier HSTS sur la réponse HTTPS après déploiement. Ne pas
   ajouter aveuglément un second jeu d'en-têtes CSP au proxy.
4. Le CORS et la validation de session du backend BCA séparé restent à contrôler
   dans son propre dépôt. Les modifier nécessite ses vraies sources.
5. Ne jamais rendre publics `.env`, les sauvegardes SQL, `.git`, les logs ou le
   dossier de release serveur. Seul le dossier frontend compilé doit être servi
   comme contenu statique.

## Vérifications après déploiement manuel

- `curl -I https://sabito.bizconnectacademy.com/` : CSP, nosniff, HSTS et
  Referrer-Policy présents ; ne pas exposer de cookie dans un rapport.
- Ouvrir l'administration normalement et le chat depuis une origine BCA autorisée.
  Le document widget doit conserver sa CSP `frame-ancestors` autorisée et ne pas
  recevoir un `X-Frame-Options: DENY` ajouté par le proxy.
- Sans authentification, `/v1/admin/projects` doit refuser l'accès.
- `.env`, `.git/HEAD` et les source maps frontend ne doivent pas être accessibles.
- Confirmer le bon fonctionnement d'une session membre sur environnement de test.

Un audit sans alerte n'est pas une preuve d'invulnérabilité. Ces contrôles ne
remplacent pas une revue des permissions métier, une surveillance et des mises
à jour régulières. Aucun test offensif n'est exécuté contre les données réelles.
