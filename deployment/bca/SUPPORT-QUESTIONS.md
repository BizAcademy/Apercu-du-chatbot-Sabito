# Les 28 nouvelles questions BCA

## Deux installations distinctes

Sabito et BCA sont deux applications séparées. Pousser Sabito ne modifie pas le backend BCA.

### Sabito

Les nouvelles références publiques, variantes et intentions sont installées une seule fois au chargement BCA. Les références personnalisées, brouillons, suppressions et intentions désactivées restent préservés.

Quatre opérations de lecture sont ajoutées :

| Opération | Entrée | Périmètre |
|---|---|---|
| `digital_product_review` | `product_reference` : identifiant numérique exact | Produit dont `user_id` est le membre authentifié ; statut et motif de rejet enregistrés |
| `referral_commissions_recent` | aucun champ | Au plus cinq commissions récentes dont `sponsor_id` est le membre ; aucun total par niveau |
| `ads_publisher_status` | aucun champ | Profil diffuseur du membre, validation du test et paramètre global réellement enregistré |
| `bca_catalogue_current` | aucun champ | Au plus cinq titres actifs par catalogue ; Digital Store uniquement approuvé |

Toutes nécessitent la session membre vérifiée et la confirmation existante de Sabito. Les visiteurs reçoivent une orientation publique ou une invitation à se connecter, jamais un résultat privé.

### Backend Laravel BCA — à transmettre au développeur

1. Si le précédent `backend-contract.patch` a déjà été installé : appliquer **seulement** `deployment/bca/support-questions.patch`.
2. Sinon, sur une version correspondant à l’archive fournie : appliquer **seulement** `deployment/bca/backend-contract.patch`, qui inclut les corrections précédentes et les nouveaux handlers.
3. Ne jamais appliquer les deux correctifs l’un après l’autre. Commencer par `git apply --check`. Si la vérification échoue, adapter le correctif à la branche actuelle, sans forcer.
4. Régénérer l’autoload : `composer dump-autoload --optimize`.
5. Sur une base SQLite de test jetable, exécuter `APP_ENV=testing DB_CONNECTION=sqlite DB_DATABASE=:memory: vendor/bin/phpunit --filter SabitoIntegrationTest`. Aucun test sur la production.
6. Le propriétaire pousse et déploie manuellement BCA selon sa procédure habituelle. Redémarrer aussi le processus long `sabito:jobs:work` pour qu’il annonce les nouvelles opérations.
7. Le propriétaire déploie Sabito par Pull now, Deploy now et Restart now dans Cybrancy.

Les nouvelles classes sont également disponibles sous `deployment/bca/laravel/app/Services/Sabito` et `deployment/bca/laravel/tests/Feature`. Le correctif contient leur installation avec les modifications nécessaires aux fichiers existants.

**Aucune migration ni requête SQL nécessaire.** Les lectures utilisent les modèles et colonnes des sources BCA fournies. Un schéma en ligne différent nécessite une adaptation documentée du développeur, pas une création de tables improvisée. Aucun secret supplémentaire n’est demandé.

## Limites et réponses honnêtes

- L’archive fournie n’est pas une preuve de la version ou de la configuration actuellement déployée.
- Le propriétaire a confirmé 0,60 F par vue validée. Le guide et une valeur par défaut du code archivé ne sont pas cohérents entre eux. Aucune réponse ne remplace ce tarif par 1,80 ; le handler affiche le paramètre réellement enregistré, ou indique son absence, sans valeur de secours.
- La validation du test ne prouve pas qu’une campagne payante est disponible. La disponibilité et le ciblage doivent être vérifiés dans l’espace diffuseur ; une campagne terminée ne doit pas être proposée comme acceptée.
- L’emplacement exact du menu frontend n’est pas confirmé par les seules sources backend. L’assistant demande les libellés visibles si BCA Ads n’apparaît pas ; il ne donne pas une route API comme page membre.
- Le catalogue renvoyé est un aperçu limité, pas une garantie d’accès gratuit ni de format autorisé à la vente.
- Un statut de produit en attente n’a pas de délai inventé. Un rejet sans motif crée un ticket Sabito. Une absence, un refus, une erreur ou une opération non annoncée par le worker ne sont jamais transformés en paiement ou validation réussie.
- Les cinq commissions récentes ne constituent pas le total des commissions par niveau. Une commission attendue peut ne pas figurer dans cet extrait. Une consultation vide ouvre le suivi existant ; pour une commission précise absente de la liste, le support officiel est proposé.
- Les tickets Sabito sont des suivis locaux ; ils ne signifient pas qu’un humain BCA a déjà reçu ou traité une demande externe.
- Les liens Google Drive et les produits gratuits Chariow/Maketou reprennent les règles du propriétaire. Aucun lien privé de livraison n’est lu ou exposé par les nouveaux handlers.

## Vérification

Les tests Sabito utilisent une base MariaDB isolée et un worker simulé. Les tests PHP utilisent les vrais handlers de l’archive avec des fixtures SQLite jetables, pas les comptes réels BCA. Le compte-rendu livré donne les commandes et les résultats effectivement obtenus.
