/** Manually transcribed from the supplied backend, not inferred live account data.
 * Dynamic prices and frontend URLs are deliberately excluded. All entries pending.
 */
export const bcaSourceDrafts = [
  {
    title:"Quelle référence envoyer à Sabito pour vérifier un dépôt BCA ?",
    content:"1. Retrouvez le dépôt dans votre historique BCA.\n2. Copiez sa référence exacte, sans la modifier.\n3. Envoyez-la lorsque Sabito vous la demande.\nLe numéro de téléphone ne remplace pas cette référence. La consultation nécessite une connexion à votre compte et ne modifie aucun solde.",
    variants:["ou trouver reference depot","quel numero donner pour verifier depot","faut il envoyer mon telephone pour verifier depot",
      "Quelles informations permettent une recherche de dépôt ?","Dois-je recopier la référence affichée dans mon historique ?"],
    category:"Consultations",keywords:["dépôt","référence","historique"],
    source:"app/Services/Sabito/SabitoReadOnlyJobService.php : transactionQuery et transactionStatus ; contrat deposit_number = transactions.reference.",
  },
  {
    title:"Quels soldes Sabito peut-il consulter dans BCA ?",
    content:"Après connexion et confirmation de votre demande, Sabito peut demander au backend BCA votre solde principal, votre solde bloqué, votre solde USD et leurs devises. Les montants proviennent de votre compte : cette réponse ne confirme aucun solde personnel et aucune conversion ou modification n’est effectuée.",
    variants:["quels portefeuilles peut consulter sabito","solde principal ou usd","sabito peut il modifier mon solde",
      "Quelles devises figurent dans la consultation des portefeuilles ?","La lecture des soldes change-t-elle mon argent disponible ?"],
    category:"Portefeuilles",keywords:["solde","USD","devise"],
    source:"app/Services/Sabito/SabitoReadOnlyJobService.php : balance ; app/Models/UserBalance.php.",
  },
  {
    title:"Pourquoi Sabito demande-t-il une référence exacte ?",
    content:"La consultation recherche une opération appartenant à votre compte. Une référence introuvable ou ambiguë ne permet pas de confirmer son état. Vérifiez la référence puis renvoyez-la pour poursuivre. Une impossibilité de consultation ne signifie pas que votre paiement a échoué.",
    variants:["reference introuvable que faire","plusieurs operations correspondent","pourquoi reference exacte",
      "Une consultation introuvable confirme-t-elle un échec de paiement ?","Puis-je corriger une référence transmise à l’assistant ?"],
    category:"Assistance",keywords:["référence","introuvable","ambiguïté"],
    source:"app/Services/Sabito/SabitoReadOnlyJobService.php : transactionQuery et transactionResult.",
  },
  {
    title:"Comment identifier une campagne ou une diffusion BCA Ads pour Sabito ?",
    content:"1. Pour une campagne, utilisez son identifiant numérique exact.\n2. Pour une rémunération de diffusion, utilisez l’identifiant numérique exact de la journée de publication.\nCes identifiants sont différents : n’envoyez pas une référence de paiement à leur place. La consultation reste limitée aux campagnes ou diffusions de votre compte.",
    variants:["quel identifiant campagne bca ads","identifiant journee publication","reference paiement ou campagne",
      "Une campagne et une journée de diffusion ont-elles le même identifiant ?","Quel numéro sert au suivi d’une rémunération BCA Ads ?"],
    category:"BCA Ads",keywords:["campagne","diffusion","identifiant"],
    source:"app/Services/Sabito/SabitoReadOnlyJobService.php : campaignStatus et adsPayoutStatus.",
  },
  {
    title:"Comment indiquer la période d’une récompense leader à Sabito ?",
    content:"Indiquez le premier jour du mois au format AAAA-MM-01 lorsque Sabito demande la période. Par exemple, 2026-11-01 désigne novembre 2026. Le backend consulte seulement les récompenses de votre compte. Une période ne garantit pas l’existence d’une récompense ni son versement.",
    variants:["format periode recompense leader","quel mois pour prime leader","comment ecrire periode leader",
      "Pourquoi écrire le premier jour du mois pour les récompenses ?","Une période de leader garantit-elle un versement ?"],
    category:"Parrainage",keywords:["leader","période","récompense"],
    source:"app/Services/Sabito/SabitoReadOnlyJobService.php : leaderRewardStatus ; app/Models/MonthlyTopLeaderReward.php : period_start.",
  },
  {
    title:"Sabito peut-il effectuer un remboursement BCA ?",
    content:"Non. Le connecteur Sabito consulte uniquement les informations accessibles à votre compte. Il n’effectue aucun remboursement, paiement, crédit de portefeuille ni activation. Pour un remboursement d’achat numérique, il peut rechercher l’achat puis un crédit de remboursement déjà enregistré.",
    variants:["sabito peut rembourser mon achat","peut il activer mon compte","sabito peut effectuer un paiement",
      "L’assistant peut-il déclencher un crédit ou une activation ?","Le connecteur dispose-t-il de droits de modification financière ?"],
    category:"Sécurité",keywords:["remboursement","lecture seule","paiement"],
    source:"app/Services/Sabito/SabitoReadOnlyJobService.php : handle et refundStatus.",
  },
  {
    title:"Pourquoi le montant de l’abonnement Digital Store doit-il être actualisé ?",
    content:"Le backend peut refuser l’achat si le prix de l’abonnement a changé depuis son affichage. Actualisez la page pour afficher le prix actuel avant de recommencer votre démarche. Sabito ne peut pas garantir un tarif à partir d’une ancienne réponse ni effectuer l’achat à votre place.",
    variants:["prix abonnement a change","actualiser abonnement digital store","ancien tarif abonnement vendeur",
      "Le tarif d’une ancienne réponse est-il garanti ?","Pourquoi la souscription vendeur demande-t-elle de recharger la page ?"],
    category:"Digital Store",keywords:["abonnement","prix","actualiser"],
    source:"app/Http/Controllers/DigitalStore/DigitalStoreController.php : refus HTTP 409 « Le prix de l abonnement a change. Actualisez la page. ».",
  },
  {
    title:"Quelles informations ne faut-il jamais envoyer à Sabito ?",
    content:"N’envoyez jamais de mot de passe, code PIN, code de paiement ou jeton de connexion. Pour une consultation, fournissez seulement la référence ou l’identifiant demandé après connexion à votre compte. Un compte non disponible ou interdit ne doit pas permettre d’accéder à des informations privées.",
    variants:["envoyer mot de passe a sabito","sabito demande code pin","quelles donnees partager assistant",
      "Dois-je révéler un code de paiement pour une consultation ?","Faut-il partager un jeton de connexion avec l’assistant ?"],
    category:"Sécurité",keywords:["mot de passe","PIN","confidentialité"],
    source:"app/Services/Sabito/SabitoReadOnlyJobService.php : vérification de membre ; kit de session Sabito existant.",
  },
];
