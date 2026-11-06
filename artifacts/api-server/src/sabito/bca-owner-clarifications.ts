import { normalizeQuestion } from "./question-normalization";

const support="https://bcachat.bizconnectacademy.com";
const presentation="https://presentationbizconnectacademy.com";

/** Public guidance explicitly supplied by the owner, not a live account result.
 * Keep advertiser costs separate from publisher pay and affiliation from Store sales. */
export const bcaOwnerClarifications:Record<string,string>={
  promo:"Je ne peux pas fournir de code promotionnel ni vous orienter vers une offre de paris sportifs. Si vous cherchez votre code de parrainage BCA, dites « Mon code parrainage » : ce code est différent d’un code promotionnel de bookmaker.",
  refund:`Selon les conditions communiquées par BCA, le paiement d’inscription à Biz Connect Academy n’est pas remboursable. Cette règle concerne l’inscription, pas automatiquement un achat, un dépôt ou un retrait. Souhaitez-vous en savoir plus ? Consultez la présentation et les conditions de la plateforme : ${presentation}. Pour être accompagné ou signaler une erreur de paiement, contactez le support : ${support}. Ne transmettez ni PIN ni code de connexion.`,
  "member-location":"Pour accéder à l’espace membre, connectez-vous à BCA, ouvrez votre Profil, puis accédez à votre espace membre depuis cette rubrique. Si vous ne trouvez pas l’accès dans votre version, indiquez les options visibles dans Profil, sans partager de donnée confidentielle.",
  news:"Selon les informations communiquées par l’équipe BCA pour novembre 2026, il n’y a pas d’autre nouveauté annoncée à part Sabito. L’équipe travaille activement sur de nouvelles fonctionnalités et formations. Aucune date de sortie n’est annoncée ici.",
  telegram:`BCA propose une formation sur une astuce d’inscription à Telegram. Connectez-vous à BCA → ouvrez la liste des formations → recherchez la formation consacrée à Telegram → ouvrez-la et suivez ses leçons, selon les conditions d’accès affichées. L’astuce décrite ne fonctionne pas pour tout le monde et ne garantit pas une inscription gratuite.\nPour l’inscription normale, utilisez l’application officielle Telegram, saisissez votre numéro avec l’indicatif de votre pays et suivez la vérification dans l’application. Si l’application officielle vous affiche des frais, vérifiez le montant, la devise et les conditions avant d’accepter : je ne confirme pas qu’un paiement de 1 $ est obligatoire pour tous les utilisateurs en Afrique. Si Visa est proposé par le parcours officiel, utilisez une carte autorisée aux paiements en ligne et suivez les étapes de votre banque ; ne saisissez votre carte que dans ce parcours, jamais dans Sabito ni chez un intermédiaire. Ne communiquez aucun code de connexion. Aide officielle : https://telegram.org/faq. Pour retrouver la formation BCA : ${support}.`,
  "forgotten-code":`Si vous avez oublié votre code de configuration ou PIN de transaction BCA, contactez le support officiel pour demander sa réinitialisation : ${support}. Ne transmettez jamais votre ancien PIN, votre mot de passe ou un code reçu par e-mail dans Sabito. S’il s’agit plutôt du mot de passe de connexion, précisez-le : ce n’est pas la même procédure.`,
  availability:"Dans BCA Ads Network → profil diffuseur, les campagnes disponibles dépendent des annonces publiées par les annonceurs et de leur correspondance avec votre profil. Si aucune campagne n’est proposée, les annonceurs peuvent ne pas encore en avoir publié, ou les campagnes présentes peuvent ne pas correspondre à votre profil. Ce sont les explications générales fournies par BCA, pas le résultat d’une vérification de votre compte. Vous pouvez demander « Vérifier mon profil diffuseur » pour une consultation autorisée.",
  expiry:"Une campagne peut atteindre son objectif de vues avant la fin du délai affiché. Cela peut expliquer une clôture anticipée en général, mais ne prouve pas la cause de votre cas. Le nombre de diffuseurs nécessaires n’est pas fixe et 23 heures ne sont pas une durée universelle garantie.\nPour votre campagne, il faut vérifier le statut, l’objectif de vues et l’échéance enregistrés : un objectif atteint et une échéance dépassée sont deux situations différentes. Demandez « Vérifier ma campagne BCA Ads » depuis votre compte ; si les informations renvoyées sont insuffisantes, le support doit examiner le dossier. Je n’ai pas encore consulté votre campagne, sa disponibilité ni son tarif.",
  "referral-sale":"Oui, dans le parcours d’affiliation BCA décrit par l’équipe, recommander les produits et services numériques de la plateforme donne droit à des commissions selon le niveau : 1 500 F au niveau 1, 500 F au niveau 2 et 300 F au niveau 3, lorsque les conditions de l’opération sont remplies. Cela concerne notamment les services et formations de la plateforme et BCA Ads Network.\nCette « revente » désigne ici l’affiliation aux offres BCA ; elle ne signifie pas que toute vente d’un produit personnel de votre filleul dans Digital Store vous rapporte automatiquement une commission. Ces montants décrivent la règle générale, pas un crédit confirmé sur votre compte. Souhaitez-vous comprendre les niveaux ou consulter vos commissions réellement enregistrées ?",
  budget:"Parlez-vous du budget d’une campagne avec photo comme annonceur ? Je n’ai pas de handler raccordé renvoyant le budget minimum actuel et ne peux pas confirmer le montant proposé. Vérifiez la configuration active affichée dans le formulaire annonceur, le total et les conditions avant de payer ; si ces données manquent, contactez le support officiel. Un budget annonceur n’est pas la rémunération d’un diffuseur et ne garantit pas de clients. Un ancien montant communiqué ne prouve pas le tarif actuel.",
  merch:`Pour recevoir les images officielles des casquettes et pulls BCA, contactez le support : ${support}. Je ne dispose pas ici d’un visuel officiel à vous transmettre.`,
};

