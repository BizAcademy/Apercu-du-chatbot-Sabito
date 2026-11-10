/**
 * Question text from the owner's 152-entry export, grouped by the existing
 * deterministic BCA route it should use. Short conversational turns are
 * deliberately listed separately: they must resolve from the live dialogue,
 * never from a static FAQ or a guessed financial confirmation.
 */
export const bca152QuestionGroups: { route: string; questions: string[] }[] = [
  {
    route: "current-availability",
    questions: [
      "Ça fait déjà UN moment que Je ne recoil plus DE Campagne DE diffusion",
      "Je ne reçois plus de campagne",
      "Ou regarde pour voir si on a de la pub qui nous attend",
      "Non je Di compagne tu es bête ou bien",
      "Non j'ai Di Une semaine je n'ai pas encore reçu de compagne pourquoi",
      "Une semaine je n'ai pas reçu de compagne",
      "Je n’ai aucune campagne pour le moment",
      "Bonsoir je ne reçois plus les campagnes si vous pouvez m'aider",
      "Ils m'ont dit que Les campagnes test validé et depuis lors je ne vois rien...",
      "Ils ont validé le campagnes test et validé tout mais rien n'est encore apparue",
      "Personnellement j'ai un problème au niveau des campagnes",
      "Je ne reçois plus les campagnes",
      "Où bonjour, depuis le jour où j'ai fait le dépôt je n'ai jamais reçu un campagne disponible",
      "Pourquoi  maintenant y'a pas de campagne en ligne",
      "Bonjour  pour quoi il y'a aucune campagne maintenant",
      "Pourquoi je n'ai plus de campagne publicitaire",
    ],
  },
  {
    route: "current-campaign-test",
    questions: [
      "Comment faire la validation du parcours et de la campagne test",
      "Mes campagne test ont été validées et j'ai rien reçu comme gains",
      "Es ce que la campagne test pour la validé il faut la mettre en statut ?",
      "Montre moi les procédures à prendre pour valider mon compagne test sur BCA",
      "La campagne du test es validé",
      "J'ai fini mes 3 jours de campagne ou du moins deux jours après plusieurs jours tu reçois enfin une campagne est-ce que c'est là je vais commencer par gagner de l'argent",
      "J'ai commencé avec la compagne pour les vues watsapp",
    ],
  },
  {
    route: "current-day",
    questions: [
      "Comment faire le stats pour etre payer?",
      "J'ai fait statut m'ai on me pèye pas",
      "Comment faire pour voir les statuts ?",
      "Comment configurer les vues en statut",
      "Mais j'ai fait une statut premier j'ai pas été payée deuxième jour j'ai pas été payée",
      "Comment on fait pour valider les vues",
      "Je mets les statuts WhatsApp mais je ne gagne rien comme revenu",
    ],
  },
  {
    route: "current-view-count",
    questions: [
      "Comment modifier le nombre de visibilité sur compte diffuseurs",
    ],
  },
  {
    route: "current-advertising-rate",
    questions: [
      "FLa publicité paient combien",
      "1 veu c'est combien",
      "après l'activation du compte qu'est ce qu'il faut faire pour recevoir les 180fcfa après les vues ou likes ?",
      "Comment je peux faire pour rentabiliser les vues de mes statuts",
    ],
  },
  {
    route: "current-status-choice",
    questions: [
      "En partageant le lien dans mon statut whatsapp je gagne de l’argent ?",
      "Est-ce qu’en partageant les statuts je peux me faire de l’argent ?",
      "Je veux gagner avec mes statut WhatsApp",
    ],
  },
  {
    route: "current-earnings-explain",
    questions: [
      "Je ne comprend pas pourquoi il y a certaine personne qui font des centaines de ventes alors que moi je ne trouve même pas où faire des ventes et aussi j'ai seulement gagné 33 fcfa pour 55 vues alors que je vois des gens gagné 20k fcfa par jour juste en faisant 50 vues par statut !?",
    ],
  },
  {
    route: "current-referral",
    questions: [
      "Découvrir le parrainage",
      "Et comment invité un ami à s'inscrire ?",
      "Comment parrainer un proche ?",
      "Comment on fait parrainage en bca",
      "Donne moi le nom du parrainage",
      "Découvrir les parrainage et activités",
    ],
  },
  {
    route: "current-referral-count",
    questions: [
      "Comment vérifier mes fieul",
      "J'ai 8 feuilles seulement",
    ],
  },
  {
    route: "current-referral-eligibility",
    questions: [
      "Comment affilié une personne même si la personne n'as pas d'argent pour s'inscrire",
    ],
  },
  {
    route: "current-sell-learn",
    questions: [
      "Apprendre une compétence et vendre des formations",
      "Je veux apprendre de compétences",
      "Je veux des formations",
      "Apprendre les compétences",
      "Comment faire a pendre vos formations",
      "Ok apprendre",
    ],
  },
  {
    route: "current-seller",
    questions: [
      "La vente des produits digitaux",
      "Comment je peux revendre des produits",
      "Comment vendre en ligne",
      "Je veux Vendre mes Formation",
      "Vendre les formations",
      "Comment faire la publicité de ma formation que je vends",
      "Comment vendre les formations sur bca",
      "Je veux commencer par la revente des produits digitaux",
      "Vendre ma formation",
      "Je veux savoir comment vendre mon produit",
    ],
  },
  {
    route: "current-digital-definition",
    questions: [
      "Qu'est ce que un digital",
    ],
  },
  {
    route: "current-product-policy",
    questions: [
      "Quelles genres de formations suis-je autorisé à vendre?",
      "Cmt fais pour vendre les produits végétaux",
      "Ok je veux vendres des produits végétaux donne moi comment sa fonctionne",
    ],
  },
  {
    route: "current-published-product",
    questions: [
      "Comment voir la formation que je vends",
      "Comment voir mon produit que j'ai publié",
    ],
  },
  {
    route: "current-course-issue",
    questions: [
      "Pourquoi les formations ne marche pas??",
    ],
  },
  {
    route: "current-onboarding",
    questions: [
      "C’est quoi BCA",
      "Comment sa marche",
      "Les activités du BCA",
      "Parle moi un peu de la BCA",
      "Comment gagner l'argent de bca",
      "Comment gagner l'argent avec cet application",
      "Je suis nouvelle personne comment faire pour y arriver",
      "Comment je vais faire pour gagner dans l'application",
      "J’aimerais gagner de l’argent",
      "Je n'arrive pas à avoir de la monnaie sur bca",
      "Je cherche comment gagner de l'argent avec mon compte BCA que j' ai créé",
      "Attend moi je veux gagner fort",
      "Ok je viens de m'inscrire je fais quoi pour gagner l'argent",
      "Ce consernant le statut",
      "Je veux savoir tout",
      "Tout",
      "Je suis un débutant que ce que je dois faire",
      "Découvrez comment faire pour gagné de l'argent chaque jours sur  bca",
      "Comment BCA se passer",
      "Comment gagner l'argent sur la plateforme",
      "Bca ces quoi",
    ],
  },
  {
    route: "current-advertiser",
    questions: [
      "Je veux découvrir les activités adds",
      "Ads",
      "Mais comment faus la publicité",
    ],
  },
  {
    route: "current-ad-budget",
    questions: [
      "Bonjour, j'ai rencontré un blocage lors de la création de mon produit et de la configuration de ma campagne sur l'application BCA (j'ai une erreur concernant le budget minimum malgré mes essais). Pourriez-vous m'aider à débloquer la situation s'il vous plaît ? Merci !\"",
    ],
  },
  {
    route: "current-ads-payment-choice",
    questions: [
      "Comment payer pour la visibilité sur Tik Tok s'il vous plaît c'est ça qui m'intéresse et puis j'ai fait les inscriptions et j'ai misé les 2900",
      "On péye",
    ],
  },
  {
    route: "current-ads-campaign",
    questions: [
      "J'ai cliqué vite sur faire la publicité sur whatsapp avec 500 vues sans changer le nombre. Et je ne peux pas revenir en arrière. Que faire ?",
    ],
  },
  {
    route: "current-ads-website",
    questions: [
      "Maintenant au niveau de annonce diffusé on me dit d'écrire le site web... svp c'est quoi ??",
    ],
  },
  {
    route: "current-video",
    questions: [
      "Vidéo publicitaire",
      "Inason ƙirƙiran video",
    ],
  },
  {
    route: "current-withdrawal",
    questions: [
      "Pourquoi aujourd'hui on arrive pas a retiré l'argent",
      "Retrait nn validé",
      "J'ai fait un retrait mais ça été rejetée",
      "Ça n'a pas encore fait 24h mais j'ai urgement besoin de ça",
      "J'ai pas reçu mon retrait sur wave",
    ],
  },
  {
    route: "current-withdrawal-guide",
    questions: [
      "Comment faire un retrait au Niger",
      "Comment retirer 900 j’ai besoin d’argent",
    ],
  },
  {
    route: "current-deposit",
    questions: [
      "J'ai un dépôt mais je le vois pas",
    ],
  },
  {
    route: "current-double-payment",
    questions: [
      "J’ai fait le paiement 02 fois pour la création  Du compte. Comment être remboursé",
    ],
  },
  {
    route: "current-wallet-choice",
    questions: [
      "Sur mon compte je n'ai jamais ressue 1fran",
      "Je suis pour gagner l’argent mais comment faire",
    ],
  },
  {
    route: "current-security",
    questions: [
      "On a hacker mon compte et la personne à mis un code pin de retrait que je connais pas comment faire",
      "Mais oubliez une autre encore.J'ai oublié mon code PIN de transaction, aide-moi à le réinitialiser. »",
    ],
  },
  {
    route: "current-account-access",
    questions: [
      "J'ai deux comptes BCA je veux rentrer l'autre compte la je fais comment",
      "Je vois pas mon espace membre",
      "Comment rentrer dans le profil",
      "Je viens de oublié mon mot de passe",
      "Comment télécharger l'application de la plateforme",
    ],
  },
  {
    route: "current-support",
    questions: [
      "Je veux le numéro du créateur",
      "Non je veux contact le support",
      "Lien du support",
    ],
  },
  {
    route: "current-capture",
    questions: [
      "C'est possible que je vous fasse un capture d'écran envoyé ??",
    ],
  },
  {
    route: "current-phone-privacy",
    questions: [
      "Où restent les contacts enregistré",
    ],
  },
  {
    route: "current-telegram",
    questions: [
      "Aidez-moi pour la création de mon compte telegram sans rien payer",
    ],
  },
  {
    route: "current-project-duration",
    questions: [
      "Combien de temps a dure ce projet et quel est sa limite de duree dans le temps",
    ],
  },
  {
    route: "current-image-help",
    questions: [
      "Je veux une photo professionnelle",
    ],
  },
  {
    route: "current-non-progress",
    questions: [
      "C'est exactement ce que j'avais fait le mercredi passé",
      "Non seulement j'ai pas bien les questions....",
    ],
  },
  {
    route: "current-no-answer",
    questions: [
      "Non tu m'a pas répondu",
      "À quoi tu peux réponde à ma question",
      "Lesse bavardages",
    ],
  },
  {
    route: "current-unclear",
    questions: [
      "Vos Babière d’abord mm",
      "Henry",
      "Comment tu as trouver?",
      "Des  infos ℹ️",
      "Bonsoir stp je ne comprends pas qq chose",
      "Bonsoir j'ai une question stp",
      "Comment je vais envoyer avec les autres",
      "أنا ما فهمت كيفيتها",
    ],
  },
  {
    route: "current-greeting",
    questions: [
      "bonsoir sabito BCA",
    ],
  },
  {
    route: "conversation",
    questions: [
      "Non",
      "Oui oui",
      "Option 2",
      "Lequel ?",
      "Nn",
      "D'accord sabito. Je comprends",
      "Merci beaucoup Boss",
      "Merci pour ton aide, merci beaucoup. Le code a passé.",
      "Barka da warhaka",
      "Sur Android",
    ],
  },
];
