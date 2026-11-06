# Questions BCA de novembre : réponses, contexte et limites

## Corpus et comportement

L’export fourni contient **50 questions distinctes et 51 occurrences**. Le texte
de consignes contient aussi des exemples supplémentaires. Les variantes sont
regroupées par intention, sans créer une référence par faute d’orthographe.

- Accueil : ne pas demander à un membre déjà inscrit de recréer un compte ;
  proposer une activité puis conserver son choix.
- Vente : espace vendeur, livraison, droits du contenu et vérifications avant
  soumission ; aucune garantie d’approbation ou de vente.
- Prix : distinguer publication, modification, abonnement, vente, retrait,
  formation et campagne. Ne pas remplacer une donnée actuelle absente par une
  valeur historique.
- Parrainage : barème propriétaire fixe de **1 500 F / 500 F / 300 F** aux
  niveaux 1 / 2 / 3 ; pas des pourcentages ni des crédits individuels garantis.
- Suivi : « guide-moi », « vendre », « le prix », « pourquoi » et « oui »
  s’interprètent uniquement à partir du dernier message public reconnu,
  dans la conversation du même membre, pendant 30 minutes.
- Une demande de validation du jour 2 devient une proposition de **lecture**,
  jamais une validation automatique.
- Une publicité reçue sans question déclenche une clarification ; ses liens et
  coordonnées ne sont ni suivis ni repris comme source officielle.
- Un achat de formation n’établit pas un droit à des revenus. Accès au contenu,
  paiement de formation, achat Digital Store et revenu d’une vente sont distincts.
- Les réponses personnalisées approuvées dans l’administration restent
  prioritaires. Les parcours financiers en cours ne sont pas consommés par une
  continuation publique.

## Sources réellement examinées

Code Sabito et contrats de ce dépôt, copie des sources Laravel BCA fournie par
le propriétaire, services de lecture et routes de cette copie, et précisions
explicites du propriétaire.

**Ce n’est pas une lecture de la configuration de production.** La copie BCA
ne prouve pas que le serveur déployé utilise le même code ou les mêmes réglages.
Aucun compte de production autorisé n’a été utilisé et aucune base de
production n’a été consultée ou modifiée.

Handlers réutilisés pour les nouvelles formulations :

| Besoin | Opération existante | Limite |
| --- | --- | --- |
| Code personnel | `referral_code` | Session membre vérifiée et confirmation individuelle |
| Commission manquante sans référence | `referral_commissions_recent` | Dernières écritures, pas un total par niveau |
| Commission précise | `referral_commission_status` | Référence et propriétaire vérifiés |
| Journée de campagne | `ads_payout_status` | Lecture d’une journée, aucune validation/paiement lancé |
| Absence de campagnes | `ads_publisher_status` | Profil et test seulement, pas la liste des campagnes accessibles |
| Catalogue | `bca_catalogue_current` | Liste publiée limitée, pas garantie d’accès ni tarifs exhaustifs |
| Achat ou formation inaccessible | `digital_purchase_status` / `formation_payment_status` | Demander le parcours et la référence correspondants |
| Revenu d’une vente | `digital_sale_status` | Ne pas confondre avec un achat ou une promesse de revenus |
| Activation ou retrait | `account_activation` / `withdrawal_status` | Lecture de l’opération du membre uniquement |

Les intentions désactivées ou supprimées ne sont pas recréées ni réactivées.
Une indisponibilité, une absence de données ou une erreur n’est pas transformée
en résultat financier positif.

## Tarifs et autres points non vérifiables avec ces handlers

Aucun handler intégré ne renvoie les frais publics actuels de publication, de
modification, d’abonnement vendeur ou les limites et frais de retrait avant
transaction. Sabito l’indique et guide vers le formulaire actuel ou le support,
sans citer d’ancien tarif.

Le paiement sans compte BCA, le téléchargement direct d’un pack PDF/vidéo, la
compatibilité exacte des formats et la disponibilité actuelle des offres ne
sont pas établis par les contrats disponibles. Ils ne sont pas promis.

Les termes « Sita », « ANOSVOLDIGOAD », « concession la BCA », la demande de VPN,
une épreuve non précisée ou une publicité sans question demandent une précision.

## Divergence de commissions

Seules les données des handlers existants sont examinées :
`niveau` / `montant` pour une commission précise, ou les lignes structurées
`Commission … — niveau … — montant enregistré … — statut …` des écritures récentes.

Si un montant diffère du barème propriétaire :

1. conserver la valeur réellement enregistrée comme donnée personnelle, sans
   l’annoncer comme nouveau barème ;
2. expliquer la divergence et demander une vérification au support ;
3. émettre l’avertissement structuré `BCA_REFERRAL_AMOUNT_DIVERGENCE` dans les
   journaux du serveur pour l’administrateur, sans contact ni référence membre ;
4. ne modifier ni le solde, ni le montant, ni les conditions.

Cette alerte ne déclenche pas d’e-mail. Une écriture historique différente ne
prouve pas une erreur de calcul ni une modification du barème courant. Aucun
handler de paramètres généraux de parrainage n’est disponible dans ce contrat.

## Vérification et installation

Tests du corpus, conversations Socket.IO, isolation entre membres,
confirmation/cancellation individuelles, erreurs et contrôle du paquet Plesk
sur Node.js 21.7.3 et MariaDB isolée. Ces tests ne prouvent pas le déploiement
effectif des services BCA en production.

Les changements n’ajoutent aucune dépendance ni table. Aucune migration ni
requête SQL nécessaire. Le propriétaire pousse lui-même sur GitHub, attend la
réussite du workflow puis utilise Pull now, Deploy now et Restart now.
