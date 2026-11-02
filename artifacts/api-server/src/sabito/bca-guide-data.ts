// Owner-approved BCA help, derived from the supplied configuration document.
// Public guidance only: current prices and personal results remain backend-owned.
import { bcaFaq } from "./bca-faq";
export type BcaGuide = {key:string;title:string;variants:string[];content:string;followUpKeys:string[]};
export const bcaGuides:BcaGuide[] = [
  {
    "key": "01",
    "title": "C’est quoi BizConnect Academy ?",
    "variants": [
      "Comment fonctionne BCA ?",
      "Que peut-on faire sur BCA ?",
      "À quoi sert la plateforme ?"
    ],
    "content": "BCA rassemble plusieurs services autour de la formation, des produits digitaux, du réseau de membres et de la publicité.\n1. Créez votre compte avec les informations demandées et un code de parrainage valide.\n2. Suivez l’activation et les vérifications proposées.\n3. Complétez votre profil et configurez votre sécurité.\n4. Consultez les formations, ebooks, contacts, opportunités, boutique et fonctions publicitaires disponibles.\n5. Pour une opération payante, vérifiez les frais et conditions dans le formulaire avant validation.\nLa présence d’une fonctionnalité ne garantit ni disponibilité permanente ni revenu.",
    "followUpKeys": [
      "03",
      "05",
      "02"
    ]
  },
  {
    "key": "02",
    "title": "Comment gagner de l’argent avec BCA ?",
    "variants": [
      "Comment BCA rémunère les membres ?",
      "Quelles sont les activités rémunérées ?",
      "Comment obtenir des gains ?"
    ],
    "content": "Les possibilités identifiées comprennent notamment les commissions de parrainage selon les conditions applicables, les ventes dans la boutique digitale et les diffusions BCA Ads validées.\n1. Choisissez le service correspondant à votre activité.\n2. Consultez ses conditions, ses éventuels frais et ses critères d’accès.\n3. Réalisez les étapes demandées.\n4. Vérifiez les écritures et résultats réellement enregistrés.\nUne inscription, une publication de statut, un clic, une capture envoyée ou une campagne test ne garantissent pas un paiement.\nJe ne peux pas garantir un revenu fixe, un rendement ou un remboursement automatique de votre mise.",
    "followUpKeys": [
      "18",
      "23",
      "27"
    ]
  },
  {
    "key": "03",
    "title": "Comment créer un compte BCA ?",
    "variants": [
      "Comment m’inscrire ?",
      "Comment rejoindre BCA ?",
      "Pourquoi on me demande un parrain ?"
    ],
    "content": "1. Ouvrez l’inscription depuis le site officiel.\n2. Renseignez le nom demandé, votre e-mail, le pays et votre numéro WhatsApp avec l’indicatif.\n3. Créez votre mot de passe et confirmez-le dans le formulaire.\n4. Indiquez un code de parrainage valide ou vérifiez celui prérempli par le lien d’invitation.\n5. Validez et suivez les instructions affichées.\nDans la version analysée, le code de parrainage est obligatoire et doit correspondre à un parrain existant. Ne l’inventez pas.\nLe nom et l’e-mail doivent être uniques. Une inscription peut aussi être temporairement indisponible en cas de maintenance.\nLe compte nouvellement créé doit ensuite suivre le parcours d’activation. Ne transmettez jamais votre mot de passe dans le chat.",
    "followUpKeys": [
      "05",
      "07"
    ]
  },
  {
    "key": "04",
    "title": "Comment me connecter à BCA ?",
    "variants": [
      "J’ai oublié mon mot de passe.",
      "Je ne reçois pas le code.",
      "Je n’arrive pas à me connecter."
    ],
    "content": "1. Utilisez la page de connexion officielle et renseignez vos identifiants.\n2. Si une vérification supplémentaire est demandée, saisissez le code uniquement dans le formulaire officiel.\n3. En cas d’oubli du mot de passe, utilisez la procédure de réinitialisation affichée.\n4. Vérifiez l’e-mail saisi et les courriers indésirables, puis utilisez le renvoi si disponible.\n5. Respectez les limites de renvoi et contactez l’assistance publiée si le problème persiste.\nUn code de connexion, un code de réinitialisation et un PIN de transaction sont des éléments différents.\nNe transmettez aucun de ces secrets à Sabito.",
    "followUpKeys": [
      "07",
      "37"
    ]
  },
  {
    "key": "05",
    "title": "Comment activer mon compte BCA ?",
    "variants": [
      "Mon compte est inactif.",
      "Où payer l’activation ?",
      "Peut-on activer en crypto ?"
    ],
    "content": "1. Connectez-vous et ouvrez le parcours d’activation proposé.\n2. Consultez le montant, la devise et les méthodes réellement disponibles.\n3. Choisissez le pays, le service et les informations de paiement demandées.\n4. Vérifiez le récapitulatif avant de confirmer dans le formulaire sécurisé.\n5. Finalisez l’autorisation chez le prestataire si nécessaire.\n6. Attendez la confirmation et vérifiez l’état du compte.\nL’activation peut proposer Mobile Money ou une option crypto selon leur disponibilité. Je ne peux pas garantir qu’elles sont toutes actives aujourd’hui.\nUn paiement initié ou un débit opérateur ne prouve pas à lui seul que le compte est activé.\nNe payez jamais sur un numéro ou un lien inventé par un interlocuteur.",
    "followUpKeys": [
      "06",
      "08"
    ]
  },
  {
    "key": "06",
    "title": "J’ai payé l’activation, pourquoi mon compte reste inactif ?",
    "variants": [
      "Activation en attente.",
      "Paiement d’activation confirmé mais compte bloqué.",
      "Mon activation n’a pas marché."
    ],
    "content": "Le paiement et l’activation du compte sont deux états à vérifier séparément.\n1. Consultez le résultat du paiement d’activation dans la plateforme.\n2. Conservez la référence de cette opération.\n3. Pour une vérification personnelle, utilisez une session membre vérifiée et la référence utile.\n4. Si le service de vérification n’est pas disponible, utilisez les coordonnées d’assistance officielles.\nNe payez pas immédiatement une seconde activation. Une erreur technique ne signifie pas que votre premier paiement a été perdu.\nJe ne peux confirmer l’activation que si l’état réel de votre compte le confirme.",
    "followUpKeys": [
      "35",
      "36"
    ]
  },
  {
    "key": "07",
    "title": "Comment créer ou modifier mon PIN de transaction ?",
    "variants": [
      "J’ai oublié mon PIN.",
      "Le PIN est refusé.",
      "Où saisir mon code de transaction ?"
    ],
    "content": "1. Ouvrez Profil et la rubrique de sécurité ou de PIN proposée.\n2. Suivez la création ou la modification dans le formulaire officiel.\n3. Si le PIN est oublié, utilisez la procédure de réinitialisation prévue et ses vérifications.\n4. Saisissez le PIN uniquement lors de l’opération sécurisée qui le demande.\nLe backend protège notamment les dépôts, retraits, transferts et plusieurs achats par une vérification de PIN.\nSabito ne vous demandera jamais ce PIN dans la conversation. Ne tentez pas de contourner une limitation ou un blocage de sécurité.",
    "followUpKeys": [
      "08",
      "37"
    ]
  },
  {
    "key": "08",
    "title": "Comment modifier mon profil et mon numéro de retrait ?",
    "variants": [
      "Comment ajouter un compte de retrait ?",
      "Comment changer mon WhatsApp ?",
      "Où trouver mon matricule ?"
    ],
    "content": "1. Ouvrez Profil.\n2. Modifiez les informations proposées et vérifiez leur exactitude.\n3. Pour les retraits, utilisez la gestion des comptes ou numéros de retrait.\n4. Ajoutez ou modifiez uniquement un compte que vous êtes autorisé à utiliser.\n5. Sélectionnez le compte par défaut si cette option est proposée.\n6. Consultez les options de mot de passe, avatar et double authentification selon vos besoins.\nLe matricule sert notamment à identifier un destinataire lors d’un transfert BCA à BCA. Il ne remplace pas un mot de passe.\nDes règles ou vérifications peuvent limiter certaines modifications : suivez les messages affichés plutôt que contourner la sécurité.",
    "followUpKeys": [
      "07",
      "13"
    ]
  },
  {
    "key": "09",
    "title": "Quelle différence entre mon solde principal et mon solde USD ?",
    "variants": [
      "Pourquoi j’ai deux soldes ?",
      "Puis-je additionner les deux portefeuilles ?",
      "Quel est mon solde ?"
    ],
    "content": "Le solde principal et le portefeuille USD sont distincts.\nSur BCA, les formulaires tiennent compte de la devise de votre compte pour le portefeuille principal.\n1. Ouvrez la rubrique portefeuille ou le tableau de bord.\n2. Identifiez chaque montant et sa devise.\n3. Si une conversion est proposée, consultez son devis avant validation.\nNe les additionnez pas comme un même montant et n’appliquez pas un taux inventé.\nPour connaître votre solde actuel, une consultation personnelle autorisée est nécessaire : un ancien message ou une capture ne suffit pas.",
    "followUpKeys": [
      "10",
      "17"
    ]
  },
  {
    "key": "10",
    "title": "Comment effectuer un dépôt sur BCA ?",
    "variants": [
      "Comment recharger mon solde ?",
      "Comment déposer par Mobile Money ?",
      "Où faire un dépôt ?"
    ],
    "content": "1. Connectez-vous et ouvrez Dépôt.\n2. Consultez les limites et frais affichés.\n3. Choisissez le pays et le service de paiement réellement proposés.\n4. Saisissez le montant, la devise et le numéro de paiement demandé.\n5. Vérifiez le montant à payer, les frais et le montant attendu sur le solde.\n6. Saisissez le PIN de transaction dans le formulaire sécurisé.\n7. Si l’opérateur demande un OTP ou une autorisation, effectuez cette étape dans le parcours officiel.\n8. Attendez la confirmation et conservez la référence.\n9. Consultez le solde et l’historique.\nNe communiquez ni PIN ni OTP à Sabito. Les opérateurs, seuils et frais peuvent changer : le formulaire courant fait foi.",
    "followUpKeys": [
      "11",
      "35"
    ]
  },
  {
    "key": "11",
    "title": "Mon dépôt n’est pas arrivé, que faire ?",
    "variants": [
      "J’ai été débité mais le solde n’a pas augmenté.",
      "Mon dépôt est en attente.",
      "Mon paiement n’a pas été crédité."
    ],
    "content": "Un débit chez l’opérateur n’est pas, à lui seul, une preuve de crédit du portefeuille.\n1. Retrouvez l’opération dans l’historique.\n2. Relevez sa référence et vérifiez le pays, l’opérateur et le montant.\n3. Une vérification personnelle nécessite votre identité membre vérifiée et uniquement l’identifiant utile.\n4. Si le résultat est en attente, expliquez cet état sans promettre un délai non confirmé.\n5. Si le paiement est confirmé mais le crédit non prouvé, distinguez les deux états et orientez vers l’assistance si nécessaire.\n6. Si la recherche est introuvable, demandez de corriger l’information sans perdre le contexte.\nNe relancez pas un second paiement simplement parce que l’écran tarde à se mettre à jour.\nLa référence BCA et celle du prestataire peuvent être différentes. Indiquez de quel identifiant vous disposez, sans envoyer de code secret.",
    "followUpKeys": [
      "35",
      "36"
    ]
  },
  {
    "key": "12",
    "title": "Comment déposer en crypto sur BCA ?",
    "variants": [
      "Puis-je payer en crypto ?",
      "Où trouver l’adresse de dépôt ?",
      "Mon paiement crypto est en attente."
    ],
    "content": "1. Ouvrez le dépôt et choisissez crypto seulement si cette méthode est disponible.\n2. Indiquez les informations demandées et vérifiez le devis.\n3. Ouvrez la page de paiement sécurisée générée par la plateforme.\n4. Respectez exactement la devise, le réseau, l’adresse, le montant et l’échéance indiqués.\n5. Attendez les confirmations requises et consultez le résultat.\nSabito ne crée aucune adresse de paiement et ne choisit pas un réseau au hasard.\nUn transfert sur un mauvais réseau, incomplet ou expiré ne garantit pas un crédit automatique. Ne payez pas à nouveau avant clarification.\nNe confondez pas dépôt crypto et paiement crypto d’activation : l’objectif de l’opération est différent.",
    "followUpKeys": [
      "11",
      "37"
    ]
  },
  {
    "key": "13",
    "title": "Comment effectuer un retrait BCA ?",
    "variants": [
      "Comment retirer mon argent ?",
      "Comment recevoir mes gains sur Mobile Money ?",
      "Où faire un retrait ?"
    ],
    "content": "1. Ouvrez Retraits.\n2. Vérifiez le solde disponible et la devise.\n3. Sélectionnez le pays, le service et votre compte de retrait enregistré, ou renseignez les informations autorisées par le formulaire.\n4. Indiquez le montant.\n5. Consultez l’estimation : montant débité, frais et montant à recevoir.\n6. Vérifiez le bénéficiaire et saisissez le PIN uniquement dans le formulaire sécurisé.\n7. Validez puis suivez l’historique.\nLe montant saisissable doit respecter les limites courantes, le solde disponible et les conditions de la méthode.\nUne demande enregistrée n’est pas une preuve de versement chez l’opérateur. Je ne peux pas garantir un délai ou une approbation.",
    "followUpKeys": [
      "08",
      "14"
    ]
  },
  {
    "key": "14",
    "title": "Pourquoi mon retrait n’est pas reçu ?",
    "variants": [
      "Mon retrait reste en attente.",
      "Mon retrait a été rejeté.",
      "L’argent a été débité mais je n’ai rien reçu."
    ],
    "content": "1. Retrouvez le retrait dans son historique.\n2. Vérifiez sa référence, le compte destinataire et le statut réellement enregistré.\n3. La vérification personnelle se fait uniquement avec les droits du membre connecté.\n4. Présentez séparément la demande, son traitement, le paiement et un éventuel recrédit.\n5. Si une information est incorrecte, demandez sa correction dans la même conversation.\nUn rejet ne prouve pas automatiquement qu’un remboursement a déjà été crédité. Une erreur de connexion ne prouve pas non plus un rejet.\nNe soumettez pas une nouvelle demande avant d’avoir clarifié la précédente.",
    "followUpKeys": [
      "35",
      "36"
    ]
  },
  {
    "key": "15",
    "title": "Comment retirer en crypto ?",
    "variants": [
      "Peut-on retirer des USD ?",
      "Où saisir mon adresse crypto ?",
      "Pourquoi le retrait crypto est indisponible ?"
    ],
    "content": "1. Consultez les méthodes de retrait et choisissez crypto si l’option est active.\n2. Vérifiez le portefeuille source, la devise, le réseau et les limites.\n3. Renseignez votre adresse dans le formulaire sécurisé, jamais dans un lien de paiement inventé.\n4. Consultez le montant, les frais et le résultat attendu.\n5. Vérifiez attentivement les données avant confirmation et saisissez le PIN si demandé.\n6. Conservez la référence et suivez le statut.\nLes réseaux et conditions courants font foi. Un retrait crypto peut être irréversible après exécution ; Sabito ne doit pas le lancer, le modifier ou l’annuler à votre place.",
    "followUpKeys": [
      "35",
      "37"
    ]
  },
  {
    "key": "16",
    "title": "Comment transférer de l’argent à un autre membre BCA ?",
    "variants": [
      "Comment faire un transfert BCA à BCA ?",
      "Quel identifiant donner au destinataire ?",
      "Comment envoyer à un matricule ?"
    ],
    "content": "1. Ouvrez Transfert BCA à BCA.\n2. Renseignez le matricule du destinataire.\n3. Vérifiez que le bénéficiaire affiché est bien la bonne personne.\n4. Indiquez le montant dans la devise attendue.\n5. Vérifiez l’estimation, les frais et le montant que recevra le destinataire, notamment si les devises diffèrent.\n6. Saisissez le PIN dans le formulaire et validez.\n7. Conservez la référence et consultez l’historique.\nLe backend analysé recherche le destinataire par matricule, pas par un nom approximatif ni un numéro de paiement.\nLes écritures de l’expéditeur et du destinataire sont distinctes. Les frais et conversions peuvent expliquer un montant reçu différent.\nJe ne peux pas réaliser un transfert à votre place dans le chat.",
    "followUpKeys": [
      "08",
      "35"
    ]
  },
  {
    "key": "17",
    "title": "Comment convertir mon solde principal en USD ou l’inverse ?",
    "variants": [
      "Comment faire un swap ?",
      "Pourquoi le montant après conversion change ?",
      "Quel taux est appliqué ?"
    ],
    "content": "1. Ouvrez la rubrique de portefeuilles ou conversion disponible.\n2. Choisissez le sens : portefeuille principal vers USD, ou USD vers portefeuille principal.\n3. Saisissez le montant et la devise source attendue.\n4. Consultez le devis officiel : débit, conversion, frais et crédit attendu.\n5. Confirmez uniquement si le récapitulatif vous convient.\n6. Vérifiez les deux portefeuilles et l’historique de conversion.\nSabito ne garantit aucun taux et ne calcule pas une équivalence approximative à la place du devis.\nSi l’opération est contestée, consulter ses écritures autorisées plutôt que répéter le swap.",
    "followUpKeys": [
      "09",
      "35"
    ]
  },
  {
    "key": "18",
    "title": "Comment fonctionne le parrainage BCA ?",
    "variants": [
      "Où trouver mon code de parrainage ?",
      "Comment inviter un filleul ?",
      "Pourquoi ma commission manque ?"
    ],
    "content": "1. Ouvrez Parrainage.\n2. Copiez votre code ou votre lien personnel.\n3. Partagez-le pour l’inscription d’un nouveau membre.\n4. Consultez vos filleuls et les commissions réellement enregistrées.\nLe parrainage documenté prévoit notamment des commissions d’activation sur trois niveaux. Les montants et conditions doivent être vérifiés dans la configuration active.\nUne inscription ne prouve pas qu’une commission est due ou créditée : l’événement éligible et son paiement doivent être confirmés.\nUn dépôt ne donne pas automatiquement droit à une récompense. Les conditions affichées sur BCA font foi.\nUn changement rétroactif de parrain n’est pas à promettre. Pour un litige, utiliser l’assistance officielle.",
    "followUpKeys": [
      "03",
      "35"
    ]
  },
  {
    "key": "19",
    "title": "Comment récupérer les contacts sur BCA ?",
    "variants": [
      "Comment exporter les contacts WhatsApp ?",
      "Comment télécharger le fichier VCF ?",
      "Pourquoi certains contacts n’apparaissent pas ?"
    ],
    "content": "1. Ouvrez Contacts.\n2. Utilisez les filtres réellement proposés.\n3. Consultez les résultats disponibles pour votre compte.\n4. Utilisez Exporter pour obtenir le fichier VCF, ou l’envoi par e-mail si cette option est proposée.\n5. Importez le fichier dans l’application Contacts de votre téléphone selon ses instructions.\n6. Vérifiez les autorisations de Contacts de WhatsApp si nécessaire.\nLes résultats dépendent des filtres et des comptes éligibles. Ne garantissez ni un nombre fixe de contacts ni une synchronisation réciproque automatique sur tous les téléphones.\nLa présence d’un export ou d’un historique de téléchargement ne prouve pas que les autres membres ont enregistré votre numéro dans leur téléphone.\nUtilisez uniquement les actions proposées dans Contacts. N’effectuez pas de paiement à partir d’un parcours qui n’est pas affiché.\nRespectez la confidentialité et les règles d’utilisation des données de membres.",
    "followUpKeys": [
      "08",
      "37"
    ]
  },
  {
    "key": "20",
    "title": "Comment accéder à une formation BCA ?",
    "variants": [
      "Comment acheter une formation ?",
      "Où retrouver ma formation ?",
      "J’ai payé mais je n’ai pas accès."
    ],
    "content": "1. Ouvrez Formations.\n2. Recherchez la formation et lisez sa fiche : contenu, type, conditions, prix et promotion éventuelle.\n3. Si un paiement est nécessaire, utilisez le bouton et le moyen proposés sur la fiche.\n4. Vérifiez le montant, confirmez dans le parcours sécurisé et saisissez le PIN si demandé.\n5. Attendez la confirmation puis utilisez l’accès fourni par la plateforme.\n6. Si le paiement est débité sans accès, conservez la référence pour une vérification autorisée.\nToutes les formations ne doivent pas être présentées comme gratuites ou payantes sans lire leur fiche.\nNe confondez pas une formation du catalogue BCA et un produit vendu par un membre dans la boutique digitale : leur paiement et leur accès peuvent différer.\nJe ne peux pas fournir un lien de contenu réservé sans confirmation de votre accès.",
    "followUpKeys": [
      "22",
      "36"
    ]
  },
  {
    "key": "21",
    "title": "Comment consulter ou télécharger un ebook ?",
    "variants": [
      "Où trouver les ebooks ?",
      "Le lien de mon ebook ne fonctionne pas.",
      "Comment accéder au livre ?"
    ],
    "content": "1. Ouvrez Ebooks.\n2. Consultez les fiches actives et les filtres disponibles.\n3. Ouvrez l’ebook choisi et utilisez l’accès proposé s’il est disponible.\n4. Si le lien est indisponible ou invalide, indiquez le titre concerné et contactez l’assistance officielle.\nUtilisez uniquement l’accès proposé sur la fiche, qui peut prendre la forme d’un lien Drive. N’effectuez pas de paiement à partir d’un parcours non affiché et ne contournez pas les droits du contenu. Si la fiche prévoit d’autres conditions, suivez ces indications ou demandez confirmation à l’assistance.",
    "followUpKeys": [
      "20",
      "36"
    ]
  },
  {
    "key": "22",
    "title": "Comment acheter un produit dans la boutique digitale ?",
    "variants": [
      "Comment passer une commande dans Digital Store ?",
      "Où retrouver mon achat ?",
      "Comment accéder à ma bibliothèque ?"
    ],
    "content": "1. Ouvrez Boutique digitale.\n2. Recherchez un produit disponible et consultez sa description, son vendeur, son prix et sa devise.\n3. Vérifiez que votre portefeuille permet l’achat.\n4. Utilisez le parcours d’achat officiel et saisissez le PIN demandé dans le formulaire.\n5. Attendez la confirmation.\n6. Retrouvez le contenu acheté dans la bibliothèque prévue par la boutique.\nUn achat confirmé comporte un débit acheteur et des écritures de vente correspondantes. L’accès doit être confirmé par votre achat réel.\nEn cas de doute, consultez la bibliothèque et l’historique avant de payer une deuxième fois.\nNe promettez ni remboursement ni accès à un produit désactivé sans résultat autorisé.",
    "followUpKeys": [
      "20",
      "36"
    ]
  },
  {
    "key": "23",
    "title": "Comment vendre une formation ou un produit digital sur BCA ?",
    "variants": [
      "Comment publier dans Digital Store ?",
      "Comment ajouter un produit ?",
      "Pourquoi mon produit est en attente ?"
    ],
    "content": "1. Ouvrez l’espace vendeur de la boutique.\n2. Consultez les conditions d’accès et les éventuels frais ou abonnements affichés.\n3. Créez votre fiche avec le titre, la description, la catégorie, le prix, la devise et les éléments demandés.\n4. Fournissez un lien de contenu HTTPS valide et les coordonnées professionnelles autorisées.\n5. Ajoutez l’image et acceptez les conditions si demandé.\n6. Vérifiez les frais de publication avant confirmation et saisissez le PIN dans le formulaire.\n7. Soumettez le produit et suivez sa validation.\nDans la version analysée, un produit soumis peut rester en attente et inactif jusqu’à validation.\nNe promettez pas qu’une publication sera visible immédiatement ou qu’elle sera approuvée.",
    "followUpKeys": [
      "24",
      "25"
    ]
  },
  {
    "key": "24",
    "title": "Quels sont les frais pour publier ou modifier un produit ?",
    "variants": [
      "Pourquoi ma modification coûte de l’argent ?",
      "Comment prendre un abonnement vendeur ?",
      "L’abonnement rend-il tout gratuit ?"
    ],
    "content": "1. Consultez les tarifs et conditions de l’espace vendeur.\n2. Sélectionnez l’action ou le plan réellement proposé.\n3. Vérifiez le montant, la devise, les avantages et la durée affichés.\n4. Confirmez uniquement après lecture du récapitulatif et saisie du PIN dans le formulaire.\nDes frais de publication ou de modification et des abonnements peuvent s’appliquer selon la configuration.\nUne modification payante peut demander une confirmation explicite et entraîner une nouvelle attente de validation.\nNe déduisez pas qu’un abonnement supprime tous les frais ni qu’il garantit des ventes.",
    "followUpKeys": [
      "23",
      "25"
    ]
  },
  {
    "key": "25",
    "title": "Où voir mes ventes et mes revenus de vendeur ?",
    "variants": [
      "J’ai vendu mais je ne vois pas le montant.",
      "Pourquoi le crédit vendeur diffère du prix ?",
      "Où retrouver un achat client ?"
    ],
    "content": "1. Ouvrez l’espace vendeur et la liste des ventes.\n2. Identifiez la vente concernée.\n3. Consultez son statut, les écritures et les frais ou commissions réellement applicables.\n4. Vérifiez le portefeuille et sa devise.\nUn prix public, un débit acheteur et un crédit vendeur ne sont pas nécessairement le même montant, notamment en présence de commission ou de conversion.\nJe ne peux consulter que vos informations autorisées, sans révéler les données privées d’un acheteur.\nUn remboursement ou une correction de vente doit être confirmé par ses écritures, pas promis sur simple demande.",
    "followUpKeys": [
      "35",
      "36"
    ]
  },
  {
    "key": "26",
    "title": "Comment créer une campagne publicitaire BCA Ads ?",
    "variants": [
      "Comment lancer une publicité ?",
      "Comment devenir annonceur ?",
      "Comment payer ma campagne ?"
    ],
    "content": "1. Ouvrez la rubrique BCA Ads puis l’espace annonceur.\n2. Créez une campagne et renseignez les éléments de contenu demandés.\n3. Ajoutez le moyen de contact ou la destination requis : WhatsApp, téléphone ou site selon le formulaire.\n4. Choisissez les critères de ciblage disponibles.\n5. Indiquez le budget et consultez la simulation officielle.\n6. Vérifiez le montant, la devise, l’objectif et les conditions, puis confirmez dans le formulaire sécurisé.\n7. Suivez l’état de la campagne et sa validation.\nLes budgets minimaux peuvent différer entre image et vidéo. Le budget et le nombre de vues doivent correspondre au devis réel.\nCréer une campagne ne prouve pas son approbation ou sa diffusion.\nLes vues, clics, contacts commerciaux et ventes sont des résultats différents ; aucune vente ne doit être garantie.",
    "followUpKeys": [
      "27",
      "35"
    ]
  },
  {
    "key": "27",
    "title": "Comment devenir diffuseur BCA Ads ?",
    "variants": [
      "Comment gagner avec les publicités ?",
      "Comment rejoindre les diffuseurs ?",
      "Pourquoi je ne vois pas de campagnes payantes ?"
    ],
    "content": "1. Ouvrez l’espace diffuseur dans BCA Ads.\n2. Créez ou complétez le profil demandé et les informations de visibilité.\n3. Suivez le parcours de campagne test.\n4. Attendez la validation des étapes requises.\n5. Consultez ensuite les campagnes disponibles pour votre profil.\nL’accès aux campagnes rémunérées demande notamment un profil diffuseur autorisé et une campagne test validée.\nLes campagnes disponibles peuvent dépendre du ciblage, de leur état, des objectifs atteints et des restrictions du profil.\nUn compte créé ou activé ne garantit pas automatiquement des campagnes disponibles.",
    "followUpKeys": [
      "28",
      "26"
    ]
  },
  {
    "key": "28",
    "title": "Comment réussir ma campagne test ?",
    "variants": [
      "Pourquoi ma campagne test ne paie pas ?",
      "Combien de jours comporte le test ?",
      "Pourquoi le jour suivant est bloqué ?"
    ],
    "content": "1. Ouvrez les campagnes test disponibles dans l’espace diffuseur.\n2. Acceptez le test proposé et lisez ses consignes.\n3. Utilisez le contenu et le lien de suivi fournis.\n4. Réalisez la publication prévue et déclarez-la dans la plateforme.\n5. Soumettez la vérification ou la preuve demandée dans le délai affiché.\n6. Attendez la validation de la première journée avant de poursuivre l’étape suivante.\n7. Terminez toutes les journées exigées et vérifiez la validation finale.\nLa version analysée prévoit deux journées pour le test. Le test n’est pas rémunéré : le paiement calculé pour une campagne test est nul.\nUne capture envoyée ou une journée validée ne prouve pas que le test complet est terminé.\nNe promettez pas un paiement pour le test ni l’ouverture immédiate de toutes les campagnes après une seule étape.",
    "followUpKeys": [
      "30",
      "31"
    ]
  },
  {
    "key": "29",
    "title": "Comment suivre une campagne rémunérée BCA Ads ?",
    "variants": [
      "Comment publier la publicité ?",
      "Comment déclarer une diffusion ?",
      "Puis-je accepter plusieurs campagnes ?"
    ],
    "content": "1. Vérifiez votre éligibilité et les campagnes réellement disponibles.\n2. Lisez les consignes, le calendrier et la rémunération de la campagne choisie.\n3. Acceptez-la si la plateforme l’autorise.\n4. Publiez les éléments et le lien de suivi prévus, puis déclarez la publication.\n5. Soumettez chaque vérification dans le délai affiché.\n6. Consultez les journées validées et les paiements réellement crédités.\nLe code comporte une restriction empêchant certaines acceptations lorsqu’une campagne est déjà active. Il ne faut pas promettre l’acceptation simultanée de plusieurs campagnes.\nLa configuration analysée décrit un schéma de trois jours, avec un jour de facturation annonceur et deux jours de visibilité bonus. Cela ne garantit pas une durée complète ni un volume fixe si les conditions d’arrêt sont atteintes.\nLa rémunération du diffuseur dépend des vues validées et des règles réelles de la campagne, pas d’une simple déclaration personnelle.",
    "followUpKeys": [
      "30",
      "31"
    ]
  },
  {
    "key": "30",
    "title": "Comment faire vérifier ma publication BCA Ads ?",
    "variants": [
      "Comment envoyer ma preuve ?",
      "Pourquoi WhatsApp demande un QR ?",
      "Pourquoi la capture est refusée ?"
    ],
    "content": "1. Ouvrez la journée de publication concernée.\n2. Vérifiez que la publication a été déclarée et que la journée précédente est validée si nécessaire.\n3. Choisissez une méthode réellement autorisée : vérification WhatsApp ou capture si cette alternative est activée.\n4. Pour WhatsApp, suivez uniquement le parcours officiel de connexion et les autorisations proposées. Ne transmettez pas un code d’appairage ou de connexion dans le chat.\n5. Pour une capture, envoyez l’image demandée et les informations exactes, sans falsification.\n6. Envoyez avant l’échéance affichée et attendez le résultat.\nLe lien de suivi fait partie des exigences identifiées. Une connexion réussie, une capture chargée, un nombre de vues déclaré et une validation de paiement sont des étapes différentes.\nRespectez les délais et limitations. Ne rafraîchissez pas en boucle et ne tentez pas de contourner une vérification.",
    "followUpKeys": [
      "28",
      "31"
    ]
  },
  {
    "key": "31",
    "title": "Pourquoi ma diffusion n’est pas payée ?",
    "variants": [
      "Ma preuve est en attente.",
      "Mon nombre de vues n’est pas accepté.",
      "Mon gain publicitaire manque."
    ],
    "content": "1. Vérifiez s’il s’agit d’une campagne test ou rémunérée.\n2. Consultez la journée, la date limite et l’état de la preuve.\n3. Vérifiez la validation réelle et le nombre de vues retenu.\n4. Consultez le paiement et l’écriture du portefeuille.\nUne preuve soumise ne vaut pas validation. Un test ne donne pas lieu à rémunération.\nUne journée peut être en attente, refusée ou expirée ; seul le résultat réel permet d’expliquer votre cas.\nSi une reprise est autorisée, suivez l’action proposée pour cette journée ; ne créez pas une fausse preuve.\nUn nombre de vues déclaré ne suffit pas à calculer un gain définitif.",
    "followUpKeys": [
      "35",
      "36"
    ]
  },
  {
    "key": "32",
    "title": "Comment publier un statut sur BCA ?",
    "variants": [
      "Comment voir les statuts ?",
      "Comment réagir ?",
      "Est-ce que publier un statut me paie ?"
    ],
    "content": "1. Ouvrez la rubrique de statuts ou d’activités effectivement proposée.\n2. Utilisez l’option de création et les types de contenu autorisés.\n3. Publiez, puis consultez les vues et réactions si ces fonctions sont disponibles.\n4. Utilisez les actions de suppression ou de réaction proposées.\nLes statuts internes BCA ne sont pas la même chose qu’une publication WhatsApp demandée par BCA Ads.\nLes vues et réactions ne signifient pas qu’un statut ordinaire donne droit à un gain.",
    "followUpKeys": [
      "27",
      "34"
    ]
  },
  {
    "key": "33",
    "title": "Comment consulter les opportunités business ?",
    "variants": [
      "Où trouver les opportunités ?",
      "Comment choisir une activité ?",
      "Puis-je publier mon business ?"
    ],
    "content": "1. Ouvrez Opportunités business.\n2. Consultez les catégories et les fiches disponibles.\n3. Lisez la description et utilisez uniquement les liens ou contacts officiellement fournis.\n4. Vérifiez vous-même les conditions avant tout engagement.\nCet espace permet de consulter les opportunités. Pour proposer une offre ou connaître les conditions de publication, demandez confirmation à l’assistance.\nNe promettez ni acceptation d’une nouvelle offre, ni retour sur investissement, ni bénéfice garanti.",
    "followUpKeys": [
      "20",
      "36"
    ]
  },
  {
    "key": "34",
    "title": "Où consulter mes notifications et les communautés BCA ?",
    "variants": [
      "Comment lire une notification ?",
      "Où est le groupe WhatsApp ?",
      "Comment suivre les annonces ?"
    ],
    "content": "1. Ouvrez les notifications depuis l’interface.\n2. Consultez les éléments reçus et marquez-les comme lus si nécessaire.\n3. Pour les communautés, utilisez les liens officiellement publiés dans les rubriques ou le pied de page de BCA.\n4. Ne rejoignez pas un groupe à partir d’un lien inventé ou présenté comme officiel sans vérification.\nUne notification est une information ; pour confirmer une opération financière, il faut son résultat et ses écritures réelles.\nNe divulguez pas le contenu privé des notifications d’un autre membre.",
    "followUpKeys": [
      "35",
      "37"
    ]
  },
  {
    "key": "35",
    "title": "Comment consulter mes transactions BCA ?",
    "variants": [
      "Où voir mon historique ?",
      "Comment retrouver une opération ?",
      "Que signifie en attente ?"
    ],
    "content": "1. Ouvrez Transactions ou l’historique de la fonctionnalité concernée.\n2. Recherchez par les filtres disponibles.\n3. Ouvrez l’opération et relevez sa référence, son type, son montant, sa devise et son état.\n4. En cas de question, précisez si elle concerne un dépôt, retrait, transfert, activation, achat, vente, conversion, commission ou campagne.\nUn même événement peut avoir plusieurs écritures : débit, crédit, frais, commission ou correction. Ne les additionnez pas sans connaître leur rôle.\n« En attente » signifie que le traitement n’est pas confirmé. « Terminé » ne doit être interprété que pour l’opération et l’étape concernées.\nLes notes internes, journaux techniques, clés et données privées de tiers ne doivent pas être exposés.",
    "followUpKeys": [
      "11",
      "14"
    ]
  },
  {
    "key": "36",
    "title": "Comment contacter le support BCA ?",
    "variants": [
      "Comment signaler un problème ?",
      "Où envoyer une réclamation ?",
      "Est-ce qu’un ticket a été ouvert ?"
    ],
    "content": "Utilisez les coordonnées ou le formulaire d’assistance réellement publiés sur BCA.\n1. Indiquez le type de problème.\n2. Ajoutez la référence utile, la date approximative et le montant si nécessaire.\n3. Joignez une capture en masquant les secrets et les données de tiers.\n4. Décrivez les étapes déjà effectuées.\nNe transmettez jamais de mot de passe, PIN, OTP ou phrase de récupération.\nJe ne peux pas inventer un numéro WhatsApp, une adresse e-mail, un lien de support ou un ticket BCA.\nUn ticket interne Sabito ne peut être annoncé qu’après enregistrement réel et doit être distingué d’une demande reçue par l’équipe BCA.",
    "followUpKeys": [
      "35",
      "37"
    ]
  },
  {
    "key": "37",
    "title": "Comment protéger mon compte BCA ?",
    "variants": [
      "Quelqu’un demande mon code.",
      "Puis-je envoyer mon PIN au support ?",
      "Comment éviter une arnaque ?"
    ],
    "content": "1. Utilisez le site officiel et vérifiez l’adresse avant connexion ou paiement.\n2. Choisissez un mot de passe robuste et utilisez la double authentification si proposée.\n3. Gardez votre PIN et vos codes à usage unique secrets.\n4. Vérifiez le bénéficiaire, le réseau crypto, les frais et le montant avant confirmation.\n5. Refusez une demande de paiement sur un compte ou un lien non fourni par le parcours officiel.\n6. Contactez l’assistance publiée si vous suspectez un accès frauduleux.\nSabito ne vous demandera jamais un secret pour « débloquer » une transaction.",
    "followUpKeys": [
      "07",
      "08"
    ]
  },
  {
    "key": "38",
    "title": "Comment passer une commande sur BCA ?",
    "variants": [
      "Comment passer une commande ?",
      "Comment commander ?",
      "Je veux passer une commande",
      "Ma commande n’est pas disponible.",
      "Je ne retrouve pas ma commande"
    ],
    "content": "S’agit-il d’une formation du catalogue BCA, d’un achat dans la boutique digitale ou d’une campagne publicitaire BCA Ads ?\nChoisissez le parcours correspondant ci-dessous pour voir les étapes. BCA ne doit pas être confondue avec une plateforme de commandes de boost des réseaux sociaux.",
    "followUpKeys": ["20", "22", "26"]
  },
  ...bcaFaq,
];
