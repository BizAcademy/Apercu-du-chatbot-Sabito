import type { BcaGuide } from "./bca-guide-data";
import { normalizeQuestion } from "./question-normalization";
import { bcaOwnerCorrections } from "./bca-owner-answers";
import { bcaNovemberAliases,bcaNovemberRoute } from "./bca-november-questions";

/** Additional formulations from the owner's second unanswered-question export.
 * Only aliases of established public help: never identifiers or personal results.
 */
export const bcaQuestionAliases:{key:string;questions:string[]}[]=[
  ...bcaNovemberAliases,
  {key:"member-bca-overview",questions:["Ok donne moi les informations de la bca","Je suis nouveau comment travaille sur le site","Qu es se que la BCA","Bca signifie","Comment ça fonctionne le BCA","J'ai besoin de travailler sur la BCA mais je ne sais point"]},
  {key:"member-income",questions:["Je suis nouveau dans l'application comment je fais pour avoir de l'argent","Je veux gagner plus sur BCA","Comment gagner réellement de l'argent avec la BCA","Comment faire pour gagner","Oui, j'aimerais que vous m'aidiez à trouver une solution pour savoir comment commencer à gagner de l'argent avec l'application BCA. Je suis un nouveau membre et j'aimerais connaître les étapes à suivre pour gagner de l'argent. Merci pour votre aide.","Alors, comment puis-je faire pour commencer à gagner de l'argent avec cette application ?","Bonjour à tous, j'espère que vous allez bien !\n\nJ'aimerais vous poser une question, s'il vous plaît. Comment puis-je commencer à gagner de l'argent avec l'application BCA ? Je suis un nouveau membre et je ne connais pas encore bien le fonctionnement de l'application.\n\nSi quelqu'un peut m'expliquer les étapes à suivre pour commencer à gagner de l'argent, je lui en serais très reconnaissant.\n\nMerci beaucoup pour votre aide !","Comment gagner un maximum d’argent avec la BCA?"]},
  {key:"member-campaign-availability",questions:["Pourquoi je vois pas les campagnes ces derniers temps ?","Pourquoi ne reçois-je pas de tâche à accomplir ?","Why am I not receiving task to perform","Pour je n'ai plus de compagne","Pourquoi je n'avais pas encore reçu de compagne depuis 3j","Je suis nouveau dans BCA j'ai passer les tests maintenant je pas eu de campagne Comment faire","Je n'ai plus de campagne depuis des jours"]},
  {key:"23",questions:["Je ne sais pas comment vendre les articles","Revente des produits digitaux","Oui comment faire pour vendre des produits","Comment se passe la vente des produits digitaux sur la BCA"]},
  {key:"28",questions:["J'aimerai savoir ce qu'il faut exactement pour valider la période test","Comment valider un son test","Le test","La campagne test"]},
  {key:"26",questions:["Faire des campagnes publicitaires pour vendre mes produits"]},
  {key:"07",questions:["Comment modifier son code pin","Comment obtenir mon pin"]},
  {key:"18",questions:["Je veux savoir si c'est possible de connaître qui sont mes filleuls"]},
  {key:"20",questions:["Concernant la formation en création de contenu"]},
];

export const bcaLegacyQuestionFaq:BcaGuide[]=[
  {key:"questions-contact-visibility",title:"Les contacts téléchargés verront-ils automatiquement mon statut WhatsApp ?",
    variants:["Comment faire pour que les contacts télécharge voyent mon statut ?"],
    content:"Télécharger un fichier de contacts ne garantit pas que les autres personnes verront votre statut.\n1. Ouvrez Contacts dans BCA et utilisez l’export officiel disponible pour votre compte.\n2. Importez le fichier VCF dans l’application Contacts de votre téléphone selon ses instructions.\n3. Vérifiez les autorisations de Contacts de WhatsApp et vos paramètres de confidentialité des statuts.\n4. Vérifiez que vous publiez auprès de l’audience souhaitée, sans exposer des coordonnées ni envoyer de messages non sollicités.\nL’export ne prouve pas que les autres membres ont enregistré votre numéro. Je ne peux pas vérifier leurs téléphones ou garantir des vues. Pour une campagne, suivez aussi le guide de publication et de vérification BCA : présence dans les contacts, vues WhatsApp et vues validées sont différentes.",
    followUpKeys:["19","member-whatsapp-views","30"]},
  {key:"questions-whatsapp-copy",title:"Le bouton de partage WhatsApp affiche seulement « copié » : que faire ?",
    variants:["Quand j’essaye de faire ma campagne test et j’appuie sur partager sur statut sur WhatsApp. Le truc vient et ça écrit copie copier copier pourquoi je ne sais pas pourquoi ça ne passe pas chez moi"],
    content:"Le message « copié » n’est pas une confirmation que votre statut a été publié. Je n’ai pas accès à votre écran et ne peux pas confirmer la cause du problème.\n1. Retournez dans la journée de campagne et consultez le contenu et le lien officiels à partager.\n2. Si le bouton copie un texte ou un lien, ouvrez WhatsApp pour préparer votre statut avec les éléments demandés et vérifiez le contenu avant publication. Si une image ou une vidéo est demandée, un lien copié seul ne remplace pas ce média.\n3. Vérifiez sur WhatsApp que le statut a bien été publié.\n4. Revenez dans BCA pour déclarer la publication et effectuer la vérification demandée, dans le délai affiché.\nSi WhatsApp ne s’ouvre pas ou si le média manque, précisez votre appareil, votre navigateur et le message affiché au support officiel. Ne publiez pas plusieurs fois uniquement parce que le bouton indique « copié » et ne transmettez aucun code de connexion.",
    followUpKeys:["28","30","member-whatsapp-views"]},
  {key:"questions-views-and-credit",title:"Pourquoi les vues de statut et les fonds crédités BCA ne correspondent-ils pas ?",
    variants:["J'ai 123vue Au total Mon soldes est 73f pourquoi","Les fonds sont versés quand dans le compte. Le fond des status"],
    content:"Le nombre de vues affiché sur WhatsApp n’est pas nécessairement le nombre de vues validées et rémunérables par BCA. Je n’ai pas consulté votre compte : vos chiffres seuls ne permettent pas de confirmer un manque de paiement ni un taux de rémunération.\n1. Ouvrez la campagne et la journée concernées.\n2. Vérifiez s’il s’agit d’un test ou d’une campagne rémunérée : le test n’est pas rémunéré.\n3. Consultez l’état de la publication, de la preuve et de la validation, puis les vues retenues selon les règles affichées.\n4. Comparez avec les écritures effectivement créditées dans votre historique, en vérifiant la devise et les références.\nUne publication, un nombre déclaré ou une preuve envoyée ne prouve pas qu’un crédit a eu lieu. Je ne peux pas promettre une heure de versement, multiplier toutes les vues par un tarif supposé ni calculer votre solde à partir de ce message. Si une journée validée ne correspond pas à l’historique, demandez une vérification autorisée au support avec la campagne et la journée, sans PIN ni mot de passe.",
    followUpKeys:["29","30","member-whatsapp-views"]},
];

