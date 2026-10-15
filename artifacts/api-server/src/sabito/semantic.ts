// Local, deterministic concept vectors: no remote inference, embeddings API or
// billing. Domain synonyms provide meaning-level matches without shared words.
// It deliberately refuses ambiguous/out-of-vocabulary questions rather than
// claiming universal language understanding.
const groups = [
  ["acces","acceder","accede","consulter","consulte","voir","retrouver","trouver","localiser","afficher","visualiser"],
  ["formation","formations","cours","apprentissage","lecon","lecons","enseignement","enseignements"],
  ["prix","tarif","tarifs","cout","coute","coutent","couter","coutera","couts","couteux"],
  ["connexion","connecter","connecte","connectez","identifier","authentifier","login","identification"],
  ["inscription","inscrire","inscris","enregistrer","enregistrement","registration"],
  ["parrainage","parrain","parrainer","referral","affiliation","affilie","sponsor"],
  ["gains","gain","benefice","benefices","revenus","revenu","remuneration"],
  ["depot","depots","versement","versements","approvisionnement"],
  ["retrait","retraits","retirer","retire","encaissement"],
  ["paiement","paiements","payer","paye","reglement"],
  ["transaction","transactions","operation","operations"],
  ["delai","delais","duree","attendre","attente","temps"],
  ["aide","support","assistance","accompagnement","assister"],
  ["annuler","annulation","abandonner","abandon"],
  ["supprimer","suppression","effacer","effacement"],
  ["creer","creation","ouvrir","ouverture"],
  ["modifier","modification","changer","changement","actualiser","mettreajour"],
  ["telecharger","telechargement","download"],
  ["facture","factures","facturation"],
  ["remboursement","rembourser","rembourse","rembourses"],
  ["securite","securiser","protection","proteger"],
  ["commencer","debuter","demarrer","debutant","debutants"],
];
const concepts=new Map(groups.flatMap(group=>group.map(word=>[word,group[0]] as const)));
const ignored=new Set(("comment quel quelle quels quelles ou est sont le les des du de une un pour avec dans sur aux mon mes son ses ton tes nos vos vous nous puis peux peut pouvoir je jai voudrais souhaite merci svp sil plait ce cette ces cest que qui quoi combien ca avoir disponible disponibles faire fais").split(" "));
export function normalizedText(text:string) {
  return text.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
export function conceptVector(text:string):Set<string> {
  return new Set((normalizedText(text).match(/[\p{L}\p{N}]{3,}/gu)??[])
    .filter(word=>!ignored.has(word))
    .map(word=>concepts.get(word) ?? (word.length>4 && word.endsWith("s") ? word.slice(0,-1) : word)));
}
export function semanticSimilarity(left:string,right:string):number {
  const a=conceptVector(left),b=conceptVector(right);
  if (!a.size || !b.size) return 0;
  const shared=[...a].filter(word=>b.has(word)).length;
  return shared/Math.sqrt(a.size*b.size);
}
