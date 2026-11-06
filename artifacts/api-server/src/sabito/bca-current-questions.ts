import { normalizeQuestion } from "./question-normalization";

/** Owner's November instructions. No live tariff, availability or account
 * result is embedded here. Private targets are existing read-only handlers. */
export type BcaQuestionRoute = {
  key:string;kind:"public"|"context"|"private";target:string;source:string;
  questions:string[];answer?:string;
};
const support="https://bcachat.bizconnectacademy.com";
const context=(key:string,questions:string[],answer:string):BcaQuestionRoute=>({
  key,kind:"context",target:key,source:"Consignes explicites du propriétaire ; aucune donnée personnelle vérifiée",
  questions,answer,
});
export const bcaReferralAmounts="Les commissions prévues sont des montants fixes : 1 500 F au niveau 1, 500 F au niveau 2 et 300 F au niveau 3.";
const gettingStarted="Vous êtes déjà inscrit : inutile de recréer un compte. Vous pouvez apprendre avec les formations, vendre un produit numérique que vous avez le droit de commercialiser, recommander BCA ou consulter les campagnes WhatsApp disponibles selon leurs conditions. Aucun revenu n’est garanti. Pour commencer, quel parcours vous intéresse : apprendre, vendre, parrainage ou campagnes ?";
const referral="Retrouvez la rubrique Parrainage dans votre compte BCA pour copier votre propre code et votre lien personnel, puis partagez-les avec les personnes intéressées, sans messages non sollicités. Les filleuls et commissions enregistrées se consultent aussi dans « Mes gains ». Pour que je consulte votre code réel avec une session vérifiée, dites « Mon code parrainage ». "+bcaReferralAmounts+" Le niveau 1 correspond à la personne directement parrainée, puis les niveaux 2 et 3 à la suite de sa chaîne. L’attribution dépend des conditions et de l’événement prévu par BCA ; partager le lien ou une simple inscription ne garantit pas une commission.";
const seller="Pour vendre votre propre produit ou formation, ouvrez Digital Store puis l’espace vendeur de votre compte. Utilisez le formulaire proposé pour créer la fiche, renseigner les informations demandées et le lien de livraison, puis relisez les conditions et les frais actuels avant de soumettre. Ne vendez que des contenus dont vous possédez les droits. Une soumission ne garantit pas l’approbation ni une vente. Voyez-vous l’espace vendeur ou êtes-vous bloqué dans le formulaire ?";
const pricing="Je n’ai pas de handler raccordé qui fournisse le tarif actuel de publication. Dans l’espace vendeur Digital Store, consultez le récapitulatif actuel avant de confirmer : distinguez création, publication, modification, abonnement vendeur et frais de vente éventuels. Je ne peux confirmer ni un montant ni la gratuité à partir d’une ancienne archive. Si ces informations ne s’affichent pas, contactez "+support+". Ne payez pas sur un numéro reçu dans le chat.";
const learning="Quel domaine et quel objectif vous intéressent ? Consultez la liste actuelle des formations dans BCA ; je ne peux pas établir un classement mondial des compétences ni garantir des revenus. Pour consulter les offres actuellement publiées avec le service autorisé, dites « Consulter le catalogue actuel ». Une formation présente dans un ancien catalogue n’est pas nécessairement disponible ou gratuite aujourd’hui.";
const pack="Vous pouvez préparer un contenu dont vous avez les droits, mais je n’ai pas vérifié que le formulaire vendeur actuel accepte votre pack PDF et vidéo, ni qu’un acheteur puisse payer sans compte BCA et télécharger directement sur son téléphone. Vérifiez les formats et le parcours d’achat actuels avant de publier. Pour une formation, le propriétaire demande un lien Google Drive accessible à l’acheteur après achat ; les liens de réseaux sociaux ne conviennent pas comme livraison. Avec Chariow ou Maketou, le produit externe doit être gratuit pour éviter un second paiement. Souhaitez-vous les étapes pour vérifier le partage Google Drive ?";

