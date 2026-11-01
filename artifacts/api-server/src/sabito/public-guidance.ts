import { createHash } from "node:crypto";
import { z } from "zod";
import { pool } from "./database";
import { searchState } from "./question-search";
import { isVerifiedMember } from "./templates";
import type { AccessClaims } from "./security";
import { catalogueFields,parseCatalogueFields } from "./buzzbooster-catalogue";
import { handleBuzzCatalogue } from "./buzzbooster-catalogue-flow";
import { guidanceLanguage,paymentClues,publicJourney } from "./public-guidance-language";
import { greetingReply } from "./greeting-reply";
import { isClosingAcknowledgement } from "./conversation-closing";
import { guidanceBudget,guidanceBudgetSchema,budgetAdvice,purposeAnswer } from "./guidance-budget";

const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const contextSchema=z.object({
  topic:z.enum(["deposit","boost","diagnostic","cancel","purpose"]),
  questionId:z.string().uuid(),awaiting:z.enum(["method","network","goal","details","catalogue","currency","funding","usable","quantity"]).optional(),
  budget:guidanceBudgetSchema.optional(),
  country:z.string().max(80).optional(),operator:z.string().max(80).optional(),method:z.string().max(40).optional(),
  filters:z.record(z.string(),z.string().max(160)).refine(fields=>Object.keys(fields).every(key=>
    (catalogueFields as readonly string[]).includes(key))).default({}),
  foreignCurrency:z.boolean().optional(),
});
type Context=z.infer<typeof contextSchema>;
export type GuidanceReply={answer:string;context:Context;continuing:boolean};
const depositSteps="Pour recharger votre solde :\n1. Ouvrez « Recharger ».\n2. Choisissez un moyen de paiement disponible.\n3. Pour Mobile Money, sélectionnez le pays et l’opérateur proposés, puis renseignez votre numéro.\n4. Saisissez le montant et vérifiez les frais ainsi que le total.\n5. Confirmez et suivez les instructions de paiement. Avec Wave, poursuivez dans l’application ou la page proposée.\n6. Attendez la confirmation du crédit avant de commander.";
const orderSteps="Pour commander un service sur Buzz Booster :\n1. Rechargez votre solde si nécessaire.\n2. Ouvrez « Nouvelle commande ».\n3. Choisissez le catalogue, la catégorie et le service adaptés.\n4. Lisez les conditions et renseignez le lien demandé ainsi que la quantité.\n5. Vérifiez le prix final puis validez.\n6. Suivez la commande dans « Ordres ».\nLes offres affichées font foi : je ne promets ni ventes, ni monétisation, ni résultats organiques.";

/** Public procedures never substitute for, or mutate, a financial verification.
 * Context is accepted only for the same owner and the immediately preceding answer. */
