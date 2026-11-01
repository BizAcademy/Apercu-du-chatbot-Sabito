import { normalizeQuestion } from "./question-normalization";
import { expandQuestion } from "./question-spelling";
import { parseCatalogueFields } from "./buzzbooster-catalogue";

const words=["booster","depot","deposer","recharger","abonne","abonnes","commande","promouvoir"];
function distance(a:string,b:string) {
  let row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=0;i<a.length;i++){
    const next=[i+1];
    for(let j=0;j<b.length;j++)next[j+1]=Math.min(next[j]+1,row[j+1]+1,row[j]+Number(a[i]!==b[j]));
    row=next;
  }
  return row[b.length];
}
/** Correct only a small action vocabulary, never identifiers, quantities or money. */
export function guidanceLanguage(text:string) {
  const aliases:Record<string,string>={bosster:"booster",boost:"booster",depo:"depot",jveux:"je veux",jvx:"je veux",
    insta:"instagram",ig:"instagram",fb:"facebook",yt:"youtube",cmt:"comment",mom:"mobile money"};
  return normalizeQuestion(expandQuestion(text)).split(" ").map(word=>aliases[word]??
    (word.length>=5?(words.find(known=>known!==word&&Math.abs(known.length-word.length)<=1&&distance(word,known)<=1)??word):word)).join(" ");
}
export type PublicJourney="deposit"|"boost"|"diagnostic"|"cancel";
export function publicJourney(text:string):PublicJourney|undefined {
  const q=guidanceLanguage(text).replace(/\bbuzz booster\b/g,"buzzbooster");
  if(/\b(?:annul\w*|cancel)\b/.test(q)&&/\bcommande\b/.test(q))return "cancel";
  if(/\b(?:verifi\w*|statut|suivi|suivre)\b/.test(q))return undefined;
  const deposit=/\b(?:depot|deposer|recharger|recharge|alimenter|solde|mettre de l argent)\b/.test(q);
  if(deposit&&/\b(?:pourquoi|erreur|ne passe pas|n arrive pas a|impossible de|echec du paiement)\b/.test(q)&&
    !/\b(?:debite|non recu|pas recu|pas arrive|non credite)\b/.test(q))return "diagnostic";
  if(/\b(?:verifi\w*|statut|suivre|suivi|non recu|pas recu|pas arrive|non credite|debite|ma commande|mon depot|mes commandes)\b/.test(q)&&
    !/^(?:comment|je veux faire|je souhaite faire)\b/.test(q))return undefined;
  const want=/\b(?:je veux|j veux|je souhaite|je voudrais|j aimerais|comment|faire|effectuer|recharger|deposer)\b/.test(q);
  if(deposit&&want)return "deposit";
  if((want||/^(?:booster|promouvoir)\b/.test(q))&&
    (/\b(?:booster|promouvoir|augmenter|commander)\b/.test(q)||!!parseCatalogueFields(q).goal))return "boost";
  return undefined;
}

export function paymentClues(text:string) {
  const q=guidanceLanguage(text),result:{country?:string;operator?:string;method?:string}={};
  const country=/\b(cameroun|senegal|cote d ivoire|benin|togo|burkina faso|mali|gabon|congo)\b/.exec(q)?.[1];
  if(country)result.country=country;
  const operator=/\b(wave|orange(?: money)?|mtn(?: momo)?|moov(?: money)?)\b/.exec(q)?.[1];
  if(operator){result.operator=operator;result.method="Mobile Money";}
  else if(/\b(?:crypto|cryptomonnaie|cryptomonnaies)\b/.test(q))result.method="cryptomonnaie";
  else if(/\b(?:mobile money|momo)\b/.test(q))result.method="Mobile Money";
  return result;
}
