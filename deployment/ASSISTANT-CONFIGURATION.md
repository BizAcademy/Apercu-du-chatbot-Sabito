# Configuration de Sabito sans modèle IA

Le moteur renvoie les réponses rédigées par l’administrateur. Il ne fait aucun appel à un LLM et n’assemble pas des extraits pour inventer une réponse.

## Installer cette mise à jour dans Plesk

1. Pousser les sources sur GitHub et attendre le succès du workflow de release.
2. Dans Plesk, récupérer les modifications Git puis cliquer sur **Deploy Now**.
3. Dans **Node.js → Run script**, saisir `plesk:migrate:plan`.
4. Vérifier les migrations en attente. `006_assistant_configuration.sql` ajoute les réglages, les présentations des messages et les accueils ; elle ne supprime aucune donnée existante.
5. Après validation du plan, lancer `plesk:migrate:apply:reviewed`, puis `plesk:migrate:status`. Le résultat attendu est `pending: []`.
6. Cliquer sur **Restart App**. Aucun build ni installation npm n’est nécessaire dans Plesk.

Ne pas préfixer les noms de scripts par `npm run` ou `run` dans la fenêtre **Run script**.

## Réponses et recherche

Dans une plateforme, ouvrir **Configurer l’assistant** :

- **Messages** : accueil membre/visiteur, refus, clôture et messages de vérification.
- **Recherche** : seuil de confiance et groupes de synonymes.
- **Intentions** : déclencheurs, champs demandés dans l’ordre, fonction métier et réponses par résultat.

Une référence contient la réponse à afficher **telle quelle**, avec ses variantes de questions. Les boutons de suggestion viennent de ces questions enregistrées. Si plusieurs réponses différentes sont trop proches, Sabito refuse de choisir arbitrairement et enregistre la question dans la boîte des questions sans réponse.

## Fonctions du backend de chaque plateforme

Les clés générées par Sabito restent dans l’environnement **serveur** de BCA, BuzzBooster ou d’une autre plateforme. Ne jamais les placer dans le script frontend.

Le connecteur serveur `public/integrations/sabito-backend.mjs` accepte les fonctions enregistrées dans son objet `handlers`. Un identifiant configuré dans le dashboard, par exemple `invoice_status`, doit correspondre à une fonction réelle de cet objet. Créer l’intention n’invente pas cette fonction : son implémentation métier reste dans le backend de la plateforme.

Chaque fonction doit vérifier les droits du membre identifié par `job.external_user_id` avant de consulter ses données. Ne jamais rechercher une transaction uniquement par son numéro. Les fonctions doivent être en lecture seule et ne pas exécuter de SQL, d’URL ou de code fourni par un message.

Exemple de **format** de résultat serveur, à remplir uniquement à partir de données réellement vérifiées :

```js
{ status: "ok", data: { numero: numeroVerifie, etat: statutVerifie } }
```

Le modèle administrateur `Facture {numero} : {etat}.` utilise ces valeurs littéralement. Les autres résultats possibles sont `pending`, `not_found`, `error`, ainsi que les statuts compatibles des connecteurs existants. Une vérification échouée ou une variable nécessaire absente entraîne un ticket protégé, pas une réponse inventée.

Pour personnaliser l’accueil, le serveur de la plateforme peut transmettre `external_user_name` lors de l’échange authentifié `/v1/auth/token`. Sinon, enregistrer une fonction de lecture `user_profile` renvoyant `{ status: "ok", data: { nom_utilisateur: nomVerifie } }`. Sans identité vérifiée, l’accueil reste générique. Le navigateur ne peut pas déclarer lui-même une identité membre.

Les installations utilisant une ancienne copie du connecteur doivent récupérer sa nouvelle version une fois pour bénéficier des fonctions configurables. Ajouter ensuite une intention utilisant une fonction déjà enregistrée ne nécessite aucune modification du code de Sabito.

## Capacité vérifiée

Le test automatisé isolé ouvre 500 connexions, crée 500 conversations et vérifie pour chacune son propre accueil et sa propre réponse approuvée. Il contrôle aussi l’enregistrement de 1 000 messages terminés. Il ne charge jamais la base de production. Ce test local n’est pas une garantie de capacité du serveur Cybrancee : celle-ci dépend également des ressources et des limites de l’hébergement.