export async function publicGuidance(claims:AccessClaims,conversationId:string,text:string,questionId:string):Promise<GuidanceReply|null> {
  if(greetingReply(text)||isClosingAcknowledgement(text))return null;
  const {profile,settings}=await searchState(claims.sub);
  if(profile!=="buzzbooster")return null;
  const journey=publicJourney(text),q=guidanceLanguage(text);
  const rows=await pool.query(`SELECT g.context_json,g.answer_hash,m.content FROM sabito_core.conversations c
    LEFT JOIN sabito_core.public_guidance_context g ON g.conversation_id=c.id AND g.project_id=c.project_id
    LEFT JOIN sabito_core.messages m ON m.id=(SELECT last.id FROM sabito_core.messages last
      WHERE last.conversation_id=c.id AND last.project_id=c.project_id AND last.role='assistant' AND last.status='completed'
      ORDER BY last.created_at DESC,last.id DESC LIMIT 1)
    WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3
      AND c.created_at>DATE_SUB(CURRENT_TIMESTAMP(6),INTERVAL 24 HOUR)`,
    [conversationId,claims.sub,claims.externalUserId]);
  if(!rows.rows[0])return null;
  const stored=rows.rows[0];
  let previous:Context|undefined;
  if(stored.context_json&&stored.answer_hash===hash(String(stored.content??""))) {
    try {previous=contextSchema.parse(JSON.parse(String(stored.context_json)));}catch{/* Never trust malformed stored context. */}
  }
  const clues=paymentClues(text),parsed=parseCatalogueFields(q);
  // Numeric parameters/currencies retain their exact input spelling and semantics.
  Object.assign(parsed,parseCatalogueFields(text));
  const explicitCheck=/\b(?:verifi\w*|statut|suivi|suivre|non recu|pas recu|pas arrive|non credite|debite|ma commande|mon depot)\b/.test(q);
  const methodOnly=/^(?:wave|orange(?: money)?|mtn(?: momo)?|moov(?: money)?|mobile money|momo|crypto|cryptomonnaie)$/.test(q);
  const criteriaOnly=Object.keys(parsed).length>0&&q.split(" ").length<=12&&!explicitCheck;
  const continuing=!journey&&!!previous&&previous.topic!=="cancel"&&previous.awaiting!=="catalogue"&&!explicitCheck&&
    (methodOnly||["boost","purpose"].includes(previous.topic)&&criteriaOnly||!!clues.country||
      ["currency","funding","usable","quantity"].includes(previous.awaiting??"")&&q.length<160&&
        (/\b(?:xaf|xof|usd|eur|portefeuille|frais|solde|disponible|deposer)\b/.test(q)||/^\d[\d ]*$/.test(q))||
      previous.awaiting==="details"&&q.length<240&&!/^(?:comment|pourquoi|quel|quels|quelle|quelles|c est quoi|je veux|je souhaite)\b/.test(q));
  if(!journey&&!continuing)return null;
  const sameTopic=previous&&(previous.topic===journey||continuing);
  const context:Context=sameTopic&&previous?{...previous,filters:{...previous.filters}}:
    {topic:journey!,questionId,filters:{}};
  if(journey)context.topic=journey;
  if(continuing&&context.topic==="purpose")context.topic="boost";
  Object.assign(context,clues);
  for(const key of catalogueFields)if(parsed[key]!==undefined)context.filters[key]=parsed[key]!;
  if(parsed.foreignCurrency)context.foreignCurrency=true;
  context.budget=guidanceBudget(text,context.budget,previous?.awaiting);
  if(context.budget) {
    // No ambiguous currency or gross deposit amount ever reaches budget_xaf.
    delete context.filters.budget_xaf;
    if(context.budget.currency==="XAF"&&context.budget.funding==="wallet"&&context.budget.amount)
      context.filters.budget_xaf=context.budget.amount;
    context.foreignCurrency=context.budget.currency==="foreign";
  }
  if(continuing&&previous?.awaiting==="quantity"&&/^\d+$/.test(q))context.filters.quantity=q;
  delete context.awaiting;
  let answer:string;
  if(context.topic==="purpose") {
    answer=purposeAnswer;context.awaiting="network";
  } else if(context.topic==="cancel") {
    answer="Pour demander l’annulation d’une commande, ouvrez « Ordres », retrouvez son numéro et utilisez la demande prévue par la plateforme. Si cette option n’est pas proposée, ouvrez « Support » et indiquez le numéro de la commande ainsi que le motif.\nUne demande ne signifie pas que la commande est annulée ou remboursée. Je n’exécute pas cette action à votre place.";
  } else if(context.topic==="diagnostic") {
    const info=[context.operator,context.country].filter(Boolean).join(" — ");
    answer=`${info?`Pour votre paiement ${info}, vérifiez`:"Vérifiez"} le pays, l’opérateur et le numéro dans « Recharger », la disponibilité du moyen de paiement et le récapitulatif des frais. Si vous avez déjà été débité, consultez « Historique paiements » et ne payez pas à nouveau avant clarification. Une difficulté technique ne prouve pas l’échec du dépôt.`;
    if(/\b(?:whitelist|payin|forbidden)\b/.test(q))answer+="\nUne erreur whitelist/PAYIN/forbidden peut signaler un blocage technique côté prestataire : contactez le support avec le message affiché, sans mot de passe ni code secret.";
    else if(continuing&&previous?.awaiting==="details")answer+=/\b(?:numero|telephone|phone|format)\b/.test(q)
      ?"\nPour une erreur de numéro, reprenez le format attendu dans le formulaire pour le pays sélectionné et vérifiez que ce numéro correspond au compte de paiement choisi. Ne transmettez pas d’OTP ici."
      :/\b(?:solde|montant|frais|insuffisant)\b/.test(q)
        ?"\nVérifiez le solde du compte de paiement, le total avec frais et les limites indiquées par le formulaire courant. Je ne peux pas déduire un débit ou un crédit de ce message d’erreur."
        :"\nVérifiez les champs indiqués par le formulaire et la disponibilité du moyen de paiement. Si le message persiste malgré ces vérifications, transmettez-le au support sans code confidentiel. Je ne peux pas en déduire le statut financier d’un paiement.";
    else {answer+="\n\nQuel message d’erreur voyez-vous exactement, sans code secret ?";context.awaiting="details";}
  } else if(context.topic==="deposit") {
    const info=[context.operator,context.country].filter(Boolean).join(" — ");
    if(!context.method) {answer=depositSteps+"\n\nQuel moyen de paiement souhaitez-vous utiliser parmi ceux affichés dans « Recharger » ?";context.awaiting="method";}
    else if(context.method==="cryptomonnaie")answer="Si la cryptomonnaie est proposée dans « Recharger », choisissez cette méthode, indiquez le montant, vérifiez le portefeuille crédité, les frais et le total. Poursuivez uniquement sur la page sécurisée et respectez la devise, le réseau, l’adresse et l’expiration qui y sont affichés. Attendez la confirmation du crédit. Ne réutilisez pas une ancienne adresse et ne payez pas une deuxième fois avant clarification.";
    else if(context.operator)answer=`Si ${info} est proposé dans « Recharger », sélectionnez cette option, renseignez votre numéro et le montant, puis vérifiez les frais et le total avant de confirmer.${context.operator==="wave"?" Poursuivez avec le bouton ou la redirection vers l’application ou la page Wave.":" Validez ensuite uniquement dans le parcours sécurisé de l’opérateur."} Attendez la confirmation dans « Historique paiements » et le crédit du solde. Ne transmettez jamais votre OTP dans le chat.`;
    else answer=`Dans « Recharger », sélectionnez Mobile Money${context.country?` et le pays ${context.country}`:""}, puis un opérateur réellement affiché. Renseignez le numéro et le montant, vérifiez les frais et le total, puis suivez les instructions sécurisées de paiement. Attendez la confirmation du crédit.`;
  } else {
    const {network,goal}=context.filters;
    const intro=sameTopic?"":context.budget
      ?`Je peux vous aider à choisir selon votre budget${context.budget.amount?` de ${context.budget.amount}${context.budget.currency==="XAF"?" XAF":""}`:""}. Ce montant déclaré n’est pas une vérification du solde réel. Aucune offre n’a encore été confirmée comme finançable.\n${budgetAdvice}\n\n`
      :orderSteps+"\n\n";
    if(!network){answer=intro+"Quel réseau social souhaitez-vous booster ?";context.awaiting="network";}
    else if(!goal){answer=intro+`Pour ${network}, quel est votre objectif : abonnés, vues, likes, commentaires ou partages ?`;context.awaiting="goal";}
    else if(context.budget&&context.budget.currency!=="XAF"){
      answer=intro+"Pour comparer un budget, il faut un montant en XAF internes. « F » ou « FCFA » seul ne distingue pas XAF et XOF ; je ne convertis pas automatiquement les devises. Quel budget souhaitez-vous utiliser en XAF ?";context.awaiting="currency";
    } else if(context.budget&&context.budget.funding==="unknown"){
      answer=intro+"Ce budget est-il déjà disponible dans votre portefeuille Buzz Booster, ou correspond-il à la somme totale à déposer, frais compris ?";context.awaiting="funding";
    } else if(context.budget&&context.budget.funding==="total"){
      answer=intro+"Les frais de dépôt peuvent réduire le budget utilisable pour la commande. Vérifiez le récapitulatif dans « Recharger » ; je n’invente pas ces frais. Quel montant net en XAF sera disponible pour commander après les frais ?";context.awaiting="usable";
    } else if(context.budget&&(!context.budget.amount||!context.filters.quantity)&&isVerifiedMember(claims)){
      answer=intro+(!context.budget.amount?"Quel montant en XAF souhaitez-vous consacrer à cette commande ?":"Quelle quantité souhaitez-vous comparer avec ce budget ? Je vérifierai les minimums et maximums retournés par le catalogue avant de proposer une offre.");context.awaiting=context.budget.amount?"quantity":"usable";
    }
    else if(isVerifiedMember(claims)&&settings.intents.some(i=>i.enabled&&["service_catalog","service_recommendations"].includes(i.backend_function))) {
      const fields=Object.entries(context.filters).map(([k,v])=>`${k}: ${v}`).join("; ");
      const canRecommend=settings.intents.some(i=>i.enabled&&i.backend_function==="service_recommendations");
      const canList=settings.intents.some(i=>i.enabled&&i.backend_function==="service_catalog");
      const trigger=canRecommend&&(!canList||context.filters.quantity||context.filters.budget_xaf)?"recommande un service":"consulter le catalogue";
      const catalogue=await handleBuzzCatalogue(claims,conversationId,`${trigger}; ${fields}${context.foreignCurrency?"; devise XOF":""}`,settings);
      answer=intro+(catalogue??"Consultez les offres actuelles dans « Nouvelle commande ». Aucune offre précise n’a été vérifiée.");
      context.awaiting="catalogue";
    } else answer=intro+`Pour des ${goal} sur ${network}, ouvrez « Nouvelle commande » et recherchez les offres correspondant à cet objectif. Vérifiez le type de lien, les limites de quantité, les conditions et le prix final avant de valider. Je n’ai pas consulté de catalogue membre dans cet échange et je ne peux pas citer d’offre précise comme disponible. Une connexion membre autorisée est nécessaire pour utiliser ces outils de comparaison.`;
  }
  return {answer,context,continuing};
}

export async function savePublicGuidance(projectId:string,conversationId:string,value:GuidanceReply,answer:string) {
  await pool.query(`INSERT INTO sabito_core.public_guidance_context(conversation_id,project_id,context_json,answer_hash)
    VALUES($1,$2,$3,$4) ON DUPLICATE KEY UPDATE context_json=VALUES(context_json),answer_hash=VALUES(answer_hash),updated_at=CURRENT_TIMESTAMP(6)`,
    [conversationId,projectId,JSON.stringify(value.context),hash(answer)]);
}
