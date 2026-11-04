# Sabito / Buzz Booster — recherche et validation supervisée

## Périmètre

Le moteur existant est conservé : BM25, mots-clés, variantes exactes, trigrammes,
distance de Damerau-Levenshtein et phonétique française prudente. Aucun LLM,
aucun service d’inférence et aucun embedding de modèle n’a été ajouté ou appelé.
Le message original et les champs transmis au backend ne passent pas par la
normalisation linguistique.

Les réponses viennent des références approuvées ou des modèles déjà rédigés,
avec des valeurs autorisées du backend. Un score de recherche n’est pas une
probabilité. Les seuils et l’écart de désambiguïsation sont administrables.

Les références historiques approuvées sont conservées. Les nouveaux brouillons
et les nouvelles références Buzz Booster créées/modifiées dans l’admin sont
exclus des réponses publiques jusqu’à validation explicite. Une modification
d’une référence Buzz Booster la remet donc en attente de validation.

## Administration

- Dans la configuration de l’assistant, onglet Recherche : dictionnaires
  d’abréviations/corrections, synonymes, score de réponse directe, score minimal
  de suggestion et écart minimal. Les changements ne sont actifs qu’après
  **Valider et appliquer**, avec contrôle de révision concurrente.
- Dans **Connaissances et variantes à valider** : catégorie, question, réponse,
  source, mots-clés et 5 à 10 variantes initiales distinctes. Modifier le
  brouillon, vérifier sa source, puis valider ou refuser.
- Les questions sans réponse résolues pour Buzz Booster créent un brouillon ;
  elles doivent suivre cette validation avant leur utilisation publique.
- Les sélections et retours positifs proposent des variantes, sans activation
  automatique. Les variantes refusées ne sont pas réactivées par une nouvelle
  occurrence. Les doublons ne sont pas ajoutés une seconde fois.
- Les exemples sont filtrés avant stockage : références, nombres, téléphones,
  e-mails et liens sont retirés ; secrets et formulations non linguistiques
  sont exclus. Le vocabulaire conservateur peut écarter une formulation utile :
  c’est préférable à recopier une donnée personnelle.
- Ne jamais publier de données privées dans les références ni leurs variantes.
  Les emplacements de modèles peuvent recevoir uniquement les résultats réels
  et autorisés du backend.

## Brouillons préparés

14 entrées avec chacune 5 variantes : inscription, connexion, récupération de
compte, dépôt, dépôt non reçu, confirmation Mobile Money, crypto, commandes,
remboursements, bonus de dépôt, parrainage, portefeuille, historique et support.

Source : spécification fournie par le propriétaire le 4 novembre 2026, sections
1 et 5. Aucun accès au code de Buzz Booster n’est revendiqué. Les brouillons
généraux ne remplacent pas l’export documenté demandé ci-dessous. Ils ne fixent
aucun tarif, seuil, délai, adresse de support ou procédure crypto supposée.

Les anciennes approbations ne constituent pas une vérification des paramètres
actuellement appliqués par Buzz Booster.

## Continuité et connecteur

Les mécanismes existants de sujet actif, références et dernier résultat backend
restent en place. Les tests distinguent « pourquoi ? » (expliquer le dernier
résultat), « vérifie encore » (nouvelle lecture), « comment confirmer ? »
(demande d’action/procédure) et « et mon bonus ? » (lecture associée).
Plusieurs opérations compatibles exigent une clarification. Les références
déjà connues sont réutilisées sans modification.

Les 12 opérations existantes restent en lecture seule. Aucun retrait, aucune
activation et aucun appel à GET /api/payments/status/:orderId n’est ajouté.
Une valeur absente/null n’est pas zéro ; une erreur n’est pas une confirmation.
L’explication d’un ancien résultat ne prétend pas être une nouvelle lecture.

## Vérifications

Commande : `pnpm --filter @workspace/api-server run test:retrieval`.

Corpus de contrôle distinct des exemples de dictionnaire :

- 42 formulations mal écrites réparties entre les 14 sujets ;
- 42 rattachements attendus en première position ;
- 37 réponses directes correctes ;
- 5 rattachements corrects nécessitant confirmation ;
- 0 réponse affirmative vers un mauvais sujet ;
- 100 % de rattachements corrects = 42 / 42 × 100.

Cette mesure est propre au corpus synthétique, avec des références de test
explicitement marquées approuvées en mémoire. Elle ne mesure pas un taux réel
en production et ne valide aucun brouillon dans une base.

Les autres contrôles couvrent ambiguïtés, hors sujet, négations, champs privés,
références originales, états non validés, isolation de plateforme, validation,
refus, dédoublonnage, anonymisation et continuité après un résultat backend.
Les contrôles HTTP utilisent un double de base local : ils ne remplacent pas
l’exécution des migrations et des parcours MariaDB réels dans GitHub.

Vérifications exécutées pour cette livraison : suite moteur/validation 37/37,
configuration 33/33, sécurité 15/15, déploiement 21/21. Ces suites peuvent
partager certains contrôles ; leur somme n’est pas un nombre de cas uniques.
Vérifications TypeScript serveur et frontend réussies ; compilation du paquet
Cybrancy réussie. Avertissements non bloquants déjà connus sur la localisation
d’une sourcemap de tooltip et la taille du fichier JavaScript.

