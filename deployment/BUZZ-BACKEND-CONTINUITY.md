# Continuité après une vérification Buzz Booster

## Cause et correction

Le parcours générique effaçait `collected_json` à la fin d'une vérification.
L'exception de suivi des commandes ne conservait que leurs numéros et une
empreinte de réponse, pas le résultat structuré. Le contexte public refusait,
correctement, de prendre un résultat financier pour une référence approuvée.
Une relance sur le dépôt n'avait donc ni champs réutilisables ni résultat à
expliquer, et retombait dans la recherche générale.

La correction étend **la session d'intention existante**, avec une colonne
`backend_context_json`. Il n'y a pas de second moteur, ni nouvel appel direct
vers une route financière de Buzz Booster.

Ce contexte contient l'identité propriétaire, le sujet/les opérations, les
champs réellement envoyés au connecteur, les derniers résultats avec date,
les étapes observé/indisponible et une éventuelle clarification. Il reste
limité à la conversation du membre et de la plateforme, pendant ses 24 heures.
Il n'utilise pas les références retournées pour remplacer les champs d'entrée.

- Une explication reprend le résultat daté et annonce l'absence de nouvelle lecture.
- Une relance explicite effectue une nouvelle lecture via le worker authentifié.
- Une panne ou un refus ne devient pas un succès, et un ancien résultat n'est
  jamais présenté comme la réponse de la nouvelle consultation.
- « Et mon bonus ? » réutilise les identifiants du dépôt pour `deposit_bonus_status`.
- « Et mon remboursement ? » réutilise `order_number` pour `order_refund_status`.
- Plusieurs références nécessitent une clarification ; la dernière n'est pas
  sélectionnée automatiquement.
- Une nouvelle information après un résultat introuvable retourne dans le
  collecteur de champs existant.
- Un changement explicite de sujet désactive le contexte financier actif.
- Les parcours catalogue restent leurs propres parcours existants : un résultat
  de catalogue ne devient pas une preuve de transaction.

Les secrets et les contrôles d'accès existants restent inchangés.

## Installation externe Plesk — à faire par l'exploitant

Aucune production n'a été modifiée pour développer ou tester cette correction.

1. Pousser le code et attendre la réussite du workflow de release.
2. Plesk : Pull Updates puis Deploy Now.
3. Sauvegarder la base avant toute évolution du schéma.
4. Examiner le plan : `pnpm run plesk:migrate:plan`.
5. La migration `012_backend_conversation_context.sql` ajoute seulement une
   colonne nullable à la table de sessions existante. Le garde conservateur
   classe tout `ALTER` comme nécessitant une approbation supplémentaire.
6. Après examen de **toutes** les migrations en attente et accord explicite :
   `pnpm run plesk:migrate:apply:reviewed --allow-destructive`.
   Malgré le nom de l'option, cette migration précise ne supprime aucune donnée.
   Ne pas autoriser aveuglément d'autres migrations présentes dans le plan.
7. Vérifier `pnpm run plesk:migrate:status`, puis Restart App.

Dans « Run Node.js commands », le gestionnaire est déjà préfixé :
- gestionnaire **pnpm** : saisir `run plesk:migrate:plan`, puis, après examen,
  `run plesk:migrate:apply:reviewed --allow-destructive` ;
- gestionnaire **npm** : saisir `run plesk:migrate:plan`, puis, après examen,
  `run plesk:migrate:apply:reviewed -- --allow-destructive`.

Ne pas appliquer cette migration directement en production depuis Replit.
Les conversations déjà terminées avant cette correction n'ont pas de résultat
structuré récupérable : effectuer une nouvelle vérification pour amorcer leur
contexte, sans inventer d'observation à partir du texte historique.

## Procédure à examiner puis approuver dans Sabito

Cette proposition **n'est pas installée comme référence approuvée**.
L'administrateur doit l'examiner, l'adapter si nécessaire, puis l'ajouter par
l'écran habituel Questions / Réponses de la plateforme Buzz Booster.

