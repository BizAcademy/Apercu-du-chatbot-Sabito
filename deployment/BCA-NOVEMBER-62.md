# Couverture des 62 questions BCA de novembre

## Installation et limites

Les formulations du lot sont déclarées dans
`artifacts/api-server/src/sabito/bca-november-questions.ts`.
Elles réutilisent les guides approuvés, les clarifications conversationnelles et
trois opérations existantes : `ads_publisher_status`, `ads_payout_status`,
`bca_catalogue_current`.

L’installation est automatique lors du chargement du projet BCA. Elle ajoute
les variantes uniquement à des références existantes et approuvées ; elle ne
recrée pas les références supprimées et ne réactive pas les intentions
désactivées. Les textes, questions complémentaires et réglages administrateur
sont conservés. Des marqueurs persistants empêchent la réinstallation.

La nouvelle procédure de réinitialisation du PIN est proposée **À valider**.
Elle n’est pas publiée par le déploiement. Le texte affiché sans validation
demande d’abord quel code est concerné et n’exige jamais de code confidentiel.

**Précisions ultérieures du propriétaire :** pour un PIN ou code de configuration
oublié, Sabito oriente directement vers le support BCA. L’ancien brouillon
généré est corrigé uniquement s’il est encore en attente et inchangé ; les
références validées ou personnalisées ne sont pas écrasées.

## Ce que Sabito ne peut pas déduire

- Les sources Laravel fournies sont une photographie, pas une consultation de
  la configuration du backend déployé. Aucun secret n’est nécessaire pour
  installer ce lot.
- Le profil diffuseur indique sa validation, pas la liste des campagnes
  accessibles. L’absence d’offres reste à vérifier dans BCA.
- Le propriétaire annonce désormais un minimum publicitaire de 5 000 F et la
  suppression des campagnes à 1 000 F et 2 000 F. L’exemple ancien de 2 000 F
  pour 667 vues explique l’arrêt sur objectif atteint ; ce n’est ni un tarif
  courant par vue, ni une preuve de la cause d’une campagne personnelle.
- Pour novembre 2026, le propriétaire confirme qu’aucune autre nouveauté n’est
  annoncée à part Sabito ; de nouvelles formations et fonctionnalités sont en
  préparation, sans date promise. Les images des vêtements sont à demander au
  support ; aucun visuel n’est inventé.
- Selon les conditions communiquées par le propriétaire, l’inscription n’est
  pas remboursable. Sabito fournit la présentation officielle et le support.
  La réponse publique ne crée plus de ticket automatique de remboursement ;
  les tickets existants ne sont ni supprimés ni fermés. Les autres paiements
  restent distincts. Aucune opération financière n’est exécutée.
- Aucun handler général de vérification de création de compte n’est ajouté.
  Le compte ne peut pas être confirmé à un visiteur.

## Sources et sécurité

Les parcours publics proviennent des références déjà approuvées dans Sabito.
Les règles de livraison Digital Store viennent du propriétaire : accès au
contenu après achat, Drive accessible, pas de réseaux sociaux comme livraison,
pas de second paiement sur Chariow/Maketou, droits de revente nécessaires.

La copie Laravel déclare les routes de réinitialisation du PIN dans
`routes/api.php`, sous `v2/profile/transaction-pin`. Leur présentation dans le
frontend actuel doit être confirmée avant validation du nouveau texte.

Les trois intentions privées réutilisent les protections existantes : membre
vérifié, confirmation individuelle, identité externe côté serveur, filtrage du
résultat, ticket en cas d’échec du connecteur. Aucune identité écrite dans une
question ne remplace l’identité authentifiée. Si une intention est absente ou
désactivée, Sabito indique explicitement qu’il ne peut pas consulter les données.

## Catalogue et suivi après précisions du propriétaire

Les quatre captures du 6 novembre 2026 montrent 19 formations. Les 17 formations
hors promotion de paris sportifs ont un titre de référence et des mots-clés dans
`bca-owner-clarifications.ts`. Les deux formations de promotion de bookmakers ne
sont pas recommandées ; aucun code promotionnel de paris ni parcours vers ces
offres n’est fourni.

Un mot de formation déclenche une question d’accès. « Oui » ne reprend que la
dernière proposition publique, dans la conversation du même membre et pendant
30 minutes. Un nouveau sujet interrompt cette reprise. Pour plusieurs résultats
(Facebook, TikTok, WhatsApp), Sabito demande quel cours est visé. Le parcours
pointe vers la page Formations vue dans les captures, sans lien de leçon réservé,
prix garanti ou promesse d’accès à vie. Le connecteur existant ne renvoie toujours
que cinq formations au maximum : ces titres sont un instantané fourni par le
propriétaire, pas une synchronisation exhaustive en temps réel.

La formation Telegram est présentée avec ses limites : l’astuce ne marche pas
pour tout le monde. Le guide normal utilise l’application officielle ; des frais
de 1 $ ne sont pas présentés comme une obligation générale en Afrique. Visa
n’est mentionné que si le parcours officiel le propose, jamais dans le chat.

Les commissions annoncées de 1 500 F / 500 F / 300 F concernent les niveaux
1 / 2 / 3 de l’affiliation aux offres BCA. Elles ne prouvent pas un crédit
personnel et ne sont pas étendues aux ventes personnelles Digital Store.

## Vérification

```sh
pnpm run typecheck
pnpm --filter @workspace/api-server run test:corpus
pnpm run build:cybrancee
pnpm --filter @workspace/api-server run test:mysql
```

Les tests de corpus vérifient les 62 formulations et leurs types de routes.
Les tests MySQL vérifient l’installation réelle des variantes, le statut
« pending » du nouveau texte et l’isolation des clarifications entre membres,
en complément des tests existants du contrat et des confirmations privées.
Ces tests locaux ne prouvent pas la version des handlers actuellement déployée
chez BCA ni le fonctionnement du panneau Plesk.

**Aucune migration ni requête SQL nécessaire.**
Le propriétaire pousse sur GitHub, puis réalise lui-même Pull now,
Deploy now et Restart now. Aucun push ni déploiement automatique.
