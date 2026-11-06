import { normalizeQuestion } from "./question-normalization";
import { bcaOwnerClarifications,bcaOwnerClarificationAliases,bcaTrainingTopic,bcaTrainingQuestion,bcaTrainingMatches } from "./bca-owner-clarifications";

/** Exact formulations from the 62-row November export. No live BCA value is
 * embedded here. Public aliases only reuse an existing approved reference.
 * Context replies ask for scope; private routes reuse enabled read-only intents. */
type Route = {
  key:string;
  kind:"public"|"context"|"private";
  target:string;
  source:string;
  questions:string[];
  answer?:string;
};
const support="https://bcachat.bizconnectacademy.com";
const originalRoutes:Route[]=[
  {key:"promo",kind:"context",target:"promo-choice",source:"Clarification ; promotions à confirmer dans le catalogue actif",questions:[
    "Je veux mon code promo"],
    answer:"Parlez-vous d’un code de réduction pour une formation ou un ebook, ou de votre code de parrainage BCA ? Je ne dispose pas d’un code de réduction général confirmé. Pour consulter votre propre code de parrainage, dites « Mon code parrainage » depuis votre compte connecté. Ne transmettez aucun code de connexion."},
  {key:"sell",kind:"public",target:"23",source:"Guide approuvé ; règles de livraison du propriétaire",questions:[
    "vendre mon formation","Ou est l’espace vendeur",
    "Comment mettre un produit digital en vente sur la plate-forme","Non cmt je peux crée ma propre formation dans BCA ?",
    "Comment crée une formation dans BCA"]},
  {key:"resell",kind:"public",target:"support-delivery",source:"Règles approuvées du propriétaire ; droits de commercialisation requis",questions:[
    "Comment revendre les produits digitaux dans BCA"]},
  {key:"refund",kind:"context",target:"registration-refund",source:"Examen du support ; aucune acceptation de remboursement confirmée",questions:[
    "Remettez l'argent avec lequel je me suis inscrit","Remettez moi mon argent"],
    answer:`Parlez-vous du paiement d’inscription ou d’activation, d’un achat, d’un dépôt ou d’un retrait ? Je ne peux ni rembourser ni confirmer qu’un remboursement est accepté. Pour un paiement d’activation, vous pouvez demander « Vérifier mon activation » depuis votre compte connecté, avec la référence non confidentielle du paiement. Une consultation de statut ne vaut pas accord de remboursement. Pour faire examiner la demande, contactez ${support}. N’effectuez pas un nouveau paiement pour demander le remboursement et n’envoyez ni PIN ni code reçu par e-mail.`},
  {key:"status-income",kind:"public",target:"faq-status-publish",source:"Guide approuvé ; gains et tarif réels à vérifier par le backend",questions:[
    "Comment avoir des revenus grâce aux statuts whatsapp","Comment gagner avec les statuts ?"]},
  {key:"income",kind:"public",target:"member-income",source:"Orientation approuvée ; aucune garantie de revenu",questions:[
    "Comment faire pour gagner des argent","Je cherche Largent trop","Aide moi à gagner de  l'argent"]},
  {key:"passive",kind:"context",target:"income-choice",source:"Prudence financière ; aucune promesse de revenu",questions:[
    "Comment gagner 2000fr par jour sans rien faire sur BCA?"],
    answer:"Je ne peux pas vous promettre 2 000 F par jour ni un revenu sans rien faire sur BCA. Les ventes, le parrainage et les campagnes ont des conditions et nécessitent une activité réelle ; les gains publicitaires dépendent des vues validées et du tarif actuel. BCA n’est pas une plateforme d’investissement ou de jeux d’argent. Souhaitez-vous apprendre une compétence, vendre un produit, recommander BCA ou comprendre les campagnes WhatsApp ?"},
  {key:"member-location",kind:"context",target:"member-location",source:"Orientation ; position exacte du menu frontend à confirmer",questions:[
    "Non, ou se trouve espace membre"],
    answer:"L’espace membre est le tableau de bord auquel vous accédez après connexion à BCA, pas un autre compte à créer dans Sabito. Si vous êtes déjà connecté, indiquez les rubriques visibles ou l’écran sur lequel vous êtes bloqué. Je pourrai vous orienter sans inventer un bouton absent de votre version. Ne transmettez pas votre mot de passe."},
  {key:"referral",kind:"public",target:"support-referrals",source:"Réponse approuvée et indications du propriétaire",questions:[
    "Comment ouvrir parrainage","Comment faire le parrainage","C'est comment les parrainage ?","Parrainage"]},
  {key:"capabilities",kind:"context",target:"identity",source:"Capacités réelles de Sabito ; limites des consultations privées",questions:[
    "Les questions possibles que peut répondre?","Quelles sont les questions que je peux te poser ?","Tu es nouveau ?",
    "Pourquoi vous êtes là non pour aider les gens"],
    answer:"Je suis Sabito, l’assistant de service client BCA. Vous pouvez me demander comment utiliser les formations, Digital Store, le parrainage ou les campagnes WhatsApp, et m’indiquer une étape qui vous bloque. Les vérifications personnelles nécessitent une session membre reconnue et un service backend autorisé réellement disponible. Je ne réalise aucun paiement et ne demande jamais de mot de passe, PIN, OTP ou jeton. Quelle est votre question ?"},
  {key:"news",kind:"context",target:"current-news",source:"Annonce officielle actuelle nécessaire ; non fournie par l’archive",questions:[
    "la nouvelle du mois Novembre 2026 a part Sabito?"],
    answer:`Je ne dispose pas d’une source d’annonces BCA actualisée me permettant de confirmer les nouveautés de novembre 2026. L’ancien code ne suffit pas pour les établir. Consultez les annonces officielles de votre espace ou demandez les nouveautés à l’équipe sur ${support}.`},
  {key:"telegram",kind:"context",target:"telegram-scope",source:"Clarification ; aide officielle Telegram",questions:[
    "Les étapes pour ouvrir le Télégramme sans payé les 1$"],
    answer:"Parlez-vous de la création d’un compte Telegram, d’un abonnement ou de l’accès à un groupe ? Indiquez le texte du paiement affiché et l’endroit où il apparaît, sans code de connexion. Je ne peux pas vous donner une méthode pour contourner un paiement officiel. Vérifiez l’application officielle et son aide : https://telegram.org/faq"},
  {key:"recipient",kind:"context",target:"link",source:"Suivi de la référence publique précédente uniquement",questions:[
    "Je vais envoyer ça à qui ?"]},
  {key:"forgotten-code",kind:"context",target:"forgotten-code",source:"Clarification ; procédure de réinitialisation à valider depuis les sources",questions:[
    "J'ai oublié mon code de configuration comment faire ?"],
    answer:"Parlez-vous du PIN utilisé pour valider vos transactions, du mot de passe de connexion ou d’un code de parrainage ? Si c’est votre PIN, cherchez l’option de réinitialisation dans Profil et suivez uniquement la procédure sécurisée proposée dans BCA. Ne m’envoyez ni votre ancien PIN, ni le code reçu par e-mail, ni votre mot de passe. Si cette option est absente, contactez le support officiel."},
  {key:"onboarding",kind:"public",target:"member-bca-overview",source:"Guide d’accueil approuvé",questions:[
    "Je. Viens de m'inscrire sur BCA mais je n'arrive pas comment ça fonctionne vraiment j'ai besoin d'une personne qui va me guider"]},
  {key:"advertiser",kind:"public",target:"26",source:"Guide annonceur approuvé ; frais et formulaires actuels font foi",questions:[
    "Comment crée les campagnes","Salut. Je veux être annonceur"]},
  {key:"catalogue",kind:"private",target:"bca_catalogue_current",source:"Lecture du catalogue publié par le handler existant ; pas de liste figée",questions:[
    "Quel sont les 16 formations"]},
  {key:"availability",kind:"private",target:"ads_publisher_status",source:"Profil et test authentifiés ; ne prouve pas la disponibilité d’offres",questions:[
    "Je ne resoipa dans campage","Pour mettre statue sont indisponibles","Pourquoi mes campagne sont indisponibles",
    "Pourquoi j'ai plus de pub à faire"]},
  {key:"withdraw",kind:"context",target:"withdrawal",source:"Clarification entre guide public et statut privé ; aucune transaction créée",questions:[
    "Retirer mon argent"]},
  {key:"learn",kind:"public",target:"support-catalogue",source:"Guide approuvé ; recommandations soumises au catalogue actuel",questions:[
    "Apprendre moi","Apprendre une conpetense"]},
  {key:"incomplete",kind:"context",target:"incomplete",source:"Clarification ; aucun fait supposé",questions:[
    "J'ai un Petit soucis","Il  n'est pas en ligne comment dois-je faire","J'ai un problème concernant mon espace annonceurs"],
    answer:"Quelle rubrique utilisez-vous et quelle action ne fonctionne pas ? Indiquez le message affiché et, pour BCA Ads, si vous êtes annonceur ou diffuseur. Je n’ai pas consulté votre dossier et ne peux pas attribuer une cause sans ces précisions. Ne transmettez aucun PIN, mot de passe ou code de connexion."},
  {key:"sell-referral",kind:"context",target:"sell-referral",source:"Choix entre deux parcours approuvés",questions:[
    "Vente digitale et parrainage"],
    answer:"La vente digitale et le parrainage sont deux parcours différents. Dans Digital Store, vous vendez un contenu que vous avez créé ou que vous avez le droit de revendre. Le parrainage consiste à recommander BCA avec votre propre lien, selon les conditions applicables. Une vente par un filleul ne prouve pas qu’une commission vous est due. Souhaitez-vous les étapes de vente, celles du parrainage ou les deux ?"},
  {key:"expiry",kind:"context",target:"campaign-expiry",source:"Donnée dynamique expires_at et statut ; ancien code non probant",questions:[
    "Pour quoi mes campagne expiré avant 23h"],
    answer:"S’agit-il d’une campagne test ou rémunérée, et êtes-vous annonceur ou diffuseur ? Indiquez la référence non confidentielle de la campagne, l’échéance affichée et votre fuseau horaire. Je ne peux pas conclure qu’une campagne doit durer exactement 23 heures : il faut comparer son statut et son échéance enregistrée. Demandez « Vérifier ma campagne BCA Ads » pour une lecture autorisée depuis votre compte ; je ne relance aucune campagne. Si le résultat ne précise pas l’échéance, le support doit l’examiner."},
  {key:"strategy",kind:"context",target:"referral-strategy",source:"Conseils généraux ; aucune garantie de commission",questions:[
    "Tu peux me donner des stratégies pour pour côté affiliation"],
    answer:"Commencez par comprendre une offre BCA que vous pouvez expliquer honnêtement. Présentez à une audience intéressée son utilité, ses conditions et ses limites, puis partagez votre propre lien de parrainage avec son accord. Évitez les messages non sollicités et les promesses de gains. Suivez les résultats réellement enregistrés dans votre espace, puis adaptez vos explications. Souhaitez-vous d’abord retrouver votre lien ou préparer une présentation de BCA ?"},
  {key:"referral-sale",kind:"context",target:"referral-sale",source:"Règle de commission sur vente à confirmer ; aucune commission déduite",questions:[
    "Si je parraine quelqu'un si la personne commence à vendre je gagne l'argent sur lui non"],
    answer:`Le fait qu’un filleul vende un produit ne suffit pas pour confirmer qu’une commission vous est due. Il faut une règle actuelle couvrant cette vente et une écriture enregistrée pour votre compte. Je n’ai pas confirmé cette règle pour votre cas. Vous pouvez demander « Consulter mes commissions récentes » depuis votre compte connecté ; cette lecture ne prouve pas qu’une nouvelle commission sera créée. Pour les conditions de commission sur vente, contactez ${support}.`},
  {key:"repeat",kind:"context",target:"explain",source:"Reprise du sujet public précédent sans changer de FAQ",questions:[
    "Répondez à ma question svp"]},
  {key:"day-progress",kind:"private",target:"ads_payout_status",source:"Statut de la diffusion/journée du membre authentifié",questions:[
    "J'ai posté sur mon statut et je suis a mes 23h donc j'aimerais continuer et d'y aller voir le nombre de vues ....",
    "J'ai atteint les 23h pour la campagne test mais ils n'affichent pas start day",
    "Le problème c'est quand je poste vos statuts BCA sur mon compte WhatsApp, je suis pas payer",
    "Jour non traités","Jusqu'a present mon jour n’est pas validé"]},
  {key:"alternative",kind:"context",target:"detail",source:"Suivi du sujet public précédent ; sinon clarification",questions:["Alternative"]},
  {key:"sell-choice",kind:"context",target:"sell-learn",source:"Clarification apprendre/vendre sans supposer un produit",questions:["Vendre"]},
  {key:"publish-block",kind:"public",target:"member-whatsapp-views",source:"Guide approuvé ; aucune cause ou validation supposée",questions:[
    "Je n'arrive plus à posté de vue sur WhatsApp"]},
  {key:"greeting",kind:"context",target:"greeting",source:"Salutation ; aucune FAQ financière",questions:["Cc"],
    answer:"Bonjour ! Je suis Sabito. Que souhaitez-vous savoir sur BCA, ou quelle étape vous bloque ?"},
  {key:"budget",kind:"context",target:"ads-budget",source:"Budget minimum et tarif actuels requis ; aucun montant figé",questions:[
    "La campagne avec photo vaut 1000 XAF !?"],
    answer:"Parlez-vous du budget à payer comme annonceur pour une campagne avec photo, ou du gain d’un diffuseur ? Je n’ai pas consulté la configuration active et ne peux pas confirmer 1 000 XAF. Vérifiez le minimum et le total dans le formulaire actuel avant tout paiement. Pour une campagne existante, demandez « Vérifier ma campagne BCA Ads » depuis votre compte connecté. Le budget annonceur et la rémunération des vues validées sont différents ; je ne crée ni ne finance de campagne."},
  {key:"campaign",kind:"context",target:"campaign",source:"Clarification du rôle et du parcours",questions:["Campagne","Mon annonce"]},
  {key:"merch",kind:"context",target:"official-images",source:"Ressource officielle à confirmer ; aucune image inventée",questions:[
    "Envoie moi l'image des casquettes et pilover de BCA"],
    answer:`Je ne dispose pas d’une image officielle confirmée des casquettes ou pulls BCA. Je ne vais pas inventer un produit ou une photo. Consultez les ressources officielles de votre espace ou demandez l’image à l’équipe sur ${support}.`},
  {key:"contacts",kind:"context",target:"contacts-choice",source:"Clarification ; aucune liste administrative ou donnée tierce",questions:[
    "Les contacts"],
    answer:`Souhaitez-vous joindre le support BCA ou obtenir de l’aide sur la rubrique Contacts de votre espace ? Le support est accessible sur ${support}. Je ne consulte pas une liste administrative ni les coordonnées d’autres membres pour vous répondre.`},
  {key:"account",kind:"context",target:"account-scope",source:"Identité authentifiée obligatoire ; aucun handler général de création confirmé",questions:[
    "Mon comte et bien crée oubien il na pas bien crée"],
    answer:"Parlez-vous de la connexion à votre espace ou du paiement d’activation ? Je ne peux pas confirmer la création ou l’état d’un compte à partir de ce message. Une vérification personnelle doit utiliser votre session BCA reconnue, jamais un nom ou un identifiant écrit dans le chat. Si le paiement d’activation vous pose problème, demandez « Vérifier mon activation » depuis votre compte connecté. Sinon, indiquez le message affiché à la connexion, sans mot de passe ni code reçu."},
];

