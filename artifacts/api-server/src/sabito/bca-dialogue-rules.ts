import { expandQuestion,tokenSimilarity } from "./question-spelling";
import type { LanguageDictionary } from "./question-spelling";

export const bcaFallback="Mes ressources sont limitées pour le moment et je ne peux pas répondre à cette question. En attendant, vous pouvez contacter notre support : https://bcachat.bizconnectacademy.com";
export const bcaWarmClosing="Merci pour votre message ! Je reste disponible si vous avez besoin d’aide.";
export const bcaTestPrompt="S’agit-il d’une campagne test ?";
export function bcaTone(text:string) {
  let emojis=0;
  return [...new Intl.Segmenter("fr",{granularity:"grapheme"}).segment(text)].map(({segment})=>
    /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment)&&++emojis>1?"":segment).join("");
}
export type BcaSubject="digital-store"|"ads"|"referral"|"formations"|"income"|"deposit"|"withdrawal"|"account";
export type BcaRequest="how"|"why"|"where"|"check";
const vocabulary:Record<BcaSubject,string[]>={
  "digital-store":["digital store","vendeur digital","produit digital","formation rejetee","formation refusee","formation rejete","formation rejeter"],
  ads:["bca ads network","bca ads","campagne","campagnes","troisieme jour","3eme jour","3e jour","jour 3"],
  referral:["parrainage","parrain","parraine","filleul","commission","commissions"],
  formations:["formation","formations","competence","competences"],
  income:["revenu","revenus","gagner","argent"],
  deposit:["depot","deposer","recharge"],
  withdrawal:["retrait","retirer"],
  account:["compte","comptes","profil"],
};
export function bcaQuestionParts(text:string,dictionary?:LanguageDictionary) {
  const normalized=expandQuestion(text,dictionary);
  const words=normalized.split(" ");
  const subjects=(Object.keys(vocabulary) as BcaSubject[]).filter(subject=>vocabulary[subject].some(value=>
    value.includes(" ")?` ${normalized} `.includes(` ${value} `):words.some(word=>word===value||
      word.length>=5&&value.length>=5&&tokenSimilarity(word,value)>=0.82)));
  const request:BcaRequest|undefined=/\b(?:verifier|verifie|consulter|consulte|statut|suivi)\b/.test(normalized)?"check":
    /\b(?:pourquoi|raison|motif|rejete|rejetee|refusee|rejeter)\b/.test(normalized)?"why":
    /\b(?:ou|trouver|retrouver)\b/.test(normalized)?"where":
    /\b(?:comment|fonctionne|fonctione|faire|apres|suite)\b/.test(normalized)?"how":undefined;
  const rejectedTraining=/\bformations?\b/.test(normalized)&&/\b(?:rejete|rejetee|rejeter|rejet|refuse|refusee)\b/.test(normalized);
  return {normalized,subject:rejectedTraining?"digital-store" as BcaSubject:subjects[0],request};
}
export function bcaScenario(text:string,dictionary?:LanguageDictionary) {
  const {normalized:q}=bcaQuestionParts(text,dictionary);
  if(/\b(?:troisieme|3eme|3e|jour 3)\b/.test(q)&&/\b(?:jour|journee|campagne)\b/.test(q))return "third-day";
  if(/\b(?:compte|comptes)\b/.test(q)&&/\b(?:relies|relie|lies|lie|rattaches|rattache|parrain de)\b/.test(q))return "account-link";
  if(/\b(?:commission|commissions)\b/.test(q)&&/\b(?:autre compte|autre personne|autre utilisateur|compte de|compte [a-z]+)\b/.test(q)&&
    /\b(?:allee|alle|versee|verse|recu|touche|attribuee|attribue)\b/.test(q))return "wrong-commission";
  if(/\b(?:formation|formations)\b/.test(q)&&/\b(?:rejete|rejetee|rejeter|rejet|refuse|refusee)\b/.test(q))return "rejected-training";
  if(/\b(?:rapporte|rapport|gagner|revenu|revenus)\b/.test(q)&&/\b(?:plus|meilleur|maximum|beaucoup)\b/.test(q))return "income";
  return undefined;
}
export function bcaPositiveEmotion(text:string) {
  return /^(?:merci(?: beaucoup| bien| infiniment)?|super|genial|vous etes top|vous etes les meilleurs|(?:je suis )?(?:tres )?emu(?:e)?(?: de votre reponse)?|tres touche(?:e)?(?: par votre reponse)?|bravo|excellent)$/
    .test(expandQuestion(text));
}
export function bcaChoiceIndexes(text:string,questions:string[],dictionary?:LanguageDictionary) {
  const q=expandQuestion(text,dictionary);
  if(/^(?:oui(?: merci| s il vous plait)?|ouais|ok|okay|d accord|vas y|allez y|tous|toutes|tout|les deux|les trois)$/.test(q))
    return questions.map((_,index)=>index);
  const number=/^(?:le |la |numero |choix )?([1-3])$/.exec(q);
  if(number)return Number(number[1])<=questions.length?[Number(number[1])-1]:[];
  const tokens=(value:string)=>expandQuestion(value,dictionary).split(" ").filter(word=>
    !["comment","pourquoi","quel","quelle","quels","quelles","le","la","les","de","des","du","sur","dans","bca","je","veux","est","ce","que","a","au","et","un","une",
      "faire","fonctionner","fonctionne","comprendre","utiliser","suivre","trouver","voir","effectuer","consulter","apprendre"].includes(word));
  const input=tokens(q);
  if(!input.length)return [];
  const scores=questions.map((question,index)=>{
    const target=tokens(question);
    const exact=expandQuestion(question,dictionary)===q;
    const score=exact?1:input.reduce((sum,word)=>sum+Math.max(0,...target.map(other=>
      word===other?1:word.length>=4&&other.length>=4?tokenSimilarity(word,other):0)),0)/input.length;
    return {index,score};
  }).sort((a,b)=>b.score-a.score);
  return scores[0]?.score>=0.8&&(!scores[1]||scores[0].score-scores[1].score>=0.15)?[scores[0].index]:[];
}