export const bcaOwnerClarificationAliases:Record<string,string[]>={
  promo:["Je veux un code promo","Code promo","Code promo 1xbet","Code promo melbet","1xbet","melbet"],
  refund:["Rembourser mon inscription","Je veux le remboursement de mon inscription"],
  "member-location":["Où est l’espace membre ?","Comment accéder à mon espace membre ?"],
  news:["Quelles sont les nouveautés de novembre 2026 ?"],
  telegram:["Comment ouvrir Telegram sans payer 1 dollar ?","Comment accéder à la formation Telegram ?"],
  "forgotten-code":["J'ai oublié mon code pin","J'ai oublié mon PIN","J'ai oublié mon code de configuration","Réinitialiser mon code PIN"],
  availability:["Pourquoi mes campagnes sont indisponibles ?"],
  expiry:["Pourquoi mes campagnes expirent avant 23h ?","Nombre de vues atteint par l'annonceur"],
  "referral-sale":["Si mon filleul vend je gagne aussi ?","Si mon filleul invite quelqu'un je gagne aussi ?"],
  budget:["La campagne avec photo vaut 1000 XAF ?","Quel est le budget minimum d'une campagne BCA Ads ?"],
  merch:["Envoie les images des casquettes BCA","Envoie les images des pulls BCA"],
};

/** Titles transcribed from the owner's 2026-11-06 screenshots, not live prices
 * or a promise of access. Betting-promotion courses are not recommended. */
