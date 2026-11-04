# Contrat de lecture BCA — sources fournies

## Périmètre et diagnostic

Analyse du backend Laravel transmis dans l’archive BCA, et du code Sabito. Aucun accès à une base ou à un compte de production. Le frontend BCA n’est pas fourni. L’archive ne contient pas les migrations métier : les modèles et leurs requêtes sont confirmés dans le code, pas le schéma physique installé chez l’hébergeur.

Le worker est `app/Console/Commands/SabitoJobsWork.php`. Il annonce 18 opérations du service `app/Services/Sabito/SabitoReadOnlyJobService.php`. Un voyant vert prouve seulement un poll récent. Les anciennes données collectées côté Sabito n’étaient pas reconnues par plusieurs méthodes BCA : une intention détectée pouvait donc aboutir à une erreur de consultation.

Autres décalages corrigés :
- `code_parrainage` ne correspondait pas à `{code_parrain}` ;
- l’activation ignorait la référence collectée et consultait seulement l’état général ;
- l’ambiguïté des transactions était comptée avec un agrégat non borné ;
- les logs d’accès BCA contenaient des identifiants et du contexte de requête ;
- une référence introuvable ne créait pas de ticket BCA et une correction réussie ne clôturait pas ce ticket ;
- des résultats vides pouvaient être présentés à partir du seul statut ;
- les boutons publics ne devaient pas interrompre les vérifications financières.

## Parcours confirmé dans le code

Frontend séparé → `POST /api/v2/sabito/session` BCA → `POST /v1/auth/token` Sabito → widget et Socket.IO → intention et confirmation → collecte brute des champs → `POST /v1/backend/jobs/poll` par le worker serveur → handler Eloquent autorisé → `POST /v1/backend/jobs/:jobId/result` → validation et template Sabito.

Les autres endpoints `/api/sabito/data/*` présents dans BCA ne sont pas les handlers du pont de jobs. Ne pas confondre les deux protocoles.

## Contrats explicites des 18 opérations

Les noms de champs publics Sabito restent inchangés. Le nouveau `SabitoJobContract` adapte chaque champ à **un critère documenté**, sans déduire une référence depuis son format. Les anciens clients serveur sont conservés uniquement avec un contrat alternatif explicite, jamais en mélangeant plusieurs critères.

| Opération | Champ Sabito et valeur attendue | Source BCA et appartenance |
|---|---|---|
| account_activation | transaction_id = référence exacte du paiement | Transaction, `reference`, type activation, `user_id` |
| deposit_status | deposit_number = référence exacte, pas téléphone | Transaction, `reference`, type deposit hors remboursement crypto, `user_id` |
| withdrawal_status | withdrawal_number = référence exacte, pas téléphone | Transaction, `reference`, type withdrawal hors transfert BCA, `user_id` |
| transfer_status | transfer_reference = référence exacte | Transaction, `reference`, méthode bca_transfer, `user_id` |
| wallet_swap_status | swap_reference = public_id exact | WalletSwap, `public_id`, `user_id` ; pas de déduction vers idempotency_key |
| wallet_balance | aucun | UserBalance, `user_id` |
| referral_code | aucun | User, clé vérifiée, `sponsor_code` |
| referral_commission_status | commission_reference = identifiant numérique de commission | AffiliateCommission, `id`, `sponsor_id` |
| leader_reward_status | reward_period = AAAA-MM-01 | MonthlyTopLeaderReward, `period_start`, `user_id` ; crédit lié vérifié aussi |
| formation_payment_status | payment_reference = référence exacte | Transaction, `reference`, type formation, `user_id` |
| digital_purchase_status | purchase_reference = identifiant numérique de transaction associée | ProductPurchase, `transaction_id`, `buyer_id` |
| digital_sale_status | sale_reference = identifiant numérique de transaction associée | ProductPurchase, `transaction_id`, `seller_id` |
| digital_subscription_status | subscription_reference = identifiant numérique de transaction associée | DigitalStoreSubscription, `transaction_id`, `user_id` |
| digital_store_fee_status | fee_reference = référence exacte | Transaction, `reference`, type digital_store_fee seulement, `user_id` |
| refund_status | purchase_reference = identifiant numérique de transaction associée à l’achat | ProductPurchase propriétaire → Transaction remboursement déjà enregistré, `user_id` |
| ads_campaign_status | campaign_reference = identifiant numérique de campagne | BcaAdsCampaign, `id`, `advertiser_id` |
| ads_payout_status | publication_reference = identifiant numérique de journée | BcaAdsPublicationDay, `id`, `publisher_id`, puis Transaction crédit existant |
| wallet_movement_status | transaction_id = référence exacte du mouvement, pas clé numérique supposée | Transaction, `reference`, `user_id`, hors écritures système exclues |

Tables employées par les modèles : `users`, `transactions`, `user_balances`, `wallet_swaps`, `affiliate_commissions`, `monthly_top_leader_rewards`, `product_purchases`, `digital_products`, `digital_store_subscriptions`, `bca_ads_campaigns`, `bca_ads_publication_days`. Ces noms proviennent des modèles/conventions Eloquent et des requêtes ; leur présence réelle en production n’est pas certifiée.