L’aperçu de connexion s’affiche, mais son API locale n’est pas celle du serveur
Sabito complet. Les écrans administrateur connectés n’ont pas été vérifiés
dans un navigateur authentifié. Aucun résultat de production ni intégration
Buzz Booster réelle n’est revendiqué.

La validation MariaDB isolée de GitHub reste obligatoire avant diffusion.
Le lanceur MariaDB du sandbox Replit a précédemment échoué dans son enveloppe
de processus ; ne jamais le remplacer par un test sur la base de production.

## Demande à transmettre à l’agent Buzz Booster

> Fournis un export documenté, sans secrets, sessions, données de membres ni
> références privées, pour améliorer uniquement les réponses déterministes
> de Sabito. Nous n’avons pas ton code dans ce projet.
>
> Pour chaque parcours (inscription, connexion, récupération, vérification
> d’e-mail, dépôt Mobile Money par opérateur/pays, dépôt crypto par réseau,
> commande/suivi, historique, remboursement, bonus, parrainage, portefeuille,
> support), fournir : catégorie, question principale, 5 à 10 formulations,
> réponse française courte et étapes numérotées vérifiées, libellés exacts
> des écrans/boutons, préconditions, erreurs et actions correctives,
> source vérifiable (fichier et symbole, documentation ou capture expurgée),
> version/date de vérification et limites/conditions de disponibilité.
>
> Fournis seulement les tarifs, seuils, bonus, délais et coordonnées de support
> effectivement vérifiés, en précisant leur source et leurs conditions.
> N’invente aucun retrait ou opération d’activation absent du connecteur.
>
> Documente le contrat actuel des opérations deposit_status, order_status,
> order_refund_status, deposit_bonus_status, referral_code,
> referral_reward_status, referee_bonus_status, wallet_balance,
> wallet_movement_status, admin_adjustment_status, service_catalog et
> service_recommendations : champs d’entrée exacts, autorisation du propriétaire,
> catégories de statut et champs plats de data, sens d’une absence/null,
> exemples entièrement fictifs et garanties d’absence d’effets de bord.
>
> Confirme que ces opérations n’appellent aucun chemin qui crédite un compte.
> GET /api/payments/status/:orderId peut consulter le prestataire et créditer un
> paiement : cette route ne doit pas être utilisée comme outil de lecture Sabito.
> Si le connecteur actuel ne peut pas fournir une observation passive, propose
> un point d’entrée serveur authentifié de lecture seule. Il doit déduire le
> membre côté serveur, vérifier la propriété de la référence, ne lire que l’état
> persisté, ne pas interroger un prestataire avec effets de bord et ne produire
> ni crédit ni mutation. Réponse : status et data plat, sans secrets ; erreur,
> absence et null restent distincts de zéro ou d’une confirmation.
> Ne l’implémente pas sur la base d’une supposition de route Sabito.

## Migration et mise en ligne manuelles

Sabito utilise **MySQL/MariaDB**, pas Supabase pour ces tables. Ne pas exécuter
le SQL MySQL dans l’éditeur PostgreSQL de Supabase.

La migration additive complète est
`migrations/mysql/013_supervised_knowledge.sql`. Elle crée trois tables sans
supprimer ni transformer les conversations ou références existantes.

Après succès de GitHub et Pull now dans Cybrancy, depuis le dossier source :

```sh
pnpm run plesk:migrate:status
pnpm run plesk:migrate:plan
```

Lire tout le plan, conserver la sauvegarde habituelle, puis, si seule cette
migration additive est en attente et après votre accord :

```sh
pnpm run plesk:migrate:apply:reviewed
pnpm run plesk:migrate:status
```

Le lanceur enregistre la migration dans son historique ; ne pas exécuter
uniquement les CREATE TABLE à la main en oubliant cet historique. Si des
migrations antérieures sont aussi en attente, les examiner séparément :
aucune autorisation destructive générale n’est recommandée ici.

Puis suivre vos commandes habituelles Deploy now et Restart now. Ouvrir
l’administration Buzz Booster, vérifier les sources puis valider les références
voulues. Aucun secret supplémentaire ni changement du connecteur n’est requis.

### SQL complet de la migration 013

À relire ici ; l’application par le lanceur ci-dessus reste recommandée pour
tenir à jour l’historique des migrations.

```sql
CREATE TABLE IF NOT EXISTS sabito_knowledge_reviews (
  document_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  category VARCHAR(100) NOT NULL,
  keywords_json TEXT NOT NULL,
  source TEXT NOT NULL,
  reviewed_at DATETIME(6) NULL,
  FOREIGN KEY(document_id) REFERENCES sabito_knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE,
  KEY review_project(project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sabito_knowledge_answer_links (
  message_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  document_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  FOREIGN KEY(message_id) REFERENCES sabito_messages(id) ON DELETE CASCADE,
  FOREIGN KEY(document_id) REFERENCES sabito_knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sabito_variant_candidates (
  id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  project_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  document_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  formulation VARCHAR(500) NOT NULL,
  formulation_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reason ENUM('selection','positive_feedback') NOT NULL,
  occurrences INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  reviewed_at DATETIME(6) NULL,
  UNIQUE KEY candidate_distinct(project_id,document_id,formulation_hash),
  KEY candidate_review(project_id,status,created_at),
  FOREIGN KEY(document_id) REFERENCES sabito_knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY(project_id) REFERENCES sabito_projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