export const bcaCurrentRoutes:BcaQuestionRoute[]=[
  context("current-onboarding",[
    "Je ne comprend pas le BCA","Je ne comprends pas BCA","Aide moi à gagner de l'argent sur bca",
    "Comment gagner sur BCA","Comment commencer a gagner l'argent",
    "Tout mais je ne sais pas comment me procéder","Tout mais je ne sais pas comment procéder",
    "Je viens de m’inscrire","Comment commencer à gagner de l’argent",
  ],gettingStarted),
  context("current-referral",[
    "Comment ouvrir le rubrique de parrainage","Comment ouvrir la rubrique de parrainage",
    "Comment faire un parrainage","C'est comment le parrainage ?","Comment fonctionne le code parrain ?",
    "Peut-on gagner de l'argent avec le parrainage ?","Quels sont les commissions de parrainage ?",
    "Quelles sont les commissions de parrainage ?","Commission par niveau","Combien gagne un parrain",
  ],referral),
  context("current-seller",[
    "Comment créer mes propres produits digitaux et les vendres?",
    "Comment créer mes propres produits digitaux et les vendre",
    "Comment vendre les produits digitaux sur la BCA","Comment vendre un article sur le site",
    "Je veux vendre ma formation","Comment créer ma propre formation dans BCA ?",
  ],seller),
  context("current-publish-price",[
    "Le prix pour publier un produit","Pour créer un produit et publier est-ce que c'est payant",
    "Pour créer un produit et publier, est-ce que c’est payant ?","Frais pour publier un produit",
  ],pricing),
  context("current-price-choice",["Le prix","Je veux savoir le prix","C'est gratuit ?"],
    "De quel prix ou frais parlez-vous : formation, publication d’un produit, abonnement vendeur, campagne ou retrait ? Le tarif actuel doit être vérifié dans le parcours concerné ; je ne vais pas deviner un montant."),
  context("current-learning",[
    "Apprendre une compétence","Si vous pouvez m'aider avec  certaine compétence que vous connaissez qui plus recherché dans le monde",
    "Si vous pouvez m’aider avec une compétence que vous connaissez et qui est recherchée dans le monde",
  ],learning),
  context("current-pack",[
    "Est-ce possible de créer un pack de formation en pdf et vidéo puis partager le lien et les gens arrivent à payer sans s'inscrire sur BCA et téléchargé le pack dans sont téléphone",
    "Est-ce possible de créer un pack de formation en PDF et vidéo, partager le lien, et permettre aux gens de payer sans s’inscrire sur BCA puis de télécharger le pack sur leur téléphone ?",
  ],pack),
  context("current-campaign-guide",["Comment fonctionne la campagne","Comments gagne Argent grace a whatsapp",
    "Comment gagner de l'argent grâce à WhatsApp","Comment fonctionne une campagne"],
    "Dans le parcours diffuseur BCA Ads Network, ouvrez une campagne accessible, lisez ses conditions et rejoignez-la seulement si elle est disponible pour votre profil. Publiez les éléments demandés sur votre statut WhatsApp, puis suivez la déclaration et la vérification dans BCA. Les vues WhatsApp, les vues validées et les crédits sont distincts. Une publication ne garantit pas un paiement ; ne supposez pas une durée de 23 heures ni un tarif par vue universels. Souhaitez-vous les étapes de publication ou vérifier une journée précise ?"),
  context("current-free-campaign",["Faire une campagne publicitaire gratuitement"],
    "Parlez-vous de créer une publicité comme annonceur ou de participer à la campagne test comme diffuseur ? Le test n’est pas une publicité gratuite pour promouvoir votre produit. Je n’ai pas vérifié de formule annonceur gratuite : consultez le budget et les conditions dans le formulaire actuel avant toute validation."),
  context("current-advertiser",["Je veux être annonceur"],
    "Dans BCA Ads Network, choisissez le parcours annonceur, consultez les conditions, préparez les éléments demandés et vérifiez le ciblage, le budget et le récapitulatif du formulaire actuel avant de confirmer. Je n’ai créé ni financé de campagne et ne garantis ni validation, ni vues, ni clients. Si le menu diffère, indiquez ce que vous voyez sans information confidentielle."),
  context("current-ads-error",["Quand je rentre dans ads network sa écrit erreur","Quand je rentre dans Ads Network, ça écrit erreur"],
    "Quel message exact apparaît dans Ads Network et êtes-vous annonceur ou diffuseur ? Je ne peux pas vérifier une panne à partir de ce seul message. N’envoyez aucun PIN, mot de passe, OTP ou jeton ; si vous transmettez une capture au support officiel, masquez les données confidentielles. Si le blocage persiste, contactez "+support+"."),
  context("current-views",["Les vues"],
    "Parlez-vous des vues affichées sur WhatsApp, de celles validées par BCA ou du montant crédité ? Ce sont des informations différentes. Pour une journée précise, une consultation autorisée de votre compte est nécessaire ; je n’ai encore vérifié ni vues ni paiement."),
  context("current-activation",["Non un activation","Non, une activation"],
    "Vous parlez donc de l’activation du compte, pas d’un autre service. Consultez le parcours d’activation affiché dans votre compte et son récapitulatif actuel. Pour vérifier votre propre paiement, dites « Vérifier mon activation » ; une session reconnue et la référence non confidentielle du paiement seront nécessaires. Je n’ai activé ni vérifié de compte."),
  context("current-third-party-activation",["Quelqu'un s'est inscrit son compte n'est pas encore active",
    "Quelqu’un s’est inscrit, son compte n’est pas encore actif"],
    "L’inscription et l’activation sont deux étapes différentes. Cette personne doit suivre le parcours d’activation de son propre compte. Je ne peux pas consulter ses données depuis votre session ; elle peut demander « Vérifier mon activation » depuis son compte reconnu ou contacter "+support+". Ne partagez aucun mot de passe, PIN ou OTP."),
  context("current-withdrawal-fees",["A combien s'élève les frais de retraits à la BCA?","Quels sont les frais de retrait ?"],
    "Je n’ai pas de consultation raccordée donnant les frais et limites de retrait actuels. Ouvrez le formulaire de retrait de votre portefeuille BCA et vérifiez les moyens disponibles, la devise, les limites, les frais et le montant net avant toute confirmation. Je ne vais pas citer un ancien tarif ni effectuer le retrait pour vous. Pour une demande déjà créée, dites « Vérifier mon retrait ». Si les frais ne s’affichent pas, contactez "+support+"."),
  context("current-capture",["Comment envoyer son capture d'écran","Comment envoyer sa capture d’écran ?"],
    "À qui souhaitez-vous envoyer la capture : au support BCA ou dans une étape de campagne ? Utilisez uniquement le bouton de pièce jointe effectivement présent dans le canal concerné ; je ne peux pas confirmer que ce widget accepte les images. Masquez les soldes, coordonnées et informations confidentielles inutiles, et n’envoyez jamais de PIN, mot de passe, OTP ou jeton. Le support officiel est "+support+"."),
  context("current-help-videos",["Comment trouver les vidéos d'aide de la BCA"],
    "Le guide d’aide communiqué par l’équipe BCA est https://presentationbizconnectacademy.com/aide. Ouvrez la vidéo correspondant à votre démarche et comparez avec votre écran actuel ; si le guide ou un bouton diffère, précisez la rubrique au support "+support+". Cherchez-vous l’aide pour une campagne test, une publication payante ou un autre parcours ?"),
  context("current-fraud",["J'ai besoin à propos d'une arnaque","J’ai besoin d’aide à propos d’une arnaque"],
    "Que s’est-il passé : paiement, accès au compte ou message suspect ? Ne partagez ni mot de passe, PIN, OTP ni jeton et ne faites pas de nouveau paiement pour débloquer la situation. Gardez les preuves utiles et contactez le support officiel "+support+", sans publier de données privées ici. Je ne peux pas accuser une personne ni confirmer une fraude sans éléments vérifiés."),
  context("current-vpn",["Apprend moi a configuré un vpn et a créé mes propres fichier"],
    "Cherchez-vous une aide liée à une formation BCA ou à une configuration sur votre appareil ? Précisez votre objectif et la rubrique concernée. Je ne peux pas modifier votre appareil ni supposer quelle formation vous suivez."),
  context("current-unclear",["ANOSVOLDIGOAD c'est possible","Sita","Comment concession la BCA",
    "Je n' ais pas venir à leur de l'épreuve","Je n’ai pas pu venir à l’heure de l’épreuve"],
    "Pouvez-vous préciser ce que vous voulez dire et l’activité BCA concernée ? Je préfère vous demander plutôt que deviner."),
  context("current-reject",["Non pas sa","Non pas ça","Ce n'est pas ça"],
    "D’accord, ma réponse ne correspondait pas à votre demande. Quelle partie ai-je mal comprise et que souhaitez-vous faire exactement ?"),
  context("current-small-question",["J'ai une petite question"],"Bien sûr, posez votre question. Quelle aide souhaitez-vous sur BCA ?"),
  context("current-greeting",["Oui bonjour"],"Bonjour ! Quelle est votre question sur BCA ?"),
  context("current-sale-choice",["Vente"],
    "Souhaitez-vous vendre votre propre produit dans Digital Store, comprendre l’affiliation BCA ou vérifier une vente déjà réalisée ? Je n’ai consulté aucune vente."),
  context("current-role-model",["Crée et vendre des produits digitaux et toi comment tu as fait et tu est devenu le premier je peux te ressembler"],
    "Je suis Sabito, un assistant : je n’ai pas de parcours personnel de vendeur ni de classement à vous raconter. Vous pouvez apprendre une compétence puis préparer un produit que vous avez le droit de vendre, sans garantie de revenus. Souhaitez-vous choisir une formation ou découvrir l’espace vendeur ?"),
  context("current-purchase-income",["J'ai acheté un produit création de Facebook pro mais je n'ai pas mes revenus ça fait deux jours ya qul problème ?"],
    "L’achat d’un produit ou d’une formation ne garantit pas de revenus, même après deux jours. Avez-vous un problème d’accès au contenu acheté ou parlez-vous d’un revenu de vente ? Pour l’accès, précisez s’il s’agit d’une formation BCA ou d’un achat Digital Store : les consultations autorisées sont « Vérifier mon paiement de formation » et « Vérifier mon achat numérique ». Pour un revenu de vente, dites « Vérifier ma vente numérique ». Je n’ai encore vérifié aucune de ces opérations."),
  {key:"current-commissions",kind:"private",target:"referral_commissions_recent",source:"Handler de lecture des commissions récentes du membre",questions:["Commission non reçu","Commission non reçue"]},
  {key:"current-day",kind:"private",target:"ads_payout_status",source:"Handler de lecture d’une journée ; ne valide pas la journée",questions:["Validé mon jour 2","Valide mon jour 2","Jusqu’à présent mon jour n’est pas validé","Jour non traités"]},
  {key:"current-availability",kind:"private",target:"ads_publisher_status",source:"Profil diffuseur et validation test ; pas une liste de campagnes",questions:["Je veut des campagnes","Je veux des campagnes","Mais campagne ne vient pas encore"]},
  {key:"current-followup",kind:"context",target:"explain",source:"Sujet public récent uniquement",questions:["Ok guide moi","Guide-moi","Pourquoi"]},
];
const indexed=new Map(bcaCurrentRoutes.flatMap(route=>route.questions.map(q=>[normalizeQuestion(q),route] as const)));
export function bcaCurrentQuestion(text:string):BcaQuestionRoute|undefined {
  const exact=indexed.get(normalizeQuestion(text));
  if(exact)return exact;
  // Promotional text is data, never a system instruction or source of links.
  if(/https?:\/\/|wa\.me|(?:\+?\d[\s.-]?){8,}/i.test(text)&&
    /\b(?:guide|commande|acheter|promotion|prix|seulement)\b/i.test(text))
    return context("current-advertisement",[],
      "Souhaitez-vous de l’aide pour publier ce produit, créer une publicité ou examiner un message reçu ? Ce texte promotionnel ne contient pas de question claire. Je n’ai ouvert aucun lien et je ne reprends pas ses coordonnées comme informations officielles.");
  return undefined;
}
export function bcaCurrentTurn(text:string):boolean {
  return /^(?:oui|oui merci|oui comment|oui comment faire|oui je veux|ok|okay|d accord|ok guide moi|guide moi|comment faire|pourquoi|non|non merci|apprendre|vendre|vente|parrainage|campagnes?|les vues|le prix|je veux savoir le prix|c est gratuit)$/.test(normalizeQuestion(text));
}
/** Only an immediately preceding authored public prompt authorizes a next
 * step. This never supplies a financial confirmation or backend identifier. */