## Opérations absentes de l’allowlist du backend fourni

`deposit_fee_status`, `withdrawal_refund_status`, `transfer_fee_status`, `digital_store_fee_refund_status`, `ads_refund_status`, `admin_adjustment_status` : aucune annonce par ce worker. Sabito refuse explicitement de créer un job pour une capacité BCA non annoncée et ouvre un ticket. Il ne transforme pas ces opérations en une autre opération au nom ressemblant.

`activity_reward_status` reste désactivée. Ne pas annoncer ces sept capacités pour rendre artificiellement le voyant vert.

## Connaissances, recherche et administration

Huit nouvelles propositions issues des sources du backend sont installées une seule fois en statut `pending`, via les tables et la validation existantes. Leur provenance est visible dans les références à valider. L’installation ne remplace aucune référence existante et ne rétablit pas une proposition supprimée. Les tarifs dynamiques et les liens/pages frontend inconnus ne sont pas inventés.

Le moteur existant reste déterministe : normalisation Unicode, abréviations/corrections administrables, Damerau-Levenshtein, phonétique française, trigrammes, BM25, protection des nombres et négations. Les seuils et dictionnaires sont déjà dans l’administration ; les variantes issues des clics/avis restent candidates jusqu’à approbation. Aucun deuxième moteur ni fournisseur d’IA ajouté.

32 formulations BCA indépendantes sont évaluées dans `bca-retrieval.test.ts`, avec orientation, réponses directes, confirmations et faux positifs séparés. Les documents sont approuvés **uniquement dans ces fixtures de test**, jamais dans les plateformes réelles.

Les réponses finales publiques fiables utilisent la clôture exacte demandée. Deux ou trois boutons sont proposés seulement si au moins deux questions pertinentes existent ; aucune question inventée pour compléter le nombre. Les vérifications financières et les collectes gardent leur continuité sans clôture ni boutons de changement de sujet.

## Livraison et application manuelle

Deux projets, deux correctifs. **Pousser seulement Sabito ne met pas à jour BCA.**

1. Sabito : utiliser le correctif Sabito et la commande de push fournis dans la livraison. Attendre que le workflow GitHub soit vert.
2. BCA : transmettre `deployment/bca/backend-contract.patch` au développeur. Depuis sa copie propre du backend correspondant à l’archive :

   ```bash
   git status --short
   git apply --check /chemin/backend-contract.patch
   git apply /chemin/backend-contract.patch
   composer dump-autoload --optimize
   APP_ENV=testing vendor/bin/phpunit --filter SabitoIntegrationTest
   git diff --check
   git add app/Services/Sabito/SabitoJobContract.php app/Services/Sabito/SabitoReadOnlyJobService.php app/Services/Sabito/SabitoSecurityService.php app/Console/Commands/SabitoJobsWork.php tests/Feature/SabitoIntegrationTest.php tests/Feature/SabitoReadContractCases.php
   git commit -m "Aligner les consultations BCA sur le contrat Sabito"
   git push
   ```

   Si la vérification du patch échoue, ne pas forcer : faire adapter les modifications aux changements intervenus depuis l’archive. Les tests nécessitent les dépendances Composer et une base SQLite de test jetable, pas la production.
3. Le propriétaire effectue lui-même Pull now, Deploy now et Restart now dans Cybrancy pour Sabito, et le déploiement manuel habituel pour BCA.
4. Régénérer l’autoload Composer après installation des nouveaux fichiers BCA, puis redémarrer aussi le processus long du worker `sabito:jobs:work` selon le gestionnaire déjà utilisé ; un worker ancien garde l’ancien code.
5. Examiner les intentions personnalisées dans l’administration : les déclencheurs, suppressions et réponses ne sont pas écrasés. Seuls les anciens prompts standard identiques sont ajustés pour préciser les critères exacts.
6. Valider seulement les propositions de connaissances dont le contenu a été vérifié par le propriétaire.

**Aucune migration ni requête SQL nécessaire.** Aucun secret supplémentaire requis. Aucun accès production utilisé. Les migrations métier BCA absentes de l’archive ne sont pas recréées.

## Vérification et limites

- PHPUnit : vrais handlers Eloquent sur SQLite jetable, fixtures propriétaires, 18 opérations, refus de membre inconnu, expiration, références introuvables/invalides, absence d’écriture pendant les handlers et erreur de requête. Ce n’est pas une lecture des données réelles BCA.
- Sabito : vrais handlers HTTP/Socket.IO et MariaDB isolée, worker BCA **simulé**, contrats, tickets et reprise, visiteurs, résultats invalides/refusés, capacité absente et timeout réel. La charge 500 conversations couvre les réponses publiques Sabito, pas 500 lectures Laravel ni les ressources Plesk.
- Pas de vérification d’un compte réel, de production, d’un navigateur BCA connecté, du frontend absent, ni du schéma physique BCA hébergé.
- Les tests du compte-rendu final donnent les valeurs effectivement mesurées ; aucune garantie universelle de compréhension ou de sécurité.
