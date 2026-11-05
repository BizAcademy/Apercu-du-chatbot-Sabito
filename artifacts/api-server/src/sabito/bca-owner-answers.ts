import type { BcaGuide } from "./bca-guide-data";
import type { BackendResult } from "./backend-bridge";
import { normalizeQuestion } from "./question-normalization";

export const bcaSupportUrl="https://bcachat.bizconnectacademy.com";
export const bcaOwnerPrivateAliases:Record<string,string[]>={
  referral_code:["Mon code parrainage"],
  referral_commission_status:["Bonsoir j'aimerais savoir combien y'a dans mon compte BCA comme commission"],
};
const guide=(key:string,title:string,variants:string[],content:string,followUpKeys:string[]=[]):BcaGuide=>
  ({key,title,variants,content,followUpKeys});
const income="Les parcours recommandés par BCA sont notamment la revente ou l’affiliation de produits digitaux et l’apprentissage de compétences grâce aux formations, afin de pouvoir ensuite les monétiser. Prenez d’abord le temps de comprendre le fonctionnement, de vous former et de pratiquer. Les résultats dépendent de votre travail, de vos compétences et des ventes réellement réalisées : aucun revenu immédiat ni montant de gain n’est garanti.";

/** Owner-supplied answers, edited for clarity without promising account results. */
export const bcaOwnerFaq:BcaGuide[]=[
  guide("owner-history","Quand BCA a-t-elle été lancée et légalisée ?",[
    "En quel année BCA à été fondé ?","Quand BCA a été créée ?","Date de création BCA",
    "Depuis quand existe Biz Connect Academy ?","Quand BCA est devenue une entreprise légale ?",
  ],"Selon les informations confirmées par l’équipe BCA, Biz Connect Academy a été mise en ligne le 16 octobre 2025 et est devenue une entreprise légale le 12 mars 2026. La date de mise en ligne et celle de légalisation sont donc différentes.",["member-bca-overview"]),
  guide("owner-income-paths","Quelles activités BCA privilégier pour développer ses revenus ?",[
    "Qu'es ce qui rapporte plus de l'argent dans la BCA ?","Quelle activité rapporte le plus sur BCA ?",
    "À part les produits de vital quelle activité je peux m'aider à trouver de l'argent sur",
    "Que faire à part vendre des produits digitaux ?","Comment monétiser mes compétences ?",
  ],income,["20","23","owner-learn-sell"]),
  guide("owner-learn-sell","Comment apprendre des compétences et vendre des formations ?",[
    "Appendice des compétences et vendre des formations","Je veux apprendre une compétence et vendre des formations",
    "Où apprendre à vendre des produits digitaux ?","Comment apprendre et ensuite gagner de l'argent ?",
  ],"Pour apprendre une compétence, ouvrez « Formation » dans BCA et choisissez le cours que vous souhaitez suivre, selon les conditions d’accès affichées.\nPour apprendre à vendre des formations ou des produits digitaux, consultez la formation sur la vente des produits digitaux.\nPratiquez ce que vous apprenez avant de proposer vos services ou vos produits. Vendez uniquement des contenus que vous avez le droit de commercialiser. Aucun gain immédiat n’est garanti.\nSouhaitez-vous choisir une formation ou apprendre à vendre un produit digital ?",["20","23"]),
  guide("owner-premium-campaign","Y a-t-il un abonnement premium dans les campagnes BCA Ads ?",[
    "Je suis arrivé au compagne 3 abonnement premium","Abonnement premium campagne 3",
    "Dois-je payer un abonnement premium pour une campagne BCA Ads ?",
  ],"Il n’y a pas d’abonnement premium dans les campagnes BCA Ads Network selon les informations confirmées par BCA. Parlez-vous plutôt de Canal+ ou de CapCut Pro ?\nSi oui, ouvrez la liste des formations et choisissez la formation correspondant à Canal+ ou CapCut ; les explications se trouvent dans le cours. Cela ne confirme pas l’activation d’un abonnement sur votre compte.",["member-premium-courses","28"]),
  guide("owner-shop","Peut-on créer sa boutique en ligne sur BCA ?",[
    "Je veux une boutique en ligne","Comment créer ma boutique en ligne BCA ?",
    "La création de boutiques est-elle disponible ?","Je veux ouvrir une boutique sur BCA",
  ],"La fonctionnalité de création d’une boutique en ligne n’est pas encore disponible sur BCA, d’après les informations confirmées par l’équipe. Aucune date d’ouverture n’a été annoncée dans ces informations.\nEn attendant, vous pouvez publier vos formations depuis votre espace vendeur de Digital Store, en respectant les conditions et les droits de commercialisation. Publier dans Digital Store n’équivaut pas à créer une boutique indépendante.",["23"]),
  guide("owner-duration","BCA est-elle prévue pour fonctionner durablement ?",[
    "La BCA va durer pour combien de temps ?","BCA va fermer quand ?",
    "BCA est une plateforme à vie ?","Combien de temps BCA va exister ?",
  ],"BCA est présentée par son équipe comme un projet durable, dit « à vie », et non comme une opération limitée à une durée annoncée. Cela exprime son objectif de continuité, pas une garantie qu’aucune fermeture ou interruption ne pourra jamais survenir.\nPrenez le temps de comprendre les services et de développer vos compétences. La durée du projet ne garantit pas des revenus.",["owner-income-paths"]),
  guide("owner-both-roles","Peut-on être annonceur et diffuseur BCA en même temps ?",[
    "Est-ce que l'on peut devenir annonceur et diffuseurs as même ?",
    "Je peux être annonceur et diffuseur à la fois ?","Peut-on diffuser sa propre annonce ?",
    "Puis-je publier mes annonces et diffuser celles des autres ?",
  ],"Oui, vous pouvez à la fois publier vos annonces comme annonceur et diffuser les campagnes d’autres annonceurs sur votre statut WhatsApp, selon les conditions de chaque parcours.\nEn revanche, vous ne pouvez pas diffuser vos propres annonces. Les autres diffuseurs peuvent diffuser les vôtres, et vous pouvez diffuser les leurs. Le cumul des rôles ne supprime ni les règles de publication ni les vérifications.",["26","27","30"]),
  guide("owner-contact-referrals","Comment contacter mes filleuls depuis BCA ?",[
    "Bonjour est ce que je peux contacter mes filleuls et comment ?",
    "Comment écrire à mes filleuls sur WhatsApp ?","Où est le bouton WhatsApp de mes filleuls ?",
    "Je veux contacter un filleul","Comment accéder à Mes gains ?",
  ],"Oui, vous pouvez contacter vos filleuls depuis votre espace BCA.\n1. Cliquez sur les trois tirets en haut à gauche pour ouvrir le menu.\n2. Choisissez « Mes gains ».\n3. Consultez vos filleuls des niveaux 1, 2 et 3.\n4. Cliquez sur le bouton WhatsApp du filleul que vous souhaitez contacter.\nUtilisez uniquement les contacts accessibles à votre compte et respectez leur confidentialité. Si le bouton est absent ou ne fonctionne pas, indiquez le niveau concerné et le message affiché, sans transmettre les coordonnées d’un autre membre.",["owner-commissions-help"]),
  guide("owner-commissions-help","Comment consulter mon solde et mes commissions d’affiliation ?",[
    "Où consulter les commissions des niveaux 1 2 et 3 ?","Comment retrouver mes gains d'affiliation ?",
    "Où voir mon solde sur BCA ?","Comment voir mes commissions dans Mes gains ?",
  ],"Pour voir votre solde, consultez le solde affiché en haut de votre espace BCA.\nPour consulter vos gains d’affiliation, ouvrez les trois tirets en haut à gauche, puis « Mes gains ». Consultez les informations des niveaux 1, 2 et 3 ainsi que les montants réellement enregistrés.\nLe nombre de filleuls ne permet pas, à lui seul, de déduire des commissions dues ou créditées. Je n’ai pas consulté votre compte : pour donner un montant personnel, une session membre reconnue et une lecture autorisée du backend sont nécessaires.",["owner-contact-referrals","18"]),
  guide("owner-deposit-help","Que faire si un dépôt BCA ne fonctionne pas ?",[
    "Bonjour, j'ai fait mon dépôt mais ça ne marche pas. Comment faire ?",
    "Comment contacter le support pour un problème de dépôt ?",
    "Où demander de l'aide pour mon dépôt BCA ?",
  ],`Contactez le support officiel BCA : ${bcaSupportUrl}\nExpliquez précisément le problème, l’étape où vous êtes bloqué et le message affiché. Consultez la référence et le statut dans votre historique. Ne communiquez ni PIN, ni mot de passe, ni code de connexion.\nUn blocage d’écran ne prouve pas que le paiement a échoué. N’effectuez pas un second dépôt uniquement pour débloquer la page. Pour une vérification dans Sabito, une session membre reconnue et la référence exacte du dépôt sont nécessaires.`,["10"]),
];

