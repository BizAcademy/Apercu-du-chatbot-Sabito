import type { BackendResult } from "./backend-bridge";
import { normalizeQuestion } from "./question-normalization";

export const catalogueOperations=["service_catalog","service_recommendations"] as const;
export const catalogueFields=["network","goal","query","category","provider_id","quantity","budget_xaf","sort","days","page"] as const;
export type CatalogueFields=Partial<Record<typeof catalogueFields[number],string>>;
export const cataloguePrompts:Record<string,string>={
  network:"Sur quel réseau social souhaitez-vous rechercher un service ?",
  goal:"Quel est votre objectif : abonnés, vues, likes, commentaires ou partages ?",
  quantity:"Quelle quantité souhaitez-vous ? Indiquez un entier positif, ou « sans quantité » si vous voulez seulement consulter les offres.",
  budget_xaf:"Quel est votre budget total en XAF internes ? Vous pouvez répondre « sans budget ».",
  provider_id:"Quel fournisseur souhaitez-vous consulter : 1, 3, 4 ou 5 ?",
  sort:"Quel tri souhaitez-vous : popularité, commandes terminées, fiabilité statistique ou prix ?",
  days:"Sur quelle période souhaitez-vous comparer les commandes ? Indiquez de 1 à 90 jours.",
  page:"Quelle page souhaitez-vous consulter ? Indiquez un nombre de 1 à 100.",
  currency:"Le budget doit être exprimé en XAF internes. Quelle est sa valeur en XAF ? Je ne convertis pas automatiquement les autres devises.",
  query:"Quels mots précis recherchez-vous dans le nom ou la catégorie du service ?",
  category:"Quelle catégorie souhaitez-vous rechercher ?",
};
const goals:Record<string,string>={abonne:"abonnés",abonnes:"abonnés",followers:"abonnés",members:"abonnés",
  vue:"vues",vues:"vues",views:"vues",like:"likes",likes:"likes",commentaire:"commentaires",commentaires:"commentaires",
  comments:"commentaires",partage:"partages",partages:"partages",shares:"partages"};