// Owner clarification supersedes only these shipped defaults. It does not
// overwrite any administrator-approved/custom knowledge document.
export const bcaNovemberRoutes:Route[]=originalRoutes.map(route=>bcaOwnerClarifications[route.key]
  ? {...route,kind:"context",answer:bcaOwnerClarifications[route.key],source:"Précisions explicites du propriétaire BCA ; règle publique, pas une consultation personnelle"}
  : route);
const byQuestion=new Map(bcaNovemberRoutes.flatMap(route=>
  [...route.questions,...(bcaOwnerClarificationAliases[route.key]??[])]
    .map(question=>[normalizeQuestion(question),route] as const)));
export function bcaNovemberRoute(text:string):Route|undefined {
  const exact=byQuestion.get(normalizeQuestion(text));
  if(exact)return exact;
  const topic=bcaTrainingTopic(text);
  if(topic)return {key:"training",kind:"context",target:"training-access",source:"Catalogue fourni par le propriétaire ; accès à préciser",
    questions:[],answer:bcaTrainingQuestion(topic)};
  const candidates=bcaTrainingMatches(text);
  return candidates.length>1?{key:"training-choice",kind:"context",target:"training-access",source:"Plusieurs formations correspondent au mot fourni",
    questions:[],answer:"Plusieurs formations BCA correspondent à ce sujet :\n"+candidates.map(item=>"• "+item.name).join("\n")+
      "\nDe quelle formation souhaitez-vous connaître le parcours d’accès ? Indiquez son nom."}:undefined;
}
export const bcaNovemberAliases=bcaNovemberRoutes.filter(route=>route.kind==="public")
  .map(route=>({key:route.target,questions:route.questions}));
export const bcaNovemberPrivateAliases=Object.fromEntries(
  [...new Set(bcaNovemberRoutes.filter(route=>route.kind==="private").map(route=>route.target))]
    .map(operation=>[operation,bcaNovemberRoutes.filter(route=>route.kind==="private"&&route.target===operation).flatMap(route=>route.questions)]));

/** Substantive new source-derived procedures remain reviewable, not published. */
export const bcaNovemberDrafts=[
  {key:"november-pin-reset",title:"Comment réinitialiser mon PIN de transaction BCA oublié ?",
    variants:["Réinitialiser le PIN BCA par e-mail"],
    content:bcaOwnerClarifications["forgotten-code"],
    source:"Copie Laravel : routes/api.php, /api/v2/profile/transaction-pin/reset/request et /reset. Présence actuelle dans le frontend à confirmer."},
];
