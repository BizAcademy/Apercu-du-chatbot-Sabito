import { normalizeQuestion } from "./question-normalization";
import { defaultAbbreviations, tokenSimilarity } from "./question-spelling";

const linguisticWords=new Set(("bonjour bonsoir salut svp s il vous plait merci comment pourquoi quel quelle mon ma mes le la les un une des de du d l j ai je ne n est et ou en dans sur avec sans pas non jamais encore depuis puis peux veut veux voudrais besoin avoir faire a au aux aidez aide plus moins que qui ce cette ces ca cela me m se pour par trop tout tous tres " +
  "inscription inscrire inscrire creer creation ouvrir compte session connexion connecter connecte recuperer recuperation reinitialiser mot passe oublie perdu acceder acces email verification confirmer confirmation valider validation notification application page telephone " +
  "depot depots deposer recharge recharger versement recu recue recues recevoir credit credite creditee debite debitee argent paiement payer paie paiements mobile money momo wave orange mtn moov airtel crypto cryptomonnaie cryptomonnaies crypto monnaie " +
  "commande commandes commander service services reseau reseaux social sociaux suivi suivre statut etat attente bloquer bloque bloquee traitement quantite lien budget annule annulee annuler termine terminee " +
  "bonus attribution attribue attribuer parrainage parrain code filleul recompense commission affiliation " +
  "remboursement remboursements rembourse remboursee rembourser credit portefeuilles portefeuille solde soldes devise montant transaction transactions mouvement mouvements historique consulter voir verifier verification actualiser support assistance contacter joindre erreur probleme fonctionne marche buz buzz booster bca nom numero reference").split(" "));
for(const [word,replacement] of Object.entries(defaultAbbreviations)) {
  linguisticWords.add(word);for(const part of replacement.split(" "))linguisticWords.add(part);
}

/** Never retain a raw member message as a reusable linguistic example. */
export function safeVariant(text:string):string|null {
  if(text.length>4000 || /\b(?:password|mot de passe\s*[:=]|otp|bearer|authorization|api[_ -]?key|secret|token|jwt)\b/i.test(text) ||
    /\beyJ[A-Za-z0-9_-]{10,}\./.test(text)||
    /\b(?:je m.appelle|mon nom est|mon adresse|ma date de naissance|carte bancaire|passeport)\b/i.test(text))return null;
  const safe=text
    .replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi," ")
    .replace(/\b[\p{L}\p{N}_-]*\d[\p{L}\p{N}_-]*\b/gu," ")
    .replace(/\b[A-Z][A-Z_-]{5,}\b/g," ")
    .replace(/\b(?:XAF|XOF|USD|EUR|USDT|BTC|ETH)\b/g," ")
    .replace(/[\d+().-]+/g," ")
    .replace(/\s+/g," ").trim();
  // Long opaque strings, private reference labels and remaining emails are not examples.
  if(safe.length<5 || safe.length>500 || /\b[\p{L}_-]{32,}\b/u.test(safe) ||
    /@|(?:référence|reference|identifiant|numéro|numero)\s*[:=]/iu.test(safe))return null;
  const canonical=normalizeQuestion(safe);
  // Fail closed on names and arbitrary user data: retain only a bounded
  // linguistic vocabulary or a very close spelling of it. Unknown words are
  // discarded as examples, not copied into an administrator's reusable bank.
  if(canonical.split(" ").some(word=>!linguisticWords.has(word)&&
    ![...linguisticWords].some(known=>tokenSimilarity(word,known)>=0.85)))return null;
  return canonical.split(" ").length>=2?safe:null;
}
