import { pool } from "./database";
import { searchState,retrieveReply } from "./question-search";
import { bcaGuides } from "./bca-guide-data";
import { bcaFollowupKind } from "./bca-question-followups";
import { normalizeQuestion } from "./question-normalization";
import { greetingReply } from "./greeting-reply";
import { conversationClosing } from "./conversation-closing";
import type { AccessClaims } from "./security";

type Reply=Awaited<ReturnType<typeof retrieveReply>>;
const social=new Set([conversationClosing,...["bonjour","salut","bonsoir","hello","yo",
  "bonjour comment allez vous","bonsoir comment allez vous","salut comment allez vous"]
  .map(text=>greetingReply(text)).filter(Boolean)]);
const clarify="Quel sujet BCA souhaitez-vous approfondir : les formations, la vente, le parrainage ou les campagnes WhatsApp ? Si vous êtes bloqué, indiquez la rubrique et le message exact, sans information confidentielle.";

/** Explicit follow-ups only. An unrelated message, backend result or another
 * member's history must never become the source of a public answer.
 */
export async function bcaConversationHelp(claims:AccessClaims,conversationId:string,text:string):Promise<Reply|null> {
  const kind=bcaFollowupKind(text);
  if(!kind)return null;
  const state=await searchState(claims.sub);
  if(state.profile!=="bca")return null;
  const ownership=await pool.query(`SELECT s.status FROM sabito_core.conversations c
    LEFT JOIN sabito_core.intent_sessions s ON s.conversation_id=c.id AND s.project_id=c.project_id
    WHERE c.id=$1 AND c.project_id=$2 AND c.external_user_id=$3`,
    [conversationId,claims.sub,claims.externalUserId]);
  if(!ownership.rows.length||["collecting","checking"].includes(String(ownership.rows[0].status)))return null;
  const response=(answer:string,keys:string[]=[],reliable=false):Reply=>{
    const suggestions=keys.flatMap(key=>{
      const title=bcaGuides.find(guide=>guide.key===key)?.title;
      const entry=state.entries.find(item=>item.title===title);
      return entry?[{document_id:entry.documentId,question:entry.title}]:[];
    }).filter((item,index,all)=>all.findIndex(other=>other.document_id===item.document_id)===index).slice(0,3);
    return {answer,reliable,documentId:undefined,suggestions,suggestions_label:suggestions.length?"Choisissez le sujet :":"",
      closing_message:""};
  };
  // An exact administrator-approved answer always overrides these defaults,
  // including newly supplied facts such as a confirmed founding date.
  const documents=await pool.query(`SELECT d.id,d.title,d.content,v.variantes_de_question
    FROM sabito_core.knowledge_documents d LEFT JOIN sabito_core.knowledge_question_variants v
    ON v.document_id=d.id AND v.project_id=d.project_id WHERE d.project_id=$1 AND d.status='ready'`,
    [claims.sub]);
  const exact=documents.rows.find(row=>[String(row.title),...JSON.parse(String(row.variantes_de_question??"[]"))]
    .some(question=>normalizeQuestion(question)===normalizeQuestion(text)));
  if(exact) {
    const reply=await retrieveReply(claims.sub,String(exact.title));
    if(reply.reliable&&reply.answer===String(exact.content))return reply;
  }
  switch(kind) {
    case "year":return response("Je n’ai pas de date de fondation BCA confirmée dans mes références. Je préfère vous le dire plutôt que d’inventer une année. Cette information doit être confirmée par l’équipe BCA.");
    case "duration":return response("Je ne peux pas prédire combien de temps BCA restera disponible ni garantir sa pérennité ou des revenus futurs. Consultez les conditions et communications officielles ; une durée garantie ne peut pas être inventée.");
    case "roles":return response("L’annonceur crée et finance une publicité ; le diffuseur publie des campagnes selon son éligibilité. Je ne peux pas confirmer que les deux rôles sont autorisés simultanément pour un même compte : cette règle doit être précisée par BCA. Vérifiez les options de votre espace sans contourner une restriction.",["26","27"]);
    case "referral-contact":return response("Vous pouvez consulter vos filleuls et les commissions enregistrées dans Parrainage. En revanche, je n’ai pas de procédure confirmée pour les contacter directement depuis BCA. Utilisez uniquement les coordonnées et actions officiellement autorisées, sans rechercher ou divulguer des données privées. L’équipe BCA doit préciser si un bouton de contact existe.",["18"]);
    case "premium-stage":return response("Parlez-vous d’une campagne publicitaire BCA Ads ou d’une étape dans une formation sur les applications premium ? « Campagne 3 abonnement premium » ne suffit pas à identifier le parcours. Indiquez la rubrique et le texte exact affiché, sans information confidentielle.",["28","member-premium-courses"]);
    case "unclear-product":return response("Quand vous dites « produits de vital », parlez-vous des produits digitaux ou d’un autre produit ? Précisez lequel. Je peux ensuite vous orienter vers les autres activités BCA, sans promettre de gains.",["member-income"]);
    case "best-income":return response("Je n’ai pas les statistiques permettant de classer les activités BCA par revenu. Le résultat dépend notamment des compétences, des ventes et des campagnes réellement disponibles et validées. Aucun parcours n’offre un revenu maximal garanti.",["member-income","member-choose-product"]);
    case "identity":return response("Je suis Sabito, l’assistant de service client de BCA. Je vous aide à comprendre les rubriques, les formations et les démarches. Pour une donnée personnelle, il faut une session membre reconnue et une consultation autorisée du backend. Je ne demande jamais votre PIN, votre mot de passe ou un code de connexion.",["member-bca-overview"],true);
    case "exit":return response("Souhaitez-vous fermer la discussion Sabito ou vous déconnecter de BCA ? Fermer le widget ne déconnecte pas votre compte BCA. Pour terminer votre session, utilisez l’action de déconnexion proposée dans votre espace membre ; je ne vous ai pas déconnecté.");
    case "campaign":return response("Parlez-vous de la campagne test, de la publication/vérification d’une campagne, ou de la création d’une publicité pour vos produits ?",["28","30","26"]);
    case "activities":return response("Souhaitez-vous apprendre une compétence, vendre un produit, recommander BCA ou diffuser des campagnes ? Choisissez d’abord un parcours ; aucun revenu n’est garanti.",["member-income","20","27"]);
    case "sell-learn":return response("Souhaitez-vous apprendre une compétence dans une formation, ou vendre une formation que vous avez créée et que vous avez le droit de commercialiser ? Les deux démarches sont différentes.",["20","23"]);
    case "shop":return response("Souhaitez-vous vendre dans Digital Store sur BCA ou créer un site marchand indépendant ? Je peux vous expliquer le parcours vendeur BCA, mais ouvrir un espace vendeur ne signifie pas créer un site externe.",["23"]);
    case "withdrawal":return response("Souhaitez-vous savoir comment effectuer un retrait, ou vérifier un retrait déjà demandé ? Pour un statut personnel, une consultation autorisée est nécessaire ; je n’ai vérifié aucun retrait.",["13","14"]);
    case "incomplete":return response(normalizeQuestion(text)==="j ai une question"
      ?"Bien sûr, posez votre question. Je suis là pour vous aider à comprendre BCA et vous accompagner dans vos démarches."
      :"Pouvez-vous préciser votre demande et la rubrique concernée ? Je ne comprends pas suffisamment ce message pour vous répondre sans deviner.");
  }
  const previous=await pool.query(`SELECT m.id,m.content FROM sabito_core.messages m
    JOIN sabito_core.conversations c ON c.id=m.conversation_id AND c.project_id=m.project_id
    WHERE m.project_id=$1 AND m.conversation_id=$2 AND c.external_user_id=$3
    AND m.role='assistant' AND m.status='completed' ORDER BY m.created_at DESC,m.id DESC LIMIT 6`,
    [claims.sub,conversationId,claims.externalUserId]);
  let anchor:typeof state.entries[number]|undefined;
  for(const message of previous.rows) {
    let content=String(message.content);
    const footer=content.lastIndexOf("\n\nConcernant votre question précédente « ");
    if(footer>=0) {
      const survey=await pool.query(`SELECT id FROM sabito_core.conversation_feedback
        WHERE project_id=$1 AND conversation_id=$2 AND asked_after_message_id=$3 LIMIT 1`,
        [claims.sub,conversationId,message.id]);
      if(survey.rows.length)content=content.slice(0,footer);
    }
    if(kind==="explain"||kind==="detail") {
      // Keep a still-unanswered public choice in scope without selecting an
      // option for the member or falling back to an unrelated older subject.
      if(content.startsWith("Parlez-vous de la campagne test, de la publication/vérification"))
        return response(content,["28","30","26"]);
      if(content.startsWith("Souhaitez-vous apprendre une compétence dans une formation,"))
        return response(content,["20","23"]);
      if(content.startsWith("Souhaitez-vous vendre dans Digital Store sur BCA"))
        return response(content,["23"]);
    }
    // An inline follow-up has its parent's title but a different answer.
    // Prefer a real document, then retain the inline question as the topic.
    anchor=state.entries.find(entry=>entry.exactPriority===3&&entry.content===content)
      ??state.entries.find(entry=>entry.exactPriority===1&&entry.content===content);
    if(anchor)break;
    const publicPrompt=state.entries.some(entry=>content.startsWith(`Pour « ${entry.question} » :`));
    if(!social.has(content)&&!publicPrompt)break;
  }
  const base=anchor?await retrieveReply(claims.sub,anchor.question):null;
  if(base&&(!base.reliable||base.answer!==anchor!.content))return response(clarify);
  const prefix=anchor?`Pour « ${anchor.question} » :\n`:"";
  const next=(answer:string,keys:string[]=[]):Reply=>{
    const reply=response(prefix+answer,keys);
    if(anchor&&!keys.length&&base)reply.suggestions=base.suggestions;
    return reply;
  };
  if(kind==="blocked")return next("Quelle étape ne fonctionne pas et quel message voyez-vous ? S’il s’agit d’un dépôt, précisez si vous parlez du portefeuille ou de l’activation. Un paiement annoncé ne prouve pas un crédit ; ne payez pas une deuxième fois uniquement pour débloquer l’écran.",["member-new-after-deposit","member-whatsapp-views"]);
  if(kind==="validation") {
    if(anchor?.title===bcaGuides.find(guide=>guide.key==="28")?.title)return base;
    return next("S’agit-il de terminer toute la campagne test ou de faire vérifier une publication précise ? Une publication ou une capture envoyée ne suffit pas à confirmer la validation finale.",["28","30"]);
  }
  if(kind==="profile")return next("Cherchez la rubrique Profil de votre espace BCA, puis l’option de sécurité ou de PIN proposée. Quel menu voyez-vous ? Si l’option est absente, indiquez les libellés affichés. Ne communiquez jamais votre PIN dans le chat.",["07"]);
  if(kind==="publish")return next("S’il s’agit d’une diffusion BCA Ads, les contenus demandés se publient sur votre statut WhatsApp selon les consignes de la campagne, puis la publication doit être déclarée et vérifiée dans BCA. S’il s’agit d’un produit à vendre, utilisez plutôt la fiche de votre produit dans Digital Store. Quel parcours suivez-vous ?",["29","23"]);
  if(kind==="started")return next("Votre espace est déjà créé : quel parcours souhaitez-vous suivre maintenant, formation, vente ou campagnes WhatsApp ? Cela ne confirme pas à lui seul l’activation ou la validation d’un paiement.",["20","23","27"]);
  if(kind==="link") {
    const links=[...new Set((anchor?.content.match(/https:\/\/[^\s<>"»]+/g)??[]).map(link=>link.replace(/[).,;]+$/g,"")))]
      .filter(link=>{
        try {
          const url=new URL(link);
          return !url.username&&!url.password&&!/^(localhost|127\.|0\.0\.0\.0)/i.test(url.hostname)&&
            ![...url.searchParams.keys()].some(key=>/token|signature|secret|password|credential|key|expires/i.test(key));
        } catch {return false;}
      }).slice(0,3);
    if(links.length)return {...next("Voici les liens présents dans cette référence approuvée :\n"+links.join("\n")+
      "\nUn contenu réservé peut demander votre connexion et un accès valide."),reliable:true};
    return next("Je ne dispose pas ici d’un lien public vérifié à vous envoyer pour ce contenu. Utilisez la rubrique indiquée dans votre espace BCA. Si vous souhaitez partager votre invitation, copiez votre propre lien dans Parrainage. Quel contenu voulez-vous envoyer et à qui ?",["18","20"]);
  }
  if(kind==="detail")return next("Quel point souhaitez-vous approfondir ? Choisissez une question proposée ou dites précisément quelle étape vous bloque.",anchor?[]:["member-bca-overview","member-income","27"]);
  return base??response(clarify,["member-bca-overview","member-income","27"]);
}