export const bcaQuestionFaq:BcaGuide[]=bcaLegacyQuestionFaq.map(guide=>({
  ...guide,content:bcaOwnerCorrections[guide.key]??guide.content,
}));

export type BcaFollowupKind="explain"|"detail"|"link"|"blocked"|"profile"|"publish"|"started"|
  "campaign"|"activities"|"sell-learn"|"withdrawal"|"validation"|"identity"|"exit"|
  "incomplete"|"year"|"duration"|"roles"|"referral-contact"|"premium-stage"|"best-income"|"unclear-product"|"shop"|
  "status-choice"|"money-choice"|"ads-budget"|"ads-rate"|"ads-location"|"not-yet"|"november"|
  "option"|"which"|"device";
const turns:[BcaFollowupKind,string[]][]=[
  ["explain",["Comment ça fonctionne ?","Comment faire","Explication claire","aide moi","Aidez-moi à niveau","Alors, aidez-moi, s'il vous plaît.",
    "Aidez moi à nouveau","Aidez moi à nouveau dans bca","Répondez"]],
  ["detail",["Je veux connaître plus"]],
  ["link",["Okay envoie moi ça comme un lien","Comment l'envoyer au personne"]],
  ["blocked",["Ce qui bloque ?","Vous n'avez pas pu répondre","Bonjour, j'ai fait mon dépôt mais ça ne marche pas. Comment faire ?"]],
  ["profile",["Oui est l'option profil"]],
  ["publish",["Okay c'est sur quel plateforme je dois poste les photos et vidéos"]],
  ["started",["Okay, j'ai mon espace déjà"]],
  ["campaign",["Campagne","Et concernant les campagnes"]],
  ["status-choice",["Commet je veut verfier me statut","Comment je veux vérifier mon statut"]],
  ["money-choice",["comment avoir l’argent sur BCA"]],
  ["ads-budget",["pourquoi on peut payer des campagnes publicitaires, même si le virement était atteint, mais c’est grâce à nous que les vieux ont été atteints, on ne paye pas pour ça"]],
  ["ads-rate",["Comment faire monter le prix à 1.80","Comment faire monter le prix à 1,80"]],
  ["ads-location",["on retrouve la BCA ads network où"]],
  ["not-yet",["Par encore","Pas encore"]],
  ["activities",["Les activités"]],
  ["sell-learn",["Appendice des compétences et vendre des formations"]],
  ["shop",["Je veux une boutique en ligne"]],
  ["withdrawal",["Le retrait"]],
  ["validation",["Comment valider la campagne","je ne sais pas faire la publication des des affiches je n'ai pas encore atteint l'objectif pour pouvoir bénéficier de la plateforme donc aidez moi à accomplir l'objectif"]],
  ["identity",["Tu est la pourquoi","Tu es qui"]],
  ["exit",["Quitter le site"]],
  ["incomplete",["Qu es ce qui","Ohr","De","J'ai une question","Mon argent dois e123f"]],
  ["year",["En quel année BCA à été fondé ?"]],
  ["duration",["La BCA va durer pour combien de temps ?"]],
  ["roles",["Est-ce que l'on peut devenir annonceur et diffuseurs as même ?"]],
  ["referral-contact",["Bonjour est ce que je peux contacter mes filleuls et comment ?"]],
  ["premium-stage",["Je suis arrivé au compagne 3 abonnement premium"]],
  ["best-income",["Qu'es ce qui rapporte plus de l'argent dans la BCA ?"]],
  ["unclear-product",["À part les produits de vital quelle activité je peux m'aider à trouver de l'argent sur"]],
];
export function bcaFollowupKind(text:string) {
  const batch=bcaNovemberRoute(text);
  if(batch?.kind==="private")return "november";
  if(batch?.kind==="context") {
    if(batch.answer)return "november";
    return batch.target as BcaFollowupKind;
  }
  const value=normalizeQuestion(text);
  if(/^option [1-3]$/.test(value))return "option";
  if(/^(?:lequel|laquelle)$/.test(value))return "which";
  if(/^(?:sur android|android)$/.test(value))return "device";
  return turns.find(([,questions])=>questions.some(question=>normalizeQuestion(question)===value))?.[0];
}
export function bcaQuestionAlias(text:string) {
  const value=normalizeQuestion(text);
  return bcaQuestionAliases.find(group=>group.questions.some(question=>normalizeQuestion(question)===value));
}
