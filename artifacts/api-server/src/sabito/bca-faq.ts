import type { BcaGuide } from "./bca-guide-data";
import { expandQuestion,tokenSimilarity } from "./question-spelling";
import { bcaMemberFaq } from "./bca-member-faq";
import { normalizeQuestion } from "./question-normalization";
import { bcaQuestionFaq,bcaQuestionAlias } from "./bca-question-followups";

const usage="Pour apprendre à publier et à vérifier vos campagnes sur votre statut WhatsApp, ouvrez « Présentation BCA », puis cliquez sur « Guide d’utilisation ». Suivez les étapes de publication et de vérification, les preuves et les délais indiqués.";
const guide=(key:string,title:string,variants:string[],content:string):BcaGuide=>
  ({key,title,variants,content,followUpKeys:[]});
export const bcaFaq:BcaGuide[]=[
  guide("faq-status-income","Peut-on monétiser ses propres statuts WhatsApp avec BCA ?",[
    "Est ce que c'est possible de monotiser tes propres status",
    "Comment monétiser mes statuts WhatsApp ?","Est-ce que mes statuts WhatsApp peuvent me rapporter ?",
  ],`Oui : BCA Ads Network permet aux membres autorisés de diffuser des campagnes publicitaires sur leurs statuts WhatsApp et d’être rémunérés pour les vues validées, pas simplement pour leurs publications personnelles habituelles. Le tarif communiqué pour ce parcours est de 1,80 F par vue validée ; le montant, la devise et les conditions affichés sur la campagne courante font foi.\nIl faut être membre BCA et faire valider sa campagne test avant d’accéder aux campagnes payantes disponibles. La campagne test n’est pas rémunérée et aucune quantité de vues ou de gains n’est garantie.\n${usage}`),
  guide("faq-registration-fees","Après une inscription BCA à 2 900 F, y a-t-il d’autres frais ?",[
    "Je voulais demander si tu payes l'inscription dans la plateforme à 2900f est ce que tu payes d'autres frais après sa",
    "Après avoir payé 2900f faut-il encore payer ?","Y a-t-il des frais après l’inscription ?",
  ],"Les 2 900 F que vous mentionnez correspondent au paiement d’inscription ou d’activation présenté dans votre question : vérifiez le tarif actuel sur le formulaire officiel avant de payer. Ce paiement ne signifie pas que tous les services ou opérations de BCA deviennent gratuits.\nDes achats de formations ou de produits, une campagne annonceur ou certaines opérations financières peuvent avoir leur propre prix ou leurs frais, selon les conditions affichées. Je n’annonce pas de nouveau paiement obligatoire ni d’abonnement récurrent sans règle vérifiée. Lisez toujours le prix, les frais et le total avant de valider. Aucun paiement ne garantit un revenu."),
  guide("faq-status-publish","Comment poster sur WhatsApp et recevoir des gains BCA ?",[
    "S'il vous plaît comment poster sur WhatsApp et recevoir des gains",
    "Comment publier les campagnes sur mon statut WhatsApp ?","Comment publier et vérifier une campagne WhatsApp ?",
  ],`Pour recevoir des gains comme diffuseur, devenez membre BCA, complétez le parcours diffuseur et faites valider la campagne test. Ensuite, choisissez une campagne rémunérée disponible pour votre profil.\n${usage}\nUtilisez exactement le contenu et les liens fournis, déclarez la publication, puis soumettez les vérifications demandées dans les délais. Une publication ou une capture envoyée ne vaut pas validation. Seules les vues retenues selon les règles de la campagne et les écritures réelles permettent de confirmer les gains ; le test ne paie pas.`),
  guide("faq-status-access","Comment accéder aux campagnes WhatsApp pour toucher des commissions ?",[
    "Comment accéder aux vues en status watsapp pour avoir des commissions ?",
    "Comment avoir les campagnes payantes sur WhatsApp ?","Comment gagner des commissions avec mes statuts ?",
  ],`Il faut d’abord être membre de Biz Connect Academy, puis suivre le parcours diffuseur et faire valider entièrement votre campagne test. Vous pourrez ensuite accéder aux campagnes payantes disponibles pour votre profil ; la validation du test ne garantit pas qu’une campagne rémunérée sera immédiatement proposée.\n${usage}\nNe confondez pas campagne test validée, campagne payante disponible et gain réellement crédité.`),
  guide("faq-no-paid-campaign","J’ai fini ma campagne test mais je ne reçois pas de campagne payante",[
    "J’ai fini ma campagne test mais je ne reçois pas de campagne payante",
    "Test validé mais aucune campagne payante","Pourquoi il n’y a pas de campagne après mon test ?",
  ],`Vérifiez d’abord que la campagne test complète est validée, et pas seulement qu’elle a été publiée ou qu’une journée a été envoyée. Si le test est validé et qu’aucune campagne payante n’apparaît, les annonceurs peuvent ne pas avoir publié de campagne disponible, ou les campagnes présentes peuvent ne pas cibler votre pays, votre ville ou votre profil.\nCela ne prouve ni un blocage de votre compte ni une erreur de paiement. Je n’ai pas vérifié votre dossier personnel dans cette réponse. Consultez les campagnes disponibles et votre profil diffuseur, puis le support si une incohérence persiste. Ne modifiez pas votre profil avec de fausses informations pour contourner le ciblage.\n${usage}`),
  guide("faq-referral-location","Où se trouve mon lien d’affiliation BCA ?",[
    "Bonjour l'académie ! J'aimerais savoir où se trouve mon lien d'affiliation",
    "Où trouver mon lien d’affiliation ?","Où est mon code parrain ?",
  ],"Connectez-vous à votre espace membre BCA et ouvrez la rubrique de parrainage ou d’affiliation affichée dans votre tableau de bord. Vous pourrez y consulter et copier votre code parrain ou votre lien d’invitation, puis le partager.\nUtilisez le code et le lien réellement affichés pour votre compte : je ne vais pas en inventer un ni déduire votre code de votre nom. Pour que Sabito consulte directement votre code, une session membre autorisée et le service backend de parrainage sont nécessaires. Ne communiquez aucun mot de passe ni secret dans le chat."),
  guide("faq-blocked-publisher","Mon compte diffuseur BCA est bloqué : que faire ?",[
    "Bonjour ami svp mon compte diffuseur est bloqué j' ai fait une erreur svpl aidé moi à le débloquer je promet que sa ne va plus ce répété",
    "Mon compte diffuseur est bloqué","Aidez-moi à débloquer mon compte diffuseur",
  ],`Je comprends votre demande. Le parcours diffuseur exige le respect des procédures de publication et de vérification. Le non-respect des consignes, une infraction aux règles ou la falsification des vues peuvent entraîner un blocage ; les fausses preuves et les vues falsifiées sont strictement interdites. BCA recherche des diffuseurs sérieux avec qui collaborer.\nJe n’ai pas consulté le motif réel de votre blocage et ne vous accuse donc pas d’une faute précise. Consultez la notification reçue et contactez le support officiel BCA pour demander l’examen du dossier, en expliquant honnêtement l’erreur et en fournissant les éléments demandés sans code confidentiel. Une promesse de ne plus recommencer ne garantit pas un déblocage. Je ne peux ni lever le blocage ni contourner les règles.\n${usage}`),
  guide("faq-no-gambling","Je veux des jeux pour gagner de l’argent sur BCA",[
    "Je veux les jeux pour gagner l'argent","Quels jeux permettent de gagner de l’argent ?",
    "Est-ce que BCA est une plateforme d’investissement ?","Je veux investir pour avoir des gains garantis",
  ],"Biz Connect Academy n’est pas une plateforme d’investissement ni de jeux d’argent. Elle propose notamment des formations, des produits digitaux, le parrainage selon ses conditions et la diffusion de campagnes BCA Ads validées.\nPour envisager des revenus, vous pouvez apprendre une compétence et l’utiliser, vendre un produit digital conforme dans Digital Store, participer au parrainage autorisé ou devenir diffuseur BCA Ads après validation du test. Chacun de ces parcours a ses conditions ; l’inscription ne garantit ni gain, ni rendement, ni récupération automatique de votre paiement.\nQu’est-ce qui vous intéresse le plus : les formations, la vente digitale, le parrainage ou la diffusion de campagnes ?"),
  ...bcaMemberFaq,
  ...bcaQuestionFaq,
];

