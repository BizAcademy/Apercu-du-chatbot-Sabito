# Buzz Booster — couverture du corpus de 97 questions

## Origine et limites

Le propriétaire a fourni une analyse regroupée de 97 lignes représentant 116 occurrences,
avec des règles qu’il indique provenir du code Buzz Booster. Le dépôt Buzz Booster
n’a pas été consulté depuis Sabito. Le CSV original n’a pas été joint à cette demande.
Q1 à Q97 sont donc des positions annoncées, et non des identifiants réels.
Les formulations de références et liens privés n’ont pas été reconstituées.

Les 32 groupes sont proposés dans le système existant, avec leurs réponses, catégories,
sources, mots-clés et 5 à 10 variantes. Aucune IA, aucun LLM, aucun nouveau moteur parallèle.
Les propositions restent `pending`, hors de l’index public, jusqu’à l’approbation admin.
Un marqueur transactionnel empêche de les dupliquer ou de restaurer un brouillon supprimé.
Les documents existants portant exactement le même titre sont préservés.
Les réponses déjà approuvées ne sont jamais remplacées par cette installation.
Les questions originales, statuts et fréquences ne sont ni résolus, ni archivés, ni supprimés.

## Validation administrateur

Dans Buzz Booster, ouvrir la section de validation des connaissances :
1. Examiner la source « Analyse du corpus de 97 questions ».
2. Vérifier la réponse et ses variantes ; ajuster les règles si la configuration a changé.
3. Pour les propositions de clarification, conserver la question de clarification sur
   la première ligne : les gardes conversationnels utilisent cette ligne approuvée.
4. Valider ou refuser chaque proposition. Aucun bouton ne les valide toutes automatiquement.
5. Réconcilier les formulations avec les références déjà approuvées avant publication.

Les clarifications nouvelles ne sont pas servies depuis un brouillon :
en attendant leur validation, Sabito conserve son message de non-réponse configuré.
Les collecteurs existants, l’état réel de la session, le contexte propriétaire et
le consentement ont priorité sur les clarifications générales.

## Changements de comportement

- Une référence seule n’est plus automatiquement classée comme dépôt d’après son format.
  Si un champ était attendu, la valeur originale reste utilisable dans ce champ.
- Les références et URL seules ne sont plus ajoutées à la boîte des questions générales
  sans réponse. Elles restent dans l’historique privé de la conversation.
- « Dépôt recue », BCA/Buzz Booster, annuler sans objet et les demandes incomplètes
  peuvent être clarifiés grâce aux propositions approuvées.
- « Salut boss » et « cv » sont reconnus comme messages sociaux ; un remerciement
  n’est pas un consentement financier. La clôture existante est conservée.
- « Pourquoi » et « comment faire alors » peuvent reprendre la dernière réponse
  publique réellement approuvée, sans réutiliser un résultat privé comme FAQ.
- WhatsApp distingue vues de statuts et chaînes avant consultation ; les critères
  de recherche conservent ce sous-type. Les offres sans correspondance explicite
  ne sont pas présentées comme confirmation d’un service recherché.
- La recherche pour une page Facebook transmet le critère page et ne valide pas
  une offre décrite comme profil.
- Congo-Kinshasa et Congo-Brazzaville sont distingués sans inventer de disponibilité.
- Les 12 opérations existantes sont inchangées. Aucune action financière ajoutée.

## Méthode de vérification

La correspondance Q1–Q97 est une vérification de couverture du document fourni,
pas un test des 97 lignes originales : leurs textes exacts et identifiants ne sont
pas tous présents. Les 164 variantes fournies ou complétées sont des exemples
de référence, pas un échantillon indépendant.

Les contrôles supplémentaires sont 32 perturbations déterministes de titres,
distinctes des variantes. Ils mesurent la robustesse à ces perturbations seulement.
Le rattachement correct et le besoin de clarification sont comptés séparément.
Un score de recherche n’est pas une probabilité.
Les propositions sont simulées comme approuvées uniquement en mémoire pour ces tests.
Aucun de ces scénarios n’est présenté comme une vérification réelle de production.

Les tests d’intégration utilisent MariaDB isolée, les routes administrateur, les
gardes propriétaire et les véritables collecteurs/connecteurs Sabito. Les réponses
du backend Buzz Booster y sont simulées par le contrat de tests, pas lues en production.

## Capacités manquantes — demande à transmettre à l’agent Buzz Booster

Merci de confirmer et documenter les propositions suivantes, sans les activer dans
Sabito ni changer les 12 opérations existantes sans accord :

### 1. Disponibilité des pays et opérateurs

Opération proposée `payment_options`, strictement en lecture seule.
Entrée : `country_code` facultatif (ISO, CD distinct de CG), `page` entier positif.
Sortie : `status` et `data` plat ; par exemple `country_1_code`, `country_1_name`,
`operator_1_code`, `operator_1_name`, `operator_1_available` (booléen ou null),
`page_suivante`, `partial`, `checked_at`.
Lire la source effective de GET /api/payments/countries et les options courantes,
jamais un ancien commentaire ou une liste codée dans Sabito.
Documenter les droits et la fraîcheur, distinguer absent, indisponible et inconnu.
Ne créer aucun paiement ni appeler une route qui peut créditer un portefeuille.

### 2. Conditions réellement attachées à une commande

Opération proposée `order_conditions`, strictement en lecture seule et propriétaire.
Entrée : `order_number` exact ; l’identité vient de la session vérifiée du connecteur.
Sortie : `status`, `data` plat avec `service_name`, `conditions_at_purchase`,
`conditions_version`, `purchased_at`, `refill`, `refill_days`, `source`, `checked_at`.
Une condition non historisée ou inconnue reste null et explicitement inconnue.
Ne pas présenter la description actuelle comme preuve des conditions achetées.
Ne déclencher aucun refill, remboursement, annulation ou changement de commande.

### 3. Règles de parrainage actuellement publiées

Opération proposée `referral_terms`, strictement en lecture seule.
Entrée : aucune donnée privée d’un filleul ; contexte de plateforme vérifié.
Sortie : `status`, `data` plat avec `reward_mode`, `reward_percentage` ou
`reward_amount`, `currency`, `minimum_threshold`, `eligibility`, `effective_at`,
`source`, `checked_at`. Toute valeur manquante reste null, pas zéro.
Ne jamais retourner les paiements privés des filleuls ni attribuer un bonus.

Pour chaque proposition : transmettre le contrat exact, les champs autorisés,
exemples ok/pending/not_found/forbidden/error, règles de pagination et de fraîcheur,
et tests refusant une consultation d’un autre propriétaire.
Ne pas transmettre de clé, session, OTP ou secret dans cet échange.

La route GET /api/payments/status/:orderId reste interdite comme outil de lecture :
elle peut consulter le prestataire, modifier un paiement et créditer le portefeuille.
Il n’existe pas d’outil Sabito actuel pour annuler, accélérer, créer un ticket Buzz,
déclencher un refill ou gérer un retrait/une activation.
Un éventuel signalement interne Sabito n’est pas un ticket créé chez Buzz Booster.

## Livraison

Aucune migration supplémentaire : les propositions utilisent les tables existantes,
notamment la migration 013 déjà appliquée par le propriétaire.
Aucune requête SQL Supabase n’est nécessaire.
Le propriétaire effectue lui-même le push GitHub, puis attend le workflow vert,
et fait Pull now, Deploy now et Restart now dans Cybrancy.
