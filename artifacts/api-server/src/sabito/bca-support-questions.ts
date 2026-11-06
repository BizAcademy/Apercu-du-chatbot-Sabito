import type { BcaGuide } from "./bca-guide-data";
import { bcaCommissionGuidance } from "./bca-commission-policy";

/** Owner's latest unanswered-question export. Public guidance deliberately does
 * not turn an archived default, a catalogue, or a user's claim into live data. */
export const bcaSupportFaq:BcaGuide[]=[
  {key:"support-netflix",title:"BCA fournit-il un compte Netflix gratuit ?",
    variants:["Je veux avoir un compte Netflix gratuit","Avoir Netflix gratuitement sur BCA"],
    content:"BCA ne fournit pas de compte Netflix gratuit. Je ne peux ni fournir un compte ni contourner un abonnement. Vous pouvez consulter les formations et services légalement disponibles dans votre espace BCA.",
    followUpKeys:["20"]},
  {key:"support-delivery",title:"Comment livrer le contenu de ma formation dans Digital Store ?",
    variants:["Quels liens utiliser pour livrer une formation vendue sur BCA ?"],
    content:"Le lien de livraison doit permettre à l’acheteur d’accéder au contenu après son achat. Utilisez un lien Google Drive accessible à l’acheteur, sans lui demander un accès supplémentaire. Les liens YouTube, Facebook, WhatsApp, TikTok et autres réseaux sociaux ne conviennent pas comme liens de livraison de formation. Si vous utilisez Chariow ou Maketou, le produit sur cette plateforme doit être gratuit pour éviter un second paiement. Publiez uniquement du contenu que vous avez le droit de vendre. Les frais éventuels sont ceux affichés dans votre espace actuel ; je n’effectue aucun prélèvement.",
    followUpKeys:["23"]},
  {key:"support-publish",title:"Dois-je passer par vendeur digital pour publier un contenu ?",
    variants:["Oui si je veux publier un contenu,est ce que forcé il faut que j'amène ça dans vendeur digital?",
      "Faut-il passer par vendeur digital pour publier ?"],
    content:"Cela dépend du contenu. Pour vendre un produit numérique, utilisez l’espace vendeur de Digital Store. Pour créer une publicité, suivez le parcours annonceur BCA Ads ; pour diffuser une campagne, suivez le parcours diffuseur et publiez les éléments demandés sur votre statut WhatsApp. Souhaitez-vous vendre un produit, créer une annonce ou diffuser une campagne ?",
    followUpKeys:["23","26","27"]},
  {key:"support-catalogue",title:"Quelles compétences et quels produits puis-je trouver sur BCA ?",
    variants:["Quelles sont les compétences","Je veux apprendre une compétence",
      "Non, j'ai besoin de savoir si à la BCA on vend uniquement les formations (vidéo) ou aussi les formats PDF",
      "Quelles sont les produits digitaux vendables sur la BCA ?"],
    content:"Pour apprendre, consultez la liste actuelle des formations et choisissez le sujet qui vous intéresse. Les sources BCA distinguent les catalogues Formations, Ebooks et Digital Store : cela ne signifie pas que tous les formats sont acceptés pour chaque produit vendeur. Je n’ai pas encore consulté le catalogue actuel et ne peux pas citer des offres comme disponibles. Quel domaine souhaitez-vous apprendre, ou quel contenu souhaitez-vous vendre ? Un membre connecté peut demander « Consulter le catalogue actuel ». Pour une règle de format absente de votre espace vendeur, contactez https://bcachat.bizconnectacademy.com ; ne payez pas pour publier avant de l’avoir vérifiée.",
    followUpKeys:["20","23","support-delivery"]},
  {key:"support-referrals",title:"Comment découvrir le parrainage et recommander BCA ?",
    variants:["Je veux découvrir les parrainages",
      "Je veux découvrir le parrainage parce que depuis des mois j'arrive même pas a gagner 100f dans bca je suis totalement dessus",
      "Parrainage"],
    content:"Le parrainage consiste à recommander BCA avec votre propre code ou lien. Vous pouvez présenter BCA ainsi : « BCA propose des formations, un espace de produits numériques et des activités publicitaires selon leurs conditions. Consultez les offres et règles dans votre espace. Aucun revenu n’est garanti. » Retrouvez votre lien dans votre compte ; pour que Sabito consulte votre code réel, demandez « Mon code parrainage » après connexion. Vos filleuls et les commissions enregistrées se consultent dans le menu « Mes gains », aux niveaux 1, 2 et 3. Une inscription ou une recommandation ne prouve pas une commission due ou versée. Si vous attendiez une commission, dites « Parrainage non reçu » pour une consultation autorisée.",
    followUpKeys:["18","owner-commissions-help"]},
];