export const bcaOwnerCorrections:Record<string,string>={
  "questions-whatsapp-copy":`Le message « copié » ne confirme pas que votre statut a été publié.\n1. Ouvrez la campagne et consultez les éléments officiels à partager.\n2. Publiez sur votre statut WhatsApp le titre, la description et l’image fournis pour la campagne. Si le bouton ne fait que copier le texte, ouvrez WhatsApp et préparez le statut avec tous les éléments demandés ; le texte ou le lien seul ne remplace pas l’image.\n3. Vérifiez que le statut est visible dans WhatsApp, puis revenez dans BCA pour déclarer la publication et effectuer les vérifications demandées dans les délais.\nSi vous n’y arrivez pas, contactez le support officiel : ${bcaSupportUrl}\nPrécisez votre appareil, le navigateur et ce que le bouton fait exactement. Ne partagez aucun code de connexion.`,
  "questions-views-and-credit":`Selon la règle confirmée par BCA, une vue validée est rémunérée à 0,60 F ; les vues sont comptabilisées sur trois jours. Le total se calcule sur les vues validées de chaque jour, sans compter trois fois un cumul déjà établi.\nExemple : 123 vues validées cumulées sur les trois jours × 0,60 F = 73,80 F. Ce n’est pas 123 × 1,80 F si 123 est déjà le cumul des trois jours. Cet exemple ne confirme ni le montant crédité à votre compte, ni une règle d’arrondi.\nLes fonds sont versés dans votre compte principal BCA. Aucune heure précise de versement n’a été confirmée dans ces informations.\nVérifiez la campagne, les vues retenues pour chaque journée et les écritures réellement créditées. Les vues WhatsApp déclarées ne prouvent pas toutes une validation BCA ; la campagne test n’est pas rémunérée.\nSi le montant affiché diffère, faites vérifier le détail par une consultation autorisée ou contactez le support : ${bcaSupportUrl}`,
};