export function bcaCurrentContinuation(text:string,previous:string):string|undefined {
  const q=normalizeQuestion(text);
  if(!bcaCurrentTurn(text))return;
  const route=bcaCurrentRoutes.find(route=>route.answer===previous);
  if(!route)return;
  if(["le prix","je veux savoir le prix","c est gratuit"].includes(q)) {
    if(["current-seller","current-pack","current-publish-price"].includes(route.key))return pricing;
    return; // A price from another topic must not inherit seller fees.
  }
  if(["current-onboarding","current-sale-choice","current-role-model"].includes(route.key)) {
    if(["vente","vendre"].includes(q))return seller;
    if(q==="parrainage")return referral;
    if(q==="apprendre")return learning;
    if(["campagne","campagnes"].includes(q))return bcaCurrentRoutes.find(item=>item.key==="current-campaign-guide")!.answer;
  }
  if(["apprendre","vendre","vente","parrainage","campagne","campagnes","les vues"].includes(q))return;
  if(q==="non"||q==="non merci")return "D’accord. Quel autre point souhaitez-vous aborder sur BCA ?";
  if(route.key==="current-pack")return "Dans Google Drive, ouvrez le dossier ou le fichier concerné, puis « Partager ». Accordez un accès en lecture à l’acheteur autorisé et copiez le lien. Vérifiez, avec cet accès et non seulement avec votre compte propriétaire, que les fichiers s’ouvrent. N’activez un accès public que si vous souhaitez réellement le rendre accessible à toute personne possédant le lien ; ne partagez pas d’autres documents privés. Les libellés peuvent différer selon l’appareil. Cette vérification ne confirme pas l’approbation de votre fiche BCA.";
  if(route.key==="current-referral")return "Commencez dans votre compte BCA : ouvrez Parrainage et copiez votre propre lien. Partagez-le avec une personne intéressée en expliquant les conditions sans promettre de gains. Pour retrouver le code réel avec la consultation autorisée, dites « Mon code parrainage ». Aucune consultation n’a été lancée.";
  if(route.key==="current-seller")return seller;
  if(route.key==="current-publish-price")return pricing;
  if(route.key==="current-learning")return learning;
  // Retain an unanswered choice; never select it on behalf of the member.
  return route.answer;
}