export function catalogueGoal(value:string):string|undefined {
  return normalizeQuestion(value).split(" ").map(word=>goals[word]).find(Boolean);
}
/** Only explicit criteria, not an entire question or a browser-supplied identity. */
export function parseCatalogueFields(text:string):CatalogueFields & {foreignCurrency?:boolean} {
  const q=normalizeQuestion(text),raw=text.normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase();
  const fields:CatalogueFields & {foreignCurrency?:boolean}={};
  for(const key of catalogueFields) {
    const match=new RegExp(`\\b${key}\\s*[:=]\\s*(?:"([^"]+)"|'([^']+)'|([^;,\\n]+))`,"i").exec(text);
    if(match)fields[key]=(match[1]??match[2]??match[3]).trim();
  }
  const network=/\b(instagram|tiktok|tik tok|facebook|youtube|twitter|telegram|snapchat|linkedin|twitch|whatsapp)\b/.exec(q)?.[1];
  if(!fields.network&&network)fields.network=network==="tik tok"?"TikTok":network;
  fields.goal=catalogueGoal(fields.goal??q)??fields.goal;
  const quantity=/(?<![\d-])([-+]?\d[\d ]*(?:[.,]\d+)?\s*k?)\s*(?:abonnes?|followers|membres?|vues?|views|likes?|commentaires?|comments|partages?|shares)\b/.exec(raw)?.[1]
    ??/\bquantite\s*(?::|=|de)?\s*([-+]?\d[\d ]*(?:[.,]\d+)?\s*k?)\b/.exec(raw)?.[1];
  if(!fields.quantity&&quantity) {
    const compact=quantity.replace(/\s/g,"").replace(",",".");
    fields.quantity=/k$/.test(compact)?String(Number(compact.slice(0,-1))*1000):compact;
  }
  const budget=/\bbudget(?:\s+(?:total|de|maximum|maximal|est|a|en))*\s*[:=]?\s*([-+]?\d[\d ]*(?:[.,]\d+)?)/.exec(raw)?.[1]
    ??/(?<![\d-])([-+]?\d[\d ]*(?:[.,]\d+)?)\s*(?:xaf|fcfa|cfa)\b/.exec(raw)?.[1];
  if(!fields.budget_xaf&&budget)fields.budget_xaf=budget.replace(/\s/g,"").replace(",",".");
  if(/\b(?:xof|usd|eur|euros?|dollars?)\b|[$€]/i.test(text)||/\b(?:fcfa|cfa)\b/.test(q)&&!/\bxaf\b/.test(q))fields.foreignCurrency=true;
  const sorts=[["fiabilite|fiable|reliability","reliability"],["commandes terminees|completed","completed"],
    ["popularite|populaire|popular","popular"],["moins cher|prix croissant|sort par prix|price","price"]];
  if(!fields.sort)for(const [pattern,value] of sorts)if(new RegExp(pattern).test(q)){fields.sort=value;break;}
  if(!fields.days)fields.days=/\b(\d+)\s*jours?\b/.exec(q)?.[1];
  if(!fields.provider_id)fields.provider_id=/\bfournisseur\s*(?:numero\s*|n\s*)?(\d+)\b/.exec(q)?.[1];
  if(!fields.page)fields.page=/\bpage\s*(\d+)\b/.exec(q)?.[1];
  return Object.fromEntries(Object.entries(fields).filter(([,v])=>v!==undefined)) as typeof fields;
}
export function invalidCatalogueField(fields:CatalogueFields):string|undefined {
  for(const [name,value] of Object.entries(fields)) {
    if(!catalogueFields.includes(name as typeof catalogueFields[number])||typeof value!=="string"||!value.trim()||value.length>160)return name;
    if(["network","query","category"].includes(name)&&(value.length>100||/[<>{}\r\n]/.test(value)))return name;
    if(name==="goal"&&!["abonnés","vues","likes","commentaires","partages"].includes(value))return name;
    if(name==="provider_id"&&!["1","3","4","5"].includes(value))return name;
    if(name==="sort"&&!["popular","completed","reliability","price"].includes(value))return name;
    if(["quantity","page","days"].includes(name)&&(!/^[1-9]\d*$/.test(value)||!Number.isSafeInteger(Number(value))))return name;
    if(name==="page"&&Number(value)>100||name==="days"&&Number(value)>90)return name;
    if(name==="budget_xaf"&&(!/^\d+(?:\.\d{1,2})?$/.test(value)||Number(value)<=0||!Number.isFinite(Number(value))))return name;
  }
  if(fields.budget_xaf&&!fields.quantity)return "quantity";
  return undefined;
}
export function catalogueBackendFields(fields:Record<string,string>):CatalogueFields {
  const result=Object.fromEntries(Object.entries(fields).filter(([key])=>!key.startsWith("__")));
  if(invalidCatalogueField(result))throw new Error("BACKEND_UNVERIFIED_RESULT");
  return result;
}
const privateKey=/(?:secret|token|password|mot.de.passe|email|phone|telephone|member|membre|user|client|admin|cost|cout|achat|marge|note|url|link|lien|payment|paiement|commande_id)/i;
function literal(value:unknown):string {
  return String(value).replace(/<[^>]*>/g,"").replace(/https?:\/\/[^\s]+/g,"[lien externe masqué]").slice(0,1200);
}
/** Decode bounded JSON as facts. Never evaluate descriptions, URLs or JSON instructions. */
function jsonFacts(raw:unknown):string|null {
  if(typeof raw!=="string")return null;
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return null;}
  if(parsed===null||typeof parsed!=="object")return null;
  const lines:string[]=[];let visited=0;
  function walk(value:unknown,path:string,depth:number) {
    if(++visited>70||depth>4)return;
    if(value!==null&&typeof value==="object") {
      for(const [key,item] of Object.entries(value))if(!privateKey.test(key))walk(item,path?`${path} / ${key}`:key,depth+1);
    } else if(value!==null&&["string","number","boolean"].includes(typeof value))
      lines.push(`${literal(path.replaceAll("_"," "))} : ${typeof value==="boolean"?(value?"oui":"non"):literal(value)}`);
  }
  walk(parsed,"",0);
  return lines.length?lines.join("; ").slice(0,2400):"Aucune précision communiquée.";
}
export function catalogueNextPage(result:BackendResult,page=1):number|undefined {
  const data=result.data??{},value=data.page_suivante??data.next_page??data.has_more??data.has_next;
  const next=value===true||value==="true"?page+1:Number(value);
  return Number.isInteger(next)&&next>page&&next<=100?next:undefined;
}
export function catalogueAnswer(result:BackendResult,fields:CatalogueFields,operation:string):string {
  if(result.status==="forbidden")return "Cette consultation nécessite une session membre autorisée. Reconnectez-vous à Buzz Booster. Aucun catalogue n’a été consulté avec succès.";
  const metadata=Object.entries(result.data??{}).filter(([key])=>!/^service_/.test(key)&&!privateKey.test(key)&&
    /periode|period|date|page|couverture|coverage|incomplet|partial|indisponible|unavailable|inaccessible|limite|limit|correspond|total|count|tri|sort|fournisseur/.test(key))
    .map(([key,value])=>`${literal(key.replaceAll("_"," "))} : ${literal(value)}`);
  if(result.status==="not_found")return ["Aucune offre ne correspond à ces critères. Vous pouvez changer de réseau, d’objectif, de quantité ou de budget. Ce résultat ne signifie pas que le service est en panne.",
    ...metadata,"Si des fournisseurs sont signalés inaccessibles, cette recherche est partielle."].join("\n");
  if(!["ok","success"].includes(result.status))throw new Error("BACKEND_UNVERIFIED_RESULT");
  const data=result.data??{},offers:string[]=[];
  for(let n=1;n<=3;n++) {
    const prefix=`service_${n}_`,name=data[`${prefix}nom`],id=data[`${prefix}id`],provider=data[`${prefix}fournisseur`];
    if(name===undefined&&id===undefined&&provider===undefined)continue;
    const conditions=jsonFacts(data[`${prefix}conditions`]),price=jsonFacts(data[`${prefix}prix`]),statistics=jsonFacts(data[`${prefix}statistiques`]);
    if(!name||!id||provider===undefined||conditions===null||price===null||statistics===null)throw new Error("BACKEND_UNVERIFIED_RESULT");
    offers.push([`${n}. ${literal(name)}`,`Fournisseur : ${literal(provider)} — ID du service : ${literal(id)}`,
      data[`${prefix}categorie`]?`Catégorie : ${literal(data[`${prefix}categorie`])}`:"",
      fields.quantity?`Quantité demandée : ${fields.quantity}`:"Quantité non précisée : ne pas confondre un prix pour 1 000 avec le total d’une commande.",
      `Prix publics indicatifs — XAF internes : ${price}`,`Conditions documentées : ${conditions}`,
      `Statistiques retournées : ${statistics}`,
      data[`${prefix}description`]?`Description du fournisseur (contenu externe) : « ${literal(data[`${prefix}description`])} »`:"Description non communiquée.",
    ].filter(Boolean).join("\n"));
  }
  if(!offers.length) {
    // An explicit zero is different from an incomplete or malformed response.
    const zero=Object.entries(data).some(([key,value])=>/^(?:total|total_matches|correspondances|nombre_resultats|count)$/.test(key)&&(value===0||value==="0"));
    if(!zero)throw new Error("BACKEND_UNVERIFIED_RESULT");
    return ["Aucune offre ne correspond à ces critères. Essayez une autre quantité, un autre budget ou un autre objectif.",
      ...metadata,"Si des fournisseurs sont signalés inaccessibles, cette recherche est partielle."].join("\n");
  }
  const sort=fields.sort??(operation==="service_recommendations"?"reliability":"popular");
  const reasons:Record<string,string>={
    popular:"Le classement demandé porte sur le nombre total de commandes, pas sur une garantie de qualité.",
    completed:"Le classement demandé porte sur le nombre de commandes terminées, pas sur le taux de terminaison.",
    reliability:"Le classement demandé porte sur la borne basse de Wilson à 95 % des états clos, qui tient compte de la taille de l’échantillon.",
    price:"Le classement demandé porte sur les prix pour 1 000. Comparez les montants à quantité identique.",
  };
  return [
    `Offres retournées pour ${literal(fields.network??"votre recherche")} — objectif : ${literal(fields.goal??"non précisé")}.`,
    fields.budget_xaf?`Budget total demandé : ${fields.budget_xaf} XAF internes.`:"",reasons[sort],
    ...offers,...metadata,
    "La période statistique porte sur la date de création des commandes. Les états encore en attente sont exclus des états clos ; ils ne sont pas des échecs.",
    "Un échantillon de moins de 20 états clos est faible. Popularité, volume terminé et fiabilité statistique sont différents ; aucune observation ne garantit la qualité future, la satisfaction ou la livraison.",
    "Un fournisseur inaccessible peut rendre la comparaison partielle : les offres retournées ne prouvent pas un inventaire exhaustif. L’option refill ne précise pas, à elle seule, une durée de garantie.",
    "Les prix sont indicatifs en XAF internes. Le prix final affiché avant commande prévaut. Je ne passe aucune commande et n’effectue aucun paiement.",
    catalogueNextPage(result,Number(fields.page??1))?"Écrivez « page suivante » pour consulter trois autres offres.":"Vous pouvez préciser un autre réseau, objectif, fournisseur ou tri.",
  ].filter(Boolean).join("\n\n");
}