/** Guidance only after the existing ownership/verified-result gates. */
export function bcaOwnerResultGuidance(operation:string,result:BackendResult):string {
  if(operation==="referral_commission_status")return "\n\nPour retrouver les informations dans BCA : ouvrez les trois tirets en haut à gauche, puis « Mes gains » et consultez les niveaux 1, 2 et 3. Fiez-vous aux montants réellement enregistrés, pas au nombre de filleuls seul.";
  if(operation!=="deposit_status")return "";
  const status=normalizeQuestion(String(result.data?.statut??""));
  if(["termine","completed","complete","success","succeeded","confirmed","confirme","reussi","paid"].includes(status))
    return "\n\nVérifiez maintenant votre solde et l’écriture correspondante dans le compte principal BCA. Le statut de l’opération ne remplace pas la vérification du crédit réel.";
  if(["en attente","pending","processing","en cours"].includes(status))
    return `\n\nVotre dépôt est encore en attente. Pour demander son examen, contactez le support officiel : ${bcaSupportUrl}. Un statut en attente ne signifie pas un échec ; ne payez pas une seconde fois pour le débloquer.`;
  if(["echoue","failed","echec","rejected","rejete","cancelled","annule"].includes(status)) {
    const reason=["motif","raison","reason","failure_reason","raison_echec"].map(key=>result.data?.[key])
      .find(value=>typeof value==="string"&&value.trim());
    return `\n\n${reason?`Motif communiqué par le backend BCA : ${String(reason).slice(0,1000)}`:"Je n’ai pas de motif d’échec confirmé dans les données reçues."} Vérifiez la cause avant une nouvelle tentative et ne payez pas deux fois si le débit précédent est incertain. Pour être accompagné, contactez ${bcaSupportUrl}. Sabito ne relance aucun paiement.`;
  }
  return `\n\nPour faire examiner le dépôt, contactez le support officiel : ${bcaSupportUrl}. Je n’invente pas de cause ni de confirmation de crédit.`;
}