Titre exact utilisé pour les explications transactionnelles Mobile Money :

**Buzz Booster — Autoriser et vérifier un paiement Mobile Money**

Contenu proposé :

> Pour autoriser un paiement Mobile Money, validez la notification reçue sur
> votre téléphone. Selon l'opérateur et le parcours, poursuivez dans
> l'application ou sur la page de paiement proposée. Un paiement Wave peut vous
> rediriger vers Wave pour confirmation.
>
> Buzz Booster vérifie ensuite automatiquement le statut. Lorsque l'attente
> automatique est écoulée, l'écran d'attente du dépôt peut proposer « Vérifier
> mon statut ». Utilisez ce bouton s'il est affiché ; il n'existe pas pour tous
> les paiements ni sur toutes les pages.
>
> L'autorisation auprès de l'opérateur, la confirmation du prestataire, le crédit
> du portefeuille et un éventuel bonus sont des étapes distinctes. Sabito ne
> peut pas forcer leur exécution. N'effectuez pas un deuxième paiement pour
> masquer un problème. Ces instructions ne s'appliquent pas aux cryptomonnaies.
> Ne communiquez jamais de mot de passe, de PIN ou d'OTP de paiement.

Sans cette référence approuvée et sans méthode Mobile Money identifiée par le
résultat ou les champs déjà fournis, Sabito explique seulement les distinctions
et signale qu'il manque une procédure adaptée. Un message utilisateur ne peut
pas approuver ou remplacer ce contenu.

## Limites et contrat à transmettre à Buzz Booster si nécessaire

Les opérations annoncées `deposit_status`, `order_status`,
`order_refund_status`, `deposit_bonus_status`, `referral_code`,
`referral_reward_status`, `referee_bonus_status`, `wallet_balance`,
`wallet_movement_status`, `admin_adjustment_status`, `service_catalog` et
`service_recommendations` restent en lecture seule. Aucune modification Buzz
Booster n'est nécessaire pour les relances sur ces lectures déjà installées.

La route `GET /api/payments/status/:orderId` **n'est pas une lecture pure** :
elle peut consulter le prestataire, mettre à jour le paiement et créditer le
portefeuille. Elle ne doit pas devenir un outil Sabito en lecture seule.
Sa session requise est celle du propriétaire dans Buzz Booster, pas celle de
Sabito. Aucun appel à cette route n'a été ajouté.

Si le propriétaire souhaite un jour déclencher cette actualisation depuis le
chat, transmettre séparément ce contrat à l'agent Buzz Booster :

> Concevoir une opération distincte, explicitement déclarée comme pouvant
> modifier l'état financier. Exiger la session Buzz Booster du propriétaire,
> l'autorisation de l'opération et un consentement spécifique au paiement visé.
> Résoudre le paiement dans le périmètre du membre sans confondre numéro de
> commande SMM et identifiant de paiement. Protéger contre les répétitions,
> les crédits doubles et les appels concurrents avec les garanties métier
> existantes ; conserver une trace d'audit. Ne pas accepter un utilisateur ou un
> montant choisis par le navigateur. Définir les erreurs, les délais et la
> distinction entre prestataire confirmé et crédit effectivement enregistré.
> Ne rien activer tant que le contrat, le consentement et les contrôles n'ont
> pas été approuvés dans les deux applications. Ne pas contourner
> l'authentification de la route existante.

Il ne s'agit pas d'une nouvelle capacité disponible. Aucun handler de mutation
ni de confirmation forcée n'est simulé.

## Vérification

Les régressions déterministes couvrent l'explication d'un dépôt en attente,
la reprise d'une phrase, les champs exacts dépôt/bonus, commande/remboursement,
la relecture, la clarification, le changement de sujet et l'isolation temporelle.
Les tests MySQL/Socket.IO isolés vérifient l'exécution réelle des jobs du pont,
la priorité du contexte dans le chemin conversationnel et le contrôle membre.
Ils ne constituent pas un test avec un vrai compte sur le déploiement Cybrancee.