/** Newly supplied scenario texts remain pending until explicitly approved. */
export const bcaDialogueDrafts=[
  {key:"rejected-training",title:"Pourquoi une formation Digital Store est-elle rejetée ?",
    variants:["Pourquoi ma formation est rejetée ?","ma formation a ete refusee pourquoi","pk ma formasion est rejeter",
      "Le lien de livraison peut-il faire refuser ma formation ?","Que vérifier après un refus de ma formation Digital Store ?"],
    content:"Un rejet signifie que votre formation n’a pas été approuvée. Vérifiez les informations de sa fiche, en particulier le lien de livraison. Un lien Google Drive doit permettre à l’acheteur d’accéder au contenu après achat ; les liens YouTube, Facebook, WhatsApp, TikTok et autres réseaux sociaux ne conviennent pas comme liens de livraison de formation. Un produit Chariow ou Maketou doit être gratuit sur la plateforme externe pour éviter un second paiement. Ces vérifications ne prouvent pas le motif de votre rejet personnel : consultez le motif enregistré pour votre produit ou le support."},
  {key:"wrong-commission",title:"Pourquoi une commission de parrainage est-elle allée sur un autre compte ?",
    variants:["j'ai parrainé avec mon lien et la commission est allée à un autre compte","ma commission a ete versee a un autre compte","un autre utilisateur a touche ma commission",
      "Pourquoi mon filleul apparaît-il chez un autre parrain ?","Mon inscription parrainée a rapporté une commission à quelqu’un d’autre"],
    content:"Je comprends, c’est frustrant. Dans la plupart des cas, cela signifie que le filleul ne s’est pas réellement inscrit avec votre lien, ou qu’il a créé plusieurs comptes et payé depuis un compte qui n’est pas rattaché à votre lien. Ce n’est pas un problème lié à votre compte. Si vous pensez qu’il s’agit d’une erreur, contactez notre support : https://bcachat.bizconnectacademy.com"},
  {key:"account-link",title:"Sabito peut-il vérifier si deux comptes sont liés par parrainage ?",
    variants:["Est-ce que ces deux comptes sont reliés ?","ces deux comptes sont ils rattaches","un compte est il le parrain de l’autre",
      "Peut-on contrôler le lien de parrainage entre deux comptes ?","Sabito peut-il voir si ces membres sont parrain et filleul ?"],
    content:"Je ne peux pas vérifier ici si l’un de ces comptes est le parrain de l’autre, ni exposer leurs données privées. Vous pouvez contacter notre support : https://bcachat.bizconnectacademy.com"},
  {key:"test-days",title:"Comment terminer les deux jours de la campagne test BCA Ads ?",
    variants:["La campagne test dure combien de jours ?","Dois-je publier un troisième jour pour le test ?",
      "Que faire une fois le deuxième jour du test validé ?","Après deux jours de test puis-je chercher des campagnes payantes ?",
      "Comment terminer la publication et la vérification de ma campagne test ?"],
    content:"La campagne test dure deux jours. Vous publiez et vous vérifiez le 1er et le 2e jour, comme expliqué dans le guide d’utilisation. Une fois le jour 2 validé, la campagne test est validée et vous aurez accès aux campagnes payantes quand elles seront disponibles."},
  {key:"paid-days",title:"Comment faire valider chaque jour d’une campagne payante BCA Ads ?",
    variants:["Comment faire valider le troisième jour d'une campagne payante ?","Où trouver la procédure de vérification des jours payants ?",
      "Quelle vidéo explique la publication pour une campagne rémunérée ?","Mon jour de campagne payante ne se valide pas",
      "Comment suivre la publication quotidienne hors campagne test ?"],
    content:"Il s’agit alors d’une campagne payante. Pour que chaque jour soit validé, il faut respecter la procédure de publication et de vérification expliquée dans la deuxième vidéo de ce guide : https://presentationbizconnectacademy.com/aide"},
];