/** FAQ-only spelling tolerance; never transform transaction numbers or IDs. */
export function bcaFaqFor(text:string):BcaGuide|undefined {
  const vocabulary=["monetiser","statuts","whatsapp","campagne","payante","diffuseur","bloque","affiliation","inscription","commissions"];
  const q=expandQuestion(text).split(" ").map(word=>{
    const aliases:Record<string,string>={status:"statuts",statut:"statuts",watsapp:"whatsapp",watssap:"whatsapp",monotiser:"monetiser",monotise:"monetiser"};
    if(aliases[word])return aliases[word];
    if(vocabulary.includes(word)||word.length<5||/\d/.test(word))return word;
    const matches=vocabulary.filter(candidate=>tokenSimilarity(word,candidate)>=0.8);
    return matches.length===1?matches[0]:word;
  }).join(" ");
  if(/^(?:verifie|verifier|consulte|recherche|cherche)\b/.test(q))return undefined;
  const literal=normalizeQuestion(text);
  const member=bcaMemberFaq.find(guide=>[guide.title,...guide.variants].some(value=>normalizeQuestion(value)===literal));
  if(member)return member;
  const additional=bcaQuestionFaq.find(guide=>[guide.title,...guide.variants].some(value=>normalizeQuestion(value)===literal));
  if(additional)return additional;
  const alias=bcaQuestionAlias(text);
  if(alias)return bcaFaq.find(guide=>guide.key===alias.key);
  let key:string|undefined;
  if(/\b(?:jeux?|investissement|investir)\b/.test(q))key="faq-no-gambling";
  else if(/\bdiffuseur\b/.test(q)&&/\b(?:bloque|debloquer|debloque)\b/.test(q))key="faq-blocked-publisher";
  else if(/\b(?:affiliation|parrain|parrainage)\b/.test(q)&&/\b(?:ou|trouver|trouve)\b/.test(q))key="faq-referral-location";
  else if(/\b(?:frais|payer|payes|paye|inscription)\b/.test(q)&&
    (/\b(?:apres|autres|encore)\b/.test(q)))key="faq-registration-fees";
  else if(/\bcampagne\b/.test(q)&&/\btest\b/.test(q)&&
    /\b(?:fini|valide|validee|apres|termine)\b/.test(q)&&/\b(?:aucune|pas|plus|absence)\b/.test(q))key="faq-no-paid-campaign";
  else if(/\b(?:whatsapp|statuts)\b/.test(q)&&/\b(?:monetiser|rapporter)\b/.test(q))key="faq-status-income";
  else if(/\b(?:whatsapp|statuts)\b/.test(q)&&/\b(?:poster|publier|publication|verifier)\b/.test(q))key="faq-status-publish";
  else if(/\b(?:whatsapp|statuts|campagne)\b/.test(q)&&/\b(?:commissions|acceder|acces|payantes?)\b/.test(q))key="faq-status-access";
  return bcaFaq.find(guide=>guide.key===key);
}