export const bcaSupportAliases:{key:string;questions:string[]}[]=[
  {key:"member-bca-overview",questions:["comment ca fonctione"]},
  {key:"23",questions:["Vendre de formation"]},
  {key:"owner-income-paths",questions:[
    "Le moyens  le plus simple er facile de ce faire beaucoup de revenu avec bca"]},
];

export const bcaSupportTemplates=[
  {operation:"digital_product_review",name:"Statut et motif de modération de mon produit",
    triggers:["Pourquoi je Mets produit en ligne toujours en cours",
      "Pour mon cas, j'avais lancé mon produit digital sur cette plateforme et ça été rejeté... Mais j'ignore la vraie raison.",
      "vérifier le statut de mon produit","pourquoi mon produit a été rejeté"],
    field:["product_reference","Quel est l’identifiant numérique du produit dans votre espace vendeur ?"] as [string,string]},
  {operation:"referral_commissions_recent",name:"Mes commissions de parrainage récentes",
    triggers:["Parrainage non reçu","consulter mes commissions récentes"]},
  {operation:"ads_publisher_status",name:"Mon profil diffuseur et ma validation de campagne test",
    triggers:["Ce qui bloque est que après avoir validé la campagne text, rien ne vient plus de nouveau pour que je continue le travail",
      "Mais j'ai validé déjà la campagne text","vérifier ma validation de campagne test","vérifier mon profil diffuseur"]},
  {operation:"bca_catalogue_current",name:"Catalogue BCA actuel",
    triggers:["Consulter le catalogue actuel","voir les formations et ebooks actuels"]},
];

export function bcaSupportResultGuidance(operation:string,data:Record<string,unknown>) {
  if(operation==="referral_commission_status")return bcaCommissionGuidance(operation,data);
  if(operation==="ads_payout_status") {
    if(data.statut_diffusion==="pending_admin_validation")return "\n\nCette journée attend la validation administrative. Ne recommencez pas une publication déjà déclarée uniquement pour débloquer l’écran ; une preuve envoyée ne confirme pas encore un paiement.";
    if(data.statut_diffusion==="paid")return "\n\nLe backend indique une journée payée. Comparez le montant et la devise réellement renvoyés avec l’écriture de votre historique ; je ne calcule pas le crédit à partir des vues WhatsApp déclarées dans le chat.";
    if(data.statut_diffusion==="expired")return "\n\nLe backend indique une journée expirée. Cela ne prouve pas qu’elle devait durer exactement 23 heures. Demandez au support de comparer l’échéance enregistrée et le fuseau horaire ; je ne relance pas la journée.";
    return "\n\nFiez-vous au statut de cette journée et aux écritures réellement enregistrées. Le simple fait de publier un statut ou d’atteindre 23 heures ne confirme ni validation ni paiement. Si une étape est déjà validée, ne la recommencez pas sans consigne du support.";
  }
  if(operation==="digital_product_review") {
    if(data.statut==="pending")return "\n\nLe produit est en attente de modération. Aucun délai d’approbation n’est confirmé.";
    if(data.statut==="rejected")return typeof data.motif==="string"&&data.motif.trim()
      ?"\n\nLe motif ci-dessus est celui enregistré pour votre produit. Corrigez les points indiqués dans votre espace vendeur ; je n’ai pas modifié le produit."
      :"\n\nAucun motif de rejet n’a été fourni par BCA. Je ne peux pas l’inventer. Contactez https://bcachat.bizconnectacademy.com avec la référence de votre produit.";
  }
  if(operation==="referral_commissions_recent")return "\n\nIl s’agit des commissions récentes renvoyées par BCA, pas d’un total par niveau ni d’une preuve qu’une nouvelle commission est due. Si une commission attendue n’y figure pas, contactez https://bcachat.bizconnectacademy.com en précisant l’opération concernée, sans PIN ni mot de passe."+bcaCommissionGuidance(operation,data);
  if(operation==="ads_publisher_status")return "\n\nLa validation de la campagne test et les campagnes payantes disponibles sont distinctes. Cette lecture du profil ne prouve pas qu’une campagne correspond à votre ciblage ni qu’une nouvelle campagne est disponible. Consultez les campagnes proposées dans votre espace diffuseur. Le taux configuré ci-dessus n’est pas un tarif que vous pouvez augmenter vous-même ; les conditions de la campagne courante prévalent.";
  if(operation==="bca_catalogue_current")return "\n\nLa liste renvoyée est limitée aux offres publiées lors de cette consultation. Leur existence ne confirme ni un accès gratuit ni les formats autorisés pour une nouvelle vente. Ouvrez la fiche actuelle de l’offre pour ses conditions.";
  return "";
}
