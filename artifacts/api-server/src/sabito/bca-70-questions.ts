/**
 * Exact normalized formulations from the owner's 70-question BCA export.
 * Related questions reuse existing FAQ guides, private read-only handlers,
 * or contextual follow-up behavior instead of duplicating answers.
 */
export const bca70QuestionGroups: { route: string; questions: string[] }[] = [
  {
    route: "current-day",
    questions: [
      "J'ai fais 168vues aujourd'hui et j'ai été payé à seulement 108fcfa",
      "Comment mes statuts serait payé",
      "J'ai un problème au de valider Les campagnes",
      "Toujours on rejeté ma 2eme journée de campagne Test pourquoi ?",
      "Aujourd'hui ça me fait 3 jours dès que j'envoie la capture d'écran de ma 2eme journée de campagne Test et on rejeté je sais pas pourquoi et pourtant je respecte les consignes indiqué",
      "Comment valider les vue sur BCA",
      "Pourquoi le network ads reject t'il notre confirmation",
    ],
  },
  {
    route: "current-small-question",
    questions: [
      "Bonsoir j'ai un problème",
      "Ont peut parlé",
      "Svp sabito bca",
    ],
  },
  { route: "current-referral", questions: ["Comment faire du parrainage"] },
  {
    route: "current-visibility-choice",
    questions: ["Comment faire de sorte qu'ils voient"],
  },
  {
    route: "current-phone-privacy",
    questions: [
      "Les contacts à télécharger vont servir à quoi",
      "Svp plaît comment télécharger des contacts sur la BCA pour avoir beaucoup de visibilité ?",
    ],
  },
  { route: "current-deposit-guide", questions: ["Comment faire un DEPO dans mon compte"] },
  {
    route: "current-ads-overview",
    questions: [
      "Effectuez des tâches",
      "Je veux découvrir les parrainage et les activités BCA ads.",
      "Parlé moi des activités BCA Ads",
      "Les activités bca ads",
    ],
  },
  {
    route: "current-earnings-explain",
    questions: [
      "Comment gagner de l'argent à travers les vues sur statut wattsapp",
      "Comment gagner des gains avec les statuts ?",
    ],
  },
  {
    route: "current-product-review",
    questions: [
      "Mon produit n'est pas visible par tous les membres",
      "J'ai publié dans la digital store mais c'est pas encore affiché par tous les membres BCA",
    ],
  },
  {
    route: "current-campaign-guide",
    questions: [
      "La campagne texte se trouve où",
      "Non au niveau des diffuseur",
    ],
  },
  {
    route: "current-campaign-test",
    questions: ["Ok comment faire le test"],
  },
  {
    route: "current-campaign-proof",
    questions: [
      "Oui salut normalement le statut wattsap ces 24h du temps sans dépasser que tu envoies la capture pour ces terminé avant les 24h?",
      "Même si la confirmation de lecture de WhatsApp es désactiver sa marche ?",
    ],
  },
  {
    route: "current-pin-clarification",
    questions: [
      "Non c'est le code pin",
      "C'est belle et bien le PIN don je parle",
    ],
  },
  {
    route: "current-referral-count",
    questions: [
      "Salutations peux-tu vérifier le nombre de personnes que j'ai réussi à parrainé",
    ],
  },
  {
    route: "current-seller",
    questions: [
      "Est ce qu'on vendre mes produits ici",
      "Comment vendre les produits digitaux sur la plateforme BCA ?",
      "Comment vendre des produits digitaux de la bca ?",
      "Comment faire des premiers vente",
      "Bonjour, guide moi pas à pas pour créer un produit pour ma première vente",
    ],
  },
  {
    route: "current-unclear",
    questions: [
      "Une compagnie",
      "Il n'est pas connecté",
    ],
  },
  {
    route: "current-onboarding",
    questions: [
      "Bonsoir je suis nouveau comment fonctionne le plateforme",
      "Comment ont gagné sur bca",
      "Cv tu vas bien c'est pour te demander comment fonctionne la bca",
      "J'aimerais avoir une idée sur les différents projets",
      "Je veux gagner de l'argent",
      "C'est quoi la BCA écrit un texte en expliquant comment fonctionne la BCA",
      "Je suis un novice dans la manipulation de cette plate-forme, mais j'aimerais être professionnellement guidé, comprendre tout de l'essentiel pour gérer des revenus.",
    ],
  },
  {
    route: "current-availability",
    questions: ["Comment je vais faire pour avoir des campagnes chaque jour"],
  },
  {
    route: "current-publisher-payout",
    questions: [
      "Quand on gagne des gains dans l'espace diviseur c'est directement versé sur notre compte BCA ou on doit les transférer",
    ],
  },
  {
    route: "current-share-app",
    questions: ["Comment partager l´application bca"],
  },
  {
    route: "current-wallet-choice",
    questions: ["Pourquoi je n'ai pas reçu de l'argent"],
  },
  {
    route: "conversation",
    questions: [
      "Aidé moi à nouveau ,je voudrais savoir",
      "Tu  ne peux pas répondre",
      "Aidez moi à nouveau",
      "Et pourquoi ?",
    ],
  },
  {
    route: "current-subscription-clarification",
    questions: ["Il faut combien pour avoir un abonnement à vu?"],
  },
  {
    route: "current-greeting",
    questions: [
      "Oui bonjour sabito BCA",
      "Oui bonsoir",
    ],
  },
  {
    route: "current-withdrawal",
    questions: [
      "Pourquoi quand je lance un retrait ça me mais échec",
      "Combien de temps prennent le retrait ?",
    ],
  },
  {
    route: "current-wallet-balance",
    questions: [
      "Pourquoi les solde ne sont pas meme solde presipal et solde actuel",
    ],
  },
  {
    route: "current-advertising-rate",
    questions: ["L'argent des vues a changé ou bien"],
  },
  {
    route: "current-pin-clarification",
    questions: ["Comment obtenir mon code PIN quand je l'ai oublié"],
  },
  {
    route: "current-cancel-request",
    questions: [
      "J'ai besoin qu'on annule un retrait",
      "Annuler la transaction pour que je reprenne",
      "J'ai fais une erreur lors du retrait, au lieu du réseau tmoney, j'ai mis réseau moov, es ce qu'il y'a une possibilité d'annuler la transaction ?",
    ],
  },
  {
    route: "current-registration-link",
    questions: ["Je veux le lien d'inscrption"],
  },
  {
    route: "current-support-hours",
    questions: ["Le support s'ouvre à quel heure ?"],
  },
  {
    route: "current-country-payment",
    questions: ["Quel moyen de paiement utilise le benin"],
  },
  {
    route: "current-account-email",
    questions: ["Comment retrouver mon émail de mon compte BCA"],
  },
  {
    route: "current-whatsapp-blocked",
    questions: [
      "Mon compte WhatsApp a été bloqué sans y savoir la raison que dois je faire",
    ],
  },
  {
    route: "current-telegram",
    questions: [
      "Ma question d'aujourd'hui je cherche la suite de vidéo pour ouvrir télégramme sans autant payé quelque chose",
    ],
  },
];