export const bcaTrainingSubjects=[
  {name:"Formation en IA",title:"FORMATION EN IA",pattern:/\b(?:ia|intelligence artificielle)\b/},
  {name:"Booster vos abonnés",title:"BOOSTER VOS ABONNÉS EN UN CLIQUE",pattern:/\b(?:abonnes|abonne|followers)\b/},
  {name:"Création de contenu",title:"CREATION DE CONTENU",pattern:/\b(?:creation de contenu|contenu|createur de contenu)\b/},
  {name:"Crypto monnaie",title:"CRYPTO MONNAIE",pattern:/\b(?:crypto|cryptomonnaie|crypto monnaie)\b/},
  {name:"Telegram",title:"COMMENT S’INSCRIRE SUR TELEGRAME SANS PAYER LES 1$",pattern:/\btelegram(?:e|me)?\b/},
  {name:"Formation pour l’affiliation",title:"FORMATION POUR L’AFFILIATION",pattern:/\baffiliation\b/},
  {name:"Compte TikTok monétisé",title:"CRÉER UN COMPTE TIKTOK MONÉTISER",pattern:/\btiktok\b/},
  {name:"Vente des produits digitaux",title:"VENTE DES PRODUITS DIGITAUX",pattern:/\b(?:vente (?:des?|de) produits digitaux|produits digitaux)\b/},
  {name:"CapCut",title:"CAPCUT PRO GRATUIT À VIE",pattern:/\bcapcut\b/},
  {name:"Débloquer un compte WhatsApp",title:"DEBLOQUER UN COMPTE WHATSAPP",pattern:/\bwhatsapp\b/},
  {name:"Créer un bot WhatsApp",title:"COMMENT CRÉER UN BOT WHATSAPP",pattern:/\b(?:whatsapp|bot)\b/},
  {name:"Formation Facebook Ads",title:"FORMATION FACEBOOK ADS",pattern:/\bfacebook\b/},
  {name:"Canal+",title:"AVOIR TOUT CANAL+ GRATUIT",pattern:/\bcanal(?: plus)?\b/},
  {name:"Campagne publicitaire sur Facebook",title:"COMPAGNE PUB SUR FACEBOOK",pattern:/\bfacebook\b/},
  {name:"Booster vos publicités TikTok",title:"BOOSTER VOS PUB TIKTOK",pattern:/\btiktok\b/},
  {name:"Carte Visa virtuelle",title:"CREER UNE CARTE VISA VIRTUELLE",pattern:/\b(?:visa|carte virtuelle)\b/},
  {name:"Les ebooks à vendre",title:"LES EBOOKS A VENDRE",pattern:/\b(?:ebooks?|livres? numeriques?)\b/},
];
export function bcaTrainingMatches(text:string) {
  const q=normalizeQuestion(text);
  if(/\b(?:1xbet|melbet|paris sportif|bookmaker|code promo)\b/.test(q)||q.split(" ").length>20)return [];
  // A course keyword does not convert a personal financial/status request
  // into a training suggestion.
  const exact=bcaTrainingSubjects.filter(subject=>[subject.name,subject.title].some(value=>normalizeQuestion(value)===q));
  if(exact.length===1)return exact;
  const explicitCourse=/\b(?:formation|cours|apprendre)\b/.test(q);
  if(!explicitCourse&&(q.split(" ").length>4||
    /\b(?:depot|retrait|solde|transaction|commission|mes|jour|statut|annonce|vues|paiement|debite|verifier|erreur|bloque|pas|gains|argent|revenus|publication|publier|poster|statuts?|campagnes?)\b/.test(q)))return [];
  let matches=bcaTrainingSubjects.filter(subject=>subject.pattern.test(q));
  if(matches.length>1&&/\bwhatsapp\b/.test(q)) {
    if(/\bbot\b/.test(q))matches=matches.filter(item=>item.name==="Créer un bot WhatsApp");
    else if(/\b(?:debloquer|bloque|banni)\b/.test(q))matches=matches.filter(item=>item.name==="Débloquer un compte WhatsApp");
  }
  if(matches.length>1&&/\btiktok\b/.test(q)) {
    if(/\b(?:monetiser|monetise|compte)\b/.test(q))matches=matches.filter(item=>item.name==="Compte TikTok monétisé");
    else if(/\b(?:pub|publicite|booster)\b/.test(q))matches=matches.filter(item=>item.name==="Booster vos publicités TikTok");
  }
  if(matches.length>1&&/\bfacebook\b/.test(q)&&/\b(?:campagne|compagne)\b/.test(q))
    matches=matches.filter(item=>item.name==="Campagne publicitaire sur Facebook");
  return matches;
}
export function bcaTrainingTopic(text:string):string|undefined {
  const matches=bcaTrainingMatches(text);
  // Ask before assuming that a product name means a course-access request.
  if(matches.length!==1)return undefined;
  return matches[0].name;
}
export function bcaTrainingQuestion(topic:string) {
  return `Souhaitez-vous savoir comment accéder à la formation BCA consacrée à ${topic} ?`;
}
export function bcaTrainingAccess(topic:string) {
  const title=bcaTrainingSubjects.find(subject=>subject.name===topic)?.title??topic;
  const base=`Connectez-vous à BCA → ouvrez la liste des formations : https://bizconnectacademy.com/formations → recherchez « ${title} » → ouvrez sa fiche et utilisez le bouton d’accès proposé pour suivre les leçons. Si elle n’apparaît pas sur la première page, utilisez la recherche ou la page suivante. Vérifiez les conditions d’accès indiquées sur la fiche ; les captures du catalogue ne garantissent pas un prix ou un accès actuel. Je ne confirme ni un achat ni un accès déjà activé sur votre compte. Le titre d’une formation n’est pas une garantie de gains, d’accès permanent ou d’abonnement à un service tiers.`;
  return topic==="Telegram"?bcaOwnerClarifications.telegram:base;
}
/** Only the immediate owned assistant turn can supply this public context.
 * Never treat "oui" as consent for a financial/account read. */
export function bcaOwnerContinuation(text:string,previous:string):string|undefined {
  const q=normalizeQuestion(text);
  const yes=/^(oui|oui merci|oui comment|oui comment faire|oui je veux|d accord|ok|okay|comment faire|comment y acceder)$/.test(q);
  const topic=bcaTrainingSubjects.find(subject=>previous===bcaTrainingQuestion(subject.name));
  if(topic&&yes)return bcaTrainingAccess(topic.name);
  if(topic&&/^(non|non merci)$/.test(q))return "D’accord. Quelle est votre question sur ce sujet ?";
  if(previous===bcaOwnerClarifications.refund&&yes)
    return `Pour en savoir plus sur l’inscription non remboursable, consultez la présentation et les conditions BCA : ${presentation}. Si vous avez besoin d’accompagnement ou contestez une erreur de paiement, contactez ${support}. Aucun remboursement n’est exécuté par Sabito.`;
  return undefined;
}
