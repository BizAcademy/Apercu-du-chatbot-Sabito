# Nouvel export BCA — 34 questions

## Changements

- Les 34 lignes du CSV reçu sont couvertes par des variantes des parcours existants, des clarifications ou des réponses contextuelles. Pas de FAQ autonome pour « Oui », « Je vous écoute » ou le choix de langue.
- Les ventes, formations, parrainages, retraits et campagnes réutilisent les réponses et services existants. Les réponses exactes personnalisées par l’administration restent prioritaires.
- Une monétisation de statut doit être précisée : diffusion BCA ou contenus personnels.
- Les captures non validées réutilisent `ads_payout_status` : lecture d’une journée, pas validation automatique. L’identifiant numérique est contrôlé conformément au contrat existant ; une prose invalide laisse la collecte ouverte.
- Les commissions manquantes réutilisent `referral_commissions_recent`. Une inscription ou un lien partagé ne prouve pas qu’une commission est due.
- La disponibilité réutilise `ads_publisher_status` uniquement pour le profil et le test. Ce service ne liste pas les campagnes accessibles et ne prouve pas la cause de leur absence.
- Un virement incomplet est clarifié avant de choisir dépôt, retrait ou transfert. Un vol allégué ne devient pas une fraude confirmée. Un mouvement précis peut être consulté avec le handler existant depuis le compte reconnu.
- Le téléchargement de numéros est clarifié, sans divulgation ni extraction massive de coordonnées privées.
- Chariow est distingué de BCA. Pour une livraison déjà payée dans BCA, le produit externe doit être gratuit pour éviter un double paiement, selon la règle du propriétaire.

## Continuité et langue

La reprise serveur du widget était déjà limitée à 24 heures depuis la création de la conversation. Les choix et le contexte publics sont désormais conservés sur cette même période, au lieu de 30 minutes. La fermeture du widget n’efface pas cette conversation ; changer de compte n’en transfère pas la propriété.

La langue est conservée dans un espace serveur des métadonnées de la conversation, inaccessible à l’initialisation par des métadonnées client. « In English » active l’anglais, « En français » rétablit le français.

Les réponses anglaises sont rédigées et déterministes. Les réponses non traduites, les références personnalisées et les détails renvoyés par un service sont conservés dans leur formulation originale avec une introduction anglaise explicite. Il ne s’agit donc pas d’une traduction intégrale de toutes les réponses possibles du backend. Aucun LLM ni service de traduction n’est ajouté.

Un changement explicite de parcours pendant un problème ouvert (envoi de capture, débit contesté, arnaque alléguée ou réponse non résolue) peut être différé par une unique question de résolution. « Oui » produit « Excellent » puis traite la demande différée ; « Non » demande l’étape encore bloquée. La demande différée est référencée par son identifiant de message et relue avec contrôle de propriété.

Les anciennes confirmations financières ne sont pas renouvelées par un choix public ou collectif. Le cache explicatif de résultat privé reste court ; une nouvelle vérification doit obtenir un nouveau résultat du service autorisé.

## Limites explicites

Les archives et contrats présents dans le dépôt ne prouvent ni la configuration du backend actuellement déployé, ni les menus actuels du frontend BCA. Aucun compte réel de production n’a été consulté. Les frais et limites actuels ne peuvent pas être lus par un handler raccordé ; les réponses renvoient vers le formulaire actif ou le support officiel.

Les commissions annoncées restent des montants fixes : 1 500 F, 500 F et 300 F aux niveaux 1, 2 et 3. La détection existante des divergences avec des données vérifiées conserve son avertissement structuré côté serveur ; elle ne modifie aucun montant.

## Vérification

- Vérification TypeScript : réussie.
- Tests de corpus : 32/32.
- Tests d’intégration avec MariaDB isolée et protocole Socket.IO réel : 51/51.
- Réouverture, changement de langue persistant, contexte de 21 heures, expiration à 25 heures, compte distinct, résolution oui/non et collecte après identifiant invalide : contrôlés.
- Compilation du paquet Cybrancy/Plesk réussie ; démarrages à froid et à chaud vérifiés avec Node.js 21.7.3 en environnement isolé.

Ces contrôles ne prouvent pas le bon fonctionnement du bouton Restart App du panneau Cybrancy ni les résultats métier du backend BCA en production.

## Livraison

Aucune migration ni requête SQL nécessaire.

Les métadonnées utilisent la colonne JSON déjà existante. Aucune dépendance ajoutée. Aucun push, déploiement ni changement de production effectué.
