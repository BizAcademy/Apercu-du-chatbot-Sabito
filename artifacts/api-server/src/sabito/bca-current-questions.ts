import { normalizeQuestion } from "./question-normalization";
import { bca152QuestionGroups } from "./bca-152-questions";
import { bca70QuestionGroups } from "./bca-70-questions";
import { bcaMemberGuidance,bcaMemberPrivateGroups,bcaMemberShortTurns,bcaMemberClarification } from "./bca-member-guidance";

/** Owner's November instructions. No live tariff, availability or account
 * result is embedded here. Private targets are existing read-only handlers. */
export type BcaQuestionRoute = {
  key:string;kind:"public"|"context"|"private";target:string;source:string;
  questions:string[];answer?:string;
};
const support="https://bcachat.bizconnectacademy.com";
const context=(key:string,questions:string[],answer:string):BcaQuestionRoute=>({
  key,kind:"context",target:key,source:"Consignes explicites du propriétaire ; aucune donnée personnelle vérifiée",
  questions,answer,
});
export const bcaReferralAmounts="Les commissions prévues sont des montants fixes : 1 500 F au niveau 1, 500 F au niveau 2 et 300 F au niveau 3.";
const gettingStarted="Vous êtes déjà inscrit : inutile de recréer un compte. Vous pouvez apprendre avec les formations, vendre un produit numérique que vous avez le droit de commercialiser, recommander BCA ou consulter les campagnes WhatsApp disponibles selon leurs conditions. Aucun revenu n’est garanti. Pour commencer, quel parcours vous intéresse : apprendre, vendre, parrainage ou campagnes ?";
const referral="Retrouvez la rubrique Parrainage dans votre compte BCA pour copier votre propre code et votre lien personnel, puis partagez-les avec les personnes intéressées, sans messages non sollicités. Les filleuls et commissions enregistrées se consultent aussi dans « Mes gains ». Pour que je consulte votre code réel avec une session vérifiée, dites « Mon code parrainage ». "+bcaReferralAmounts+" Le niveau 1 correspond à la personne directement parrainée, puis les niveaux 2 et 3 à la suite de sa chaîne. L’attribution dépend des conditions et de l’événement prévu par BCA ; partager le lien ou une simple inscription ne garantit pas une commission.";
const seller="Pour vendre votre propre formation ou un produit numérique, ouvrez Digital Store puis l’espace vendeur. Créez une fiche avec le titre, la description, la catégorie, le prix, la devise et les autres informations demandées. Vérifiez les frais et conditions affichés avant de soumettre. Ajoutez un lien HTTPS qui donne bien accès au contenu après l’achat : pour Google Drive, configurez l’accès du lecteur autorisé et testez le lien ; les liens de réseaux sociaux ne sont pas des liens de livraison. Si le contenu est hébergé sur Chariow ou Maketou, il doit y être configuré gratuitement pour éviter un second paiement. Relisez les règles avant l’envoi : la fiche peut rester en attente et son approbation n’est pas automatique. Ne vendez que des contenus que vous avez le droit de commercialiser. Voyez-vous l’espace vendeur ou êtes-vous bloqué dans le formulaire ?";
const pricing="Je n’ai pas de handler raccordé qui fournisse le tarif actuel de publication. Dans l’espace vendeur Digital Store, consultez le récapitulatif actuel avant de confirmer : distinguez création, publication, modification, abonnement vendeur et frais de vente éventuels. Je ne peux confirmer ni un montant ni la gratuité à partir d’une ancienne archive. Si ces informations ne s’affichent pas, contactez "+support+". Ne payez pas sur un numéro reçu dans le chat.";
const learning="Quel domaine et quel objectif vous intéressent ? Consultez la liste actuelle des formations dans BCA ; je ne peux pas établir un classement mondial des compétences ni garantir des revenus. Pour consulter les offres actuellement publiées avec le service autorisé, dites « Consulter le catalogue actuel ». Une formation présente dans un ancien catalogue n’est pas nécessairement disponible ou gratuite aujourd’hui.";
const pack="Vous pouvez préparer un contenu dont vous avez les droits, mais je n’ai pas vérifié que le formulaire vendeur actuel accepte votre pack PDF et vidéo, ni qu’un acheteur puisse payer sans compte BCA et télécharger directement sur son téléphone. Vérifiez les formats et le parcours d’achat actuels avant de publier. Pour une formation, le propriétaire demande un lien Google Drive accessible à l’acheteur après achat ; les liens de réseaux sociaux ne conviennent pas comme livraison. Avec Chariow ou Maketou, le produit externe doit être gratuit pour éviter un second paiement. Souhaitez-vous les étapes pour vérifier le partage Google Drive ?";

export const bcaCurrentRoutes:BcaQuestionRoute[]=[
  context("current-onboarding",[
    "Je ne comprend pas le BCA","Je ne comprends pas BCA","Aide moi à gagner de l'argent sur bca",
    "Comment gagner sur BCA","Comment commencer a gagner l'argent",
    "Tout mais je ne sais pas comment me procéder","Tout mais je ne sais pas comment procéder",
    "Je viens de m’inscrire","Comment commencer à gagner de l’argent",
  ],gettingStarted),
  context("current-referral",[
    "Comment ouvrir le rubrique de parrainage","Comment ouvrir la rubrique de parrainage",
    "Comment faire un parrainage","C'est comment le parrainage ?","Comment fonctionne le code parrain ?",
    "Peut-on gagner de l'argent avec le parrainage ?","Quels sont les commissions de parrainage ?",
    "Quelles sont les commissions de parrainage ?","Commission par niveau","Combien gagne un parrain",
  ],referral),
  context("current-seller",[
    "Comment créer mes propres produits digitaux et les vendres?",
    "Comment créer mes propres produits digitaux et les vendre",
    "Comment vendre les produits digitaux sur la BCA","Comment vendre un article sur le site",
    "Je veux vendre ma formation","Comment créer ma propre formation dans BCA ?",
    "Comment vendre sa propre formation sur BizConnect Academy",
    "Comment vendre ma formation sur BizConnect Academy",
    "Comment vendre ma formation sur bisxonnected",
    "Comment vendre sa propre formation sur bisxonnected",
    "Comment vendre sa propre formation sur BizConnect Academy",
    "Comment vendre un produit","Comment vendre un produit sur BCA",
  ],seller),
  context("current-publish-price",[
    "Le prix pour publier un produit","Pour créer un produit et publier est-ce que c'est payant",
    "Pour créer un produit et publier, est-ce que c’est payant ?","Frais pour publier un produit",
  ],pricing),
  context("current-price-choice",["Le prix","Je veux savoir le prix","C'est gratuit ?"],
    "De quel prix ou frais parlez-vous : formation, publication d’un produit, abonnement vendeur, campagne ou retrait ? Le tarif actuel doit être vérifié dans le parcours concerné ; je ne vais pas deviner un montant."),
  context("current-learning",[
    "Apprendre une compétence","Si vous pouvez m'aider avec  certaine compétence que vous connaissez qui plus recherché dans le monde",
    "Si vous pouvez m’aider avec une compétence que vous connaissez et qui est recherchée dans le monde",
  ],learning),
  context("current-pack",[
    "Est-ce possible de créer un pack de formation en pdf et vidéo puis partager le lien et les gens arrivent à payer sans s'inscrire sur BCA et téléchargé le pack dans sont téléphone",
    "Est-ce possible de créer un pack de formation en PDF et vidéo, partager le lien, et permettre aux gens de payer sans s’inscrire sur BCA puis de télécharger le pack sur leur téléphone ?",
  ],pack),
  context("current-campaign-guide",["Comment fonctionne la campagne","Comments gagne Argent grace a whatsapp",
    "Comment gagner de l'argent grâce à WhatsApp","Comment fonctionne une campagne",
    "Comment la déclarer","Comment déclarer ma publication","Comment déclarer la campagne"],
    "Dans BCA Ads Network, ouvrez la campagne et la journée concernées. Après avoir publié le contenu demandé sur WhatsApp, utilisez l’étape de déclaration affichée, renseignez les éléments demandés et soumettez la vérification dans le délai indiqué. Une déclaration ou une publication ne confirme pas encore la validation ni le paiement. Les campagnes rémunérées doivent être disponibles pour votre profil ; consultez leurs conditions et le tarif affiché avant de participer. Souhaitez-vous les étapes de publication ou vérifier une journée précise ?"),
  context("current-free-campaign",["Faire une campagne publicitaire gratuitement"],
    "Parlez-vous de créer une publicité comme annonceur ou de participer à la campagne test comme diffuseur ? Le test n’est pas une publicité gratuite pour promouvoir votre produit. Je n’ai pas vérifié de formule annonceur gratuite : consultez le budget et les conditions dans le formulaire actuel avant toute validation."),
  context("current-advertiser",["Je veux être annonceur"],
    "Dans BCA Ads Network, choisissez le parcours annonceur, consultez les conditions, préparez les éléments demandés et vérifiez le ciblage, le budget et le récapitulatif du formulaire actuel avant de confirmer. Je n’ai créé ni financé de campagne et ne garantis ni validation, ni vues, ni clients. Si le menu diffère, indiquez ce que vous voyez sans information confidentielle."),
  context("current-ads-error",["Quand je rentre dans ads network sa écrit erreur","Quand je rentre dans Ads Network, ça écrit erreur"],
    "Quel message exact apparaît dans Ads Network et êtes-vous annonceur ou diffuseur ? Je ne peux pas vérifier une panne à partir de ce seul message. N’envoyez aucun PIN, mot de passe, OTP ou jeton ; si vous transmettez une capture au support officiel, masquez les données confidentielles. Si le blocage persiste, contactez "+support+"."),
  context("current-views",["Les vues"],
    "Parlez-vous des vues affichées sur WhatsApp, de celles validées par BCA ou du montant crédité ? Ce sont des informations différentes. Pour une journée précise, une consultation autorisée de votre compte est nécessaire ; je n’ai encore vérifié ni vues ni paiement."),
  context("current-activation",["Non un activation","Non, une activation"],
    "Vous parlez donc de l’activation du compte, pas d’un autre service. Consultez le parcours d’activation affiché dans votre compte et son récapitulatif actuel. Pour vérifier votre propre paiement, dites « Vérifier mon activation » ; une session reconnue et la référence non confidentielle du paiement seront nécessaires. Je n’ai activé ni vérifié de compte."),
  context("current-third-party-activation",["Quelqu'un s'est inscrit son compte n'est pas encore active",
    "Quelqu’un s’est inscrit, son compte n’est pas encore actif"],
    "L’inscription et l’activation sont deux étapes différentes. Cette personne doit suivre le parcours d’activation de son propre compte. Je ne peux pas consulter ses données depuis votre session ; elle peut demander « Vérifier mon activation » depuis son compte reconnu ou contacter "+support+". Ne partagez aucun mot de passe, PIN ou OTP."),
  context("current-withdrawal-fees",["A combien s'élève les frais de retraits à la BCA?","Quels sont les frais de retrait ?"],
    "Je n’ai pas de consultation raccordée donnant les frais et limites de retrait actuels. Ouvrez le formulaire de retrait de votre portefeuille BCA et vérifiez les moyens disponibles, la devise, les limites, les frais et le montant net avant toute confirmation. Je ne vais pas citer un ancien tarif ni effectuer le retrait pour vous. Pour une demande déjà créée, dites « Vérifier mon retrait ». Si les frais ne s’affichent pas, contactez "+support+"."),
  context("current-capture",["Comment envoyer son capture d'écran","Comment envoyer sa capture d’écran ?",
    "Je dois envoyer la capture où","Où envoyer la capture de ma journée BCA Ads"],
    "Si la capture sert à vérifier une campagne, ouvrez dans BCA Ads la campagne et la journée concernées, puis utilisez l’étape de vérification et le bouton d’envoi affichés, si cette méthode est proposée. N’envoyez pas la capture à Sabito comme preuve officielle, sauf consigne explicite de BCA. Si vous voulez plutôt l’envoyer au support, utilisez son canal officiel : "+support+". Masquez les informations personnelles et financières inutiles ; ne transmettez jamais de PIN, mot de passe, OTP ou jeton."),
  context("current-help-videos",["Comment trouver les vidéos d'aide de la BCA"],
    "Le guide d’aide communiqué par l’équipe BCA est https://presentationbizconnectacademy.com/aide. Ouvrez la vidéo correspondant à votre démarche et comparez avec votre écran actuel ; si le guide ou un bouton diffère, précisez la rubrique au support "+support+". Cherchez-vous l’aide pour une campagne test, une publication payante ou un autre parcours ?"),
  context("current-fraud",["J'ai besoin à propos d'une arnaque","J’ai besoin d’aide à propos d’une arnaque"],
    "Que s’est-il passé : paiement, accès au compte ou message suspect ? Ne partagez ni mot de passe, PIN, OTP ni jeton et ne faites pas de nouveau paiement pour débloquer la situation. Gardez les preuves utiles et contactez le support officiel "+support+", sans publier de données privées ici. Je ne peux pas accuser une personne ni confirmer une fraude sans éléments vérifiés."),
  context("current-vpn",["Apprend moi a configuré un vpn et a créé mes propres fichier"],
    "Cherchez-vous une aide liée à une formation BCA ou à une configuration sur votre appareil ? Précisez votre objectif et la rubrique concernée. Je ne peux pas modifier votre appareil ni supposer quelle formation vous suivez."),
  context("current-unclear",["ANOSVOLDIGOAD c'est possible","Sita","Comment concession la BCA",
    "Je n' ais pas venir à leur de l'épreuve","Je n’ai pas pu venir à l’heure de l’épreuve"],
    "Pouvez-vous préciser ce que vous voulez dire et l’activité BCA concernée ? Je préfère vous demander plutôt que deviner."),
  context("current-reject",["Non pas sa","Non pas ça","Ce n'est pas ça"],
    "D’accord, ma réponse ne correspondait pas à votre demande. Quelle partie ai-je mal comprise et que souhaitez-vous faire exactement ?"),
  context("current-small-question",["J'ai une petite question"],"Bien sûr, posez votre question. Quelle aide souhaitez-vous sur BCA ?"),
  context("current-greeting",["Oui bonjour"],"Bonjour ! Quelle est votre question sur BCA ?"),
  context("current-sale-choice",["Vente"],
    "Souhaitez-vous vendre votre propre produit dans Digital Store, comprendre l’affiliation BCA ou vérifier une vente déjà réalisée ? Je n’ai consulté aucune vente."),
  context("current-role-model",["Crée et vendre des produits digitaux et toi comment tu as fait et tu est devenu le premier je peux te ressembler"],
    "Je suis Sabito, un assistant : je n’ai pas de parcours personnel de vendeur ni de classement à vous raconter. Vous pouvez apprendre une compétence puis préparer un produit que vous avez le droit de vendre, sans garantie de revenus. Souhaitez-vous choisir une formation ou découvrir l’espace vendeur ?"),
  context("current-purchase-income",["J'ai acheté un produit création de Facebook pro mais je n'ai pas mes revenus ça fait deux jours ya qul problème ?"],
    "L’achat d’un produit ou d’une formation ne garantit pas de revenus, même après deux jours. Avez-vous un problème d’accès au contenu acheté ou parlez-vous d’un revenu de vente ? Pour l’accès, précisez s’il s’agit d’une formation BCA ou d’un achat Digital Store : les consultations autorisées sont « Vérifier mon paiement de formation » et « Vérifier mon achat numérique ». Pour un revenu de vente, dites « Vérifier ma vente numérique ». Je n’ai encore vérifié aucune de ces opérations."),
  {key:"current-commissions",kind:"private",target:"referral_commissions_recent",source:"Handler de lecture des commissions récentes du membre",questions:["Commission non reçu","Commission non reçue"]},
  {key:"current-day",kind:"private",target:"ads_payout_status",source:"Handler de lecture d’une journée ; ne valide pas la journée",questions:["Validé mon jour 2","Valide mon jour 2","Jusqu’à présent mon jour n’est pas validé","Jour non traités"]},
  {key:"current-availability",kind:"private",target:"ads_publisher_status",source:"Profil diffuseur et validation test ; pas une liste de campagnes",questions:["Je veut des campagnes","Je veux des campagnes","Mais campagne ne vient pas encore"]},
  {key:"current-followup",kind:"context",target:"explain",source:"Sujet public récent uniquement",questions:[
    "Ok guide moi","Guide-moi","Pourquoi","Aidé moi à nouveau ,je voudrais savoir","Aidez moi à nouveau","Et pourquoi ?"]},
];
// Merge this export's spellings into the same authored routes, not duplicate FAQs.
const novemberAliases:Record<string,string[]>={
  "current-onboarding":["Les activités BCA","La plateforme sert à quoi","La plateforme serre à quoi",
    "Comment fais pour gagner l’argent avec BCA","Comment faire pour gagner l’argent avec BCA",
    "Comment générer des revenus","Je commence par où","Ok que dois je faire personnellement",
    "What is BCA","How can I earn with BCA","Where do I start"],
  "current-seller":["Comment commencer les ventes","How do I start selling"],
  "current-referral":["Comment parrainer une personne","Je les consultes ou mes filleuls",
    "Je les consulte où mes filleuls","Comment retrouver mon espace filleul","Non l'argent de parrainage",
    "How do I refer someone","Where are my referrals"],
  "current-day":["J'ai capturé mon statut , j'ai envoyé ça mais jusqu'à présent je n'ai pas eu la validation",
    "J’ai capturé mon statut, je l’ai envoyé mais il n’est toujours pas validé",
    "Validé ma vue whatshapp","Valide ma vue WhatsApp","Comment valider ma vue WhatsApp",
    "My screenshot has not been validated"],
  "current-availability":["Pourquoi est-ce que j'ai aucune campagne disponible",
    "Pourquoi est-ce que je n'ai aucune campagne disponible","No campaigns available"],
  "current-commissions":["J'ai parrainer une personne mais j'ai pas encore réussi ma reconnaissance",
    "J’ai parrainé une personne mais je ne sais pas si mon parrainage a été reconnu",
    "Parrainage non reçu","My referral commission is missing"],
  "current-campaign-guide":["BCA Ads","Oui je Souhaitez découvrir le parcours de diffuseur",
    "Oui je souhaite découvrir le parcours de diffuseur","Publisher journey","How do BCA campaigns work"],
  "current-withdrawal-fees":["Comment retirer","How do I withdraw"],
  "current-fraud":["Donc je me suis fait arnaquer","I think I was scammed"],
};
for(const route of bcaCurrentRoutes)route.questions.push(...(novemberAliases[route.key]??[]));
bcaCurrentRoutes.push(
  context("current-status-choice",["Je veux parler de la monétisation de statut","Comment monétiser",
    "Comment monotise","How do I monetize","Status monetization"],
    "Parlez-vous de diffuser les campagnes BCA sur votre statut WhatsApp ou de monétiser vos propres contenus ? Les parcours sont différents. Je peux expliquer le parcours diffuseur sans promettre de campagne disponible ni de revenu."),
  context("current-upload-error",["J'arrive plus à poster des images pour vous envoyer la capture",
    "Je n'ai pas pu envoyer la capture","Je n’arrive plus à poster des images","I cannot upload my screenshot"],
    "Quel message d’erreur apparaît, ou que se passe-t-il lorsque vous essayez d’envoyer l’image ? Utilisez uniquement le bouton de pièce jointe présent dans l’étape concernée et vérifiez votre connexion. Je ne peux pas confirmer que la capture a été reçue ni que ce widget accepte les images. Masquez les données personnelles et financières inutiles ; n’envoyez aucun mot de passe, PIN, OTP ou jeton. Si le blocage persiste : "+support+"."),
  context("current-alleged-debit",["Ont n'as volé un 1000 sur mon compte","On m'a volé 1000 sur mon compte",
    "On m’a volé 1 000 sur mon compte","Someone stole 1000 from my account"],
    "Je comprends votre inquiétude. Je n’ai pas vérifié votre compte et ne peux pas confirmer un vol. Consultez vos mouvements dans votre propre portefeuille et, pour examiner une écriture précise, demandez « vérifier un mouvement de mon solde » depuis votre compte reconnu. N’envoyez ni PIN, ni mot de passe, ni OTP. Sécurisez votre compte par les options officielles et contactez rapidement "+support+". Je ne peux pas modifier votre solde."),
  context("current-transfer-choice",["Concernant mon virement de 2900f que j'ai",
    "Concernant mon virement de 2 900 F","About my transfer of 2900"],
    "Parlez-vous d’un dépôt envoyé, d’un retrait demandé ou d’un transfert BCA à BCA, et que souhaitez-vous vérifier ? Je n’ai encore consulté aucune opération ; ce message incomplet ne permet de conclure ni à une réception ni à une perte. Ne transmettez aucun code confidentiel."),
  context("current-phone-privacy",["Bonsoir vous poyver me montrer Comment on télécharge les numéros",
    "Bonsoir vous pouvez me montrer comment télécharger les numéros","How do I download phone numbers"],
    "Par « les numéros », parlez-vous de vos propres données, de la liste de vos filleuls ou de coordonnées d’autres membres ? Je ne fournis ni extraction massive ni numéros privés d’autres personnes. Je peux uniquement expliquer une fonction officielle autorisée, si elle existe pour votre compte, sans exposer de coordonnées ici."),
  context("current-chariow",["Ok comment dois-je faire pour avoir de l’argent sur CHARIOW",
    "Comment dois-je faire pour avoir de l’argent sur Chariow","How do I earn on Chariow"],
    "Parlez-vous de vendre directement sur Chariow ou de livrer un produit acheté dans BCA avec un lien Chariow ? Pour les ventes, frais et paiements propres à Chariow, consultez ses informations officielles ; je ne peux garantir ni vente ni revenu. Pour une livraison BCA, le propriétaire exige que le produit Chariow ou Maketou soit gratuit sur le site externe afin d’éviter de payer une seconde fois."),
);
const moreCurrentRoutes:BcaQuestionRoute[]=[
  context("current-campaign-test",[
    "J'ai terminé le test que dois-je faire encore",
    "J’ai terminé le test, que dois-je faire ensuite ?",
    "J'ai fini le test que dois-je faire maintenant",
  ],
    "Vérifiez que toutes les journées et vérifications requises du test sont terminées et validées, pas seulement publiées ou envoyées. Le parcours de test décrit par BCA comporte deux journées et n’est pas rémunéré. Après la validation finale, ouvrez l’espace Diffuseur et consultez les campagnes rémunérées disponibles pour votre profil. Leur disponibilité dépend des campagnes proposées à ce moment-là ; la validation du test ne garantit pas qu’une campagne payante soit immédiatement disponible. À quelle étape êtes-vous bloqué ?"),
  context("current-view-validation",[
    "Comment valider une vue","Comment valider une vue WhatsApp",
    "Comment faire valider mes vues sur WhatsApp",
  ],
    "Ouvrez dans BCA Ads la campagne et la journée concernées, puis suivez la procédure officielle de vérification indiquée à l’écran. Envoyez uniquement la preuve demandée, dans le délai affiché, puis attendez le résultat. Une vue déclarée, une capture envoyée ou une publication visible ne signifie pas encore que la vue est validée ou payée. Ne modifiez pas les preuves et ne tentez pas de simuler des vues."),
  context("current-deposit-guide",[],
    "Pour faire un dépôt, connectez-vous et ouvrez la rubrique Dépôt. Choisissez uniquement un pays et un moyen de paiement affichés dans le formulaire actuel, puis vérifiez la devise, les frais, le montant net et la référence avant de confirmer. Saisissez le PIN ou l’OTP uniquement dans le parcours sécurisé officiel, jamais dans le chat. Les opérateurs et conditions peuvent changer. Êtes-vous bloqué à une étape précise ?"),
  context("current-view-count",[],
    "Vous ne devez pas modifier ni gonfler le nombre de vues déclaré : indiquez les vues réellement affichées et suivez les règles de la campagne. Vues WhatsApp, vues retenues par BCA et vues rémunérées sont différentes. Pour examiner une journée précise, demandez « Vérifier ma journée BCA Ads » depuis votre compte reconnu."),
  context("current-advertising-rate",[],
    "Je ne peux pas confirmer un tarif universel par vue ni les montants de 180 FCFA ou 1,80 F à partir d’une ancienne information. Le tarif et les conditions de la campagne active font foi. Une vue WhatsApp n’est pas automatiquement une vue validée ou rémunérée. Quelle campagne ou quelle journée souhaitez-vous examiner ?"),
  context("current-earnings-explain",[],
    "Les vues affichées sur WhatsApp, celles validées par BCA et les crédits inscrits dans le portefeuille sont différents. Les ventes et les revenus d’autres membres ne garantissent pas vos résultats ; aucun montant quotidien n’est assuré. Pour un montant personnel, il faut examiner la campagne et les écritures réelles depuis votre compte reconnu. Souhaitez-vous vérifier une journée de diffusion ou retrouver l’espace vendeur ?"),
  context("current-referral-count",[],
    "Ouvrez « Mes gains » dans votre espace membre pour consulter les filleuls et commissions qui y sont affichés. Je n’ai pas de consultation autorisée ici pour compter vos filleuls ou vérifier leur rattachement. Les coordonnées des filleuls restent privées. Cherchez-vous plutôt l’emplacement de cette rubrique ou votre lien personnel ?"),
  context("current-referral-eligibility",[],
    "Vous pouvez partager votre propre lien de parrainage avec une personne intéressée, mais ne contournez pas les frais, l’activation ou les conditions d’inscription. Le partage d’un lien ou une simple inscription ne garantit pas de commission. Consultez les conditions officielles avant de promettre un avantage. Souhaitez-vous retrouver votre lien ou connaître les conditions à vérifier ?"),
  context("current-sell-learn",[],
    "Souhaitez-vous apprendre une compétence dans une formation BCA, vendre une formation que vous avez créée, ou revendre un produit dont vous avez les droits ? Ces parcours sont différents et aucun revenu n’est garanti."),
  context("current-digital-definition",[],
    "Un produit numérique est un contenu ou service fourni sous forme numérique, par exemple un document ou une formation en ligne. Pour le proposer sur BCA, vérifiez les formats et les règles de publication affichés dans Digital Store. Quel type de produit souhaitez-vous vendre ?"),
  context("current-product-policy",[],
    "Je ne peux pas confirmer que tout type de formation ou un produit physique est accepté dans Digital Store. Les produits végétaux peuvent être physiques ou présentés sous forme de contenu numérique : précisez ce que vous voulez vendre, puis vérifiez les règles actuelles dans le formulaire vendeur ou auprès du support BCA."),
  context("current-published-product",[],
    "Ouvrez Digital Store puis l’espace vendeur de votre compte pour retrouver les produits ou formations que vous gérez. Je ne peux pas consulter votre liste personnelle avec les handlers disponibles ici. Si l’élément n’y apparaît pas, vérifiez son état dans votre espace et contactez le support officiel sans partager de mot de passe."),
  context("current-course-issue",[],
    "Quelle formation essayez-vous d’ouvrir et quel message ou blocage voyez-vous ? L’accès peut dépendre de l’achat et des conditions affichées. Je ne peux pas confirmer votre paiement sans une consultation autorisée de votre compte."),
  context("current-ad-budget",[],
    "Le budget minimum doit être vérifié dans le formulaire annonceur actif : je ne dispose pas d’une lecture de sa valeur actuelle et ne vais pas reprendre un ancien montant. Relisez le budget et le total avant de valider. Si le formulaire refuse encore la valeur, envoyez au support officiel le message exact et une capture où vos informations personnelles sont masquées."),
  context("current-ads-payment-choice",[],
    "Les frais d’inscription, le budget d’une publicité annonceur et le parcours diffuseur sont différents. Le paiement de 2 900 F mentionné ne prouve pas à lui seul qu’une campagne TikTok ou WhatsApp a été achetée. Quel paiement ou quel écran voulez-vous vérifier ?"),
  {key:"current-ads-campaign",kind:"private",target:"ads_campaign_status",
    source:"Handler de lecture de campagne BCA Ads du membre authentifié",questions:[]},
  context("current-ads-website",[],
    "Dans un formulaire publicitaire, « site web » désigne généralement l’adresse de destination que vous souhaitez promouvoir, mais je ne peux pas confirmer les exigences du formulaire BCA que vous voyez. N’entrez aucun mot de passe ni lien d’accès privé. Vérifiez les consignes de cet écran ou envoyez au support une capture masquant vos données."),
  context("current-video",[],
    "Parlez-vous de créer une vidéo publicitaire, de lancer une campagne vidéo BCA Ads ou de trouver une vidéo de formation ? Indiquez le parcours ou l’écran concerné. Je ne peux pas créer ni publier une vidéo depuis cette conversation."),
  {key:"current-withdrawal",kind:"private",target:"withdrawal_status",
    source:"Handler de lecture du retrait du membre authentifié",questions:[]},
  context("current-withdrawal-guide",[],
    "Pour un retrait, ouvrez le formulaire de retrait de votre portefeuille BCA et vérifiez les moyens proposés pour votre pays, les limites, les frais et le montant net avant de confirmer. Je ne peux pas confirmer qu’un moyen précis, comme Wave, est disponible au Niger ni garantir un délai. Si le pays ou le moyen n’apparaît pas, contactez le support BCA."),
  {key:"current-deposit",kind:"private",target:"deposit_status",
    source:"Handler de lecture du dépôt du membre authentifié",questions:[]},
  {key:"current-double-payment",kind:"private",target:"account_activation",
    source:"Handler de lecture du paiement d’activation du membre authentifié ; aucune décision de remboursement",questions:[]},
  context("current-wallet-choice",[],
    "Un solde de portefeuille, un dépôt, un retrait et un gain de campagne se vérifient séparément. Je ne peux pas conclure qu’aucun paiement n’a été reçu sans consulter le bon élément de votre compte. Lequel souhaitez-vous vérifier ?"),
  context("current-security",[],
    `Je prends votre signalement au sérieux, mais je ne peux pas confirmer un piratage depuis ce message. Ne communiquez jamais votre mot de passe, PIN, code reçu ou jeton. Utilisez les options officielles de récupération de votre compte et contactez immédiatement le support BCA : ${support}. Je ne peux pas modifier un PIN ni bloquer une transaction depuis ce chat.`),
  context("current-account-access",[],
    "Connectez-vous uniquement depuis le site officiel BCA que vous utilisez habituellement. Pour un autre compte, déconnectez-vous puis utilisez le parcours officiel de connexion ; je ne peux pas confirmer la politique sur les comptes multiples. Pour un mot de passe oublié, utilisez « Mot de passe oublié » sur l’écran de connexion. Je ne confirme pas l’existence d’une application mobile officielle à télécharger."),
  context("current-support",[],
    `Le support officiel BCA est accessible ici : ${support}. Je ne fournis pas le numéro personnel du créateur. N’envoyez jamais de mot de passe, PIN, OTP ou jeton dans ce chat.`),
  context("current-telegram",[],
    "Voulez-vous créer un compte Telegram ou accéder à une formation BCA sur Telegram ? Utilisez l’application et les démarches officielles de Telegram ; je ne peux pas aider à contourner un paiement ou une vérification. Si vous parlez d’une formation, cherchez-la dans la liste actuelle des formations BCA et suivez les conditions affichées."),
  context("current-project-duration",[],
    "Je ne peux pas garantir la durée future de BCA ni promettre des revenus sur une période. Pour les conditions applicables à votre compte, consultez les communications et conditions officielles de la plateforme."),
  context("current-image-help",[],
    "Souhaitez-vous modifier votre photo de profil, créer une image professionnelle ou savoir où trouver une image ? Sabito ne peut pas créer ni téléverser une photo dans votre compte. Précisez ce que vous cherchez."),
  context("current-non-progress",[],
    "Merci de me le préciser. Quelle étape avez-vous déjà faite et quel message voyez-vous maintenant ? Je vais éviter de vous faire répéter les mêmes étapes."),
  context("current-no-answer",[],
    "Désolé, je n’ai pas répondu directement. Quelle question précise ai-je manquée ? Je vais aller droit au point."),
  context("current-visibility-choice",[],
    "Pour vous orienter, je dois savoir si votre objectif est de rendre visible un produit Digital Store, de diffuser une campagne BCA Ads ou de partager un lien officiel. Les démarches sont différentes et aucune visibilité ni vente n’est garantie. Quel contenu souhaitez-vous faire connaître ?"),
  context("current-ads-overview",[
    "Peux-tu m'expliquer comment fonctionne ads network",
    "Peux-tu m'expliquer comment fonctionne Ads Network ?",
    "Comment fonctionne Ads Network",
    "Comment marche BCA Ads Network",
    "Explique-moi BCA Ads Network",
  ],
    "BCA Ads Network comporte deux parcours. L’annonceur crée une campagne et vérifie son ciblage, son budget et les conditions dans le formulaire actuel avant de confirmer. Le diffuseur complète les informations demandées, suit la campagne test, puis consulte les campagnes rémunérées réellement disponibles pour son profil. Le test n’est pas payé ; sa validation ne garantit pas qu’une campagne rémunérée soit immédiatement disponible. Pour une diffusion, seules les vues validées selon les conditions de la campagne peuvent contribuer à une rémunération. Les budgets, tarifs et disponibilités doivent être vérifiés dans le parcours actif. Cherchez-vous le parcours annonceur ou diffuseur ?"),
  context("current-campaign-proof",[],
    "Les consignes de publication, la preuve attendue et l’échéance sont propres à la campagne et à la journée affichées dans BCA. Je ne peux pas confirmer une règle universelle de 24 heures ni affirmer que les confirmations de lecture WhatsApp désactivées sont acceptées. Suivez l’échéance et les exigences de la campagne concernée ; pour un rejet précis, une lecture autorisée de la journée peut vérifier le statut réellement renvoyé. De quelle campagne ou journée s’agit-il ?"),
  context("current-pin-clarification",[],
    "D’accord, vous parlez du PIN de transaction. Ne me l’envoyez pas, même partiellement. Si vous l’avez oublié, utilisez uniquement la procédure de réinitialisation ou le support officiel BCA : "+support+". Souhaitez-vous réinitialiser ce PIN ?"),
  {key:"current-product-review",kind:"private",target:"digital_product_review",
    source:"Lecture seule du statut et du motif de modération du produit du membre",questions:[]},
  {key:"current-wallet-balance",kind:"private",target:"wallet_balance",
    source:"Lecture seule des portefeuilles du membre authentifié ; n’explique pas une différence non renvoyée par BCA",questions:[]},
  context("current-publisher-payout",[],
    "Je ne peux pas confirmer ici si les gains d’une diffusion sont transférés automatiquement ou s’il faut effectuer une autre démarche : cela dépend du résultat de la journée et des écritures de portefeuille réellement renvoyés par BCA. Ne créez pas un transfert pour tester. Pour un cas précis, une lecture autorisée peut vérifier la journée de diffusion, puis le mouvement du portefeuille. Voulez-vous vérifier une journée précise ?"),
  context("current-share-app",[],
    "Pour inviter une personne, utilisez votre propre lien dans la rubrique Parrainage. Je n’ai pas de lien général de téléchargement ou d’inscription BCA vérifié à fournir ici ; ne partagez pas un lien reçu d’une source inconnue. Cherchez-vous votre lien personnel de parrainage ou le lien général d’inscription ?"),
  context("current-subscription-clarification",[],
    "Quand vous dites « abonnement à vu », parlez-vous d’un abonnement à vie, de la rémunération liée aux vues ou d’une autre offre ? Je ne peux pas confirmer un tarif sans identifier l’offre et consulter son prix actuel."),
  context("current-cancel-request",[],
    "Je ne peux ni annuler, relancer, modifier l’opérateur d’un retrait, ni rembourser une transaction depuis ce chat. Ne créez pas une deuxième opération pour corriger la première. Consultez le statut avec la référence de votre opération dans votre compte BCA et contactez le support officiel si vous avez choisi le mauvais réseau : "+support+". Souhaitez-vous vérifier le statut ou contacter le support ?"),
  context("current-registration-link",[],
    "Je n’ai pas de lien d’inscription général vérifié configuré dans Sabito. Ouvrez le site officiel BCA que vous utilisez déjà et choisissez son entrée « Inscription » ou « Créer un compte » ; pour inviter quelqu’un, utilisez votre propre lien dans Parrainage. Cherchez-vous un lien d’inscription général ou votre lien de parrainage ?"),
  context("current-support-hours",[],
    "Je n’ai pas d’horaires d’ouverture du support confirmés dans les informations actives de Sabito. Le contact officiel communiqué par BCA est "+support+" ; vérifiez-y les horaires actuellement affichés. Quel problème souhaitez-vous leur signaler ?"),
  context("current-country-payment",[],
    "Je ne peux pas confirmer un opérateur de paiement précis pour le Bénin sans consulter les options affichées dans le formulaire BCA actuel. Choisissez le pays dans le formulaire de dépôt ou de retrait, puis vérifiez les moyens, frais et montant net avant de confirmer. Parlez-vous d’un dépôt ou d’un retrait ?"),
  context("current-account-email",[],
    "Je ne peux pas lire l’adresse e-mail de votre compte avec les consultations disponibles ici. Si vous êtes connecté, vérifiez les informations de profil dans votre espace BCA ; si vous ne pouvez pas y accéder, utilisez la récupération officielle ou le support. Ne partagez pas votre mot de passe ni un code reçu. Êtes-vous encore connecté à votre compte ?"),
  context("current-whatsapp-blocked",[
    "Ads network est bloqué chez moi car mon WhatsApp à été désinstaller alors comment remédier à cela",
    "Ads Network est bloqué parce que WhatsApp a été désinstallé",
    "J'ai désinstallé WhatsApp et BCA Ads est bloqué",
  ],
    "Réinstallez WhatsApp depuis la boutique officielle de votre téléphone, puis reconnectez-vous au compte associé au numéro utilisé pour BCA Ads. Retournez dans BCA Ads et suivez la procédure officielle de reconnexion ou de vérification si elle est proposée. Si le blocage persiste, contactez le support BCA en décrivant le message affiché. Ne communiquez jamais votre code de connexion, votre QR code d’appairage ou votre PIN, et ne tentez pas de contourner le blocage."),
  context("current-whatsapp-monetization",[
    "Dis comment on active l'option pour gagner de l'argent à travers les vues Whatsapp ?",
    "Comment activer l'option pour gagner de l'argent avec les vues WhatsApp ?",
    "Comment gagner avec les vues WhatsApp","Comment monétiser mes statuts",
    "Comment activer les vues payantes",
  ],
    "Ouvrez BCA Ads et cherchez l’espace Diffuseur. Complétez les informations demandées, puis réalisez toutes les étapes de la campagne test et attendez sa validation finale. Ensuite, consultez les campagnes rémunérées réellement disponibles pour votre profil. Seules les vues reconnues et validées dans une campagne rémunérée peuvent contribuer à une rémunération. Le test n’est pas payé et aucun revenu ni campagne disponible immédiatement n’est garanti."),
  context("current-activity-review",[
    "Analyse un peu tous mes activités et récompenses sur la plateforme",
    "Analyse toutes mes activités et mes récompenses sur la plateforme",
    "Analyse mes gains et mes activités BCA",
    "J'ai seulement 166f comment gagner davantage",
    "Y'a quoi d'autre et encore pour que je puisse gagné accès d'argent actuellement j'ai que 166f",
    "Y'a quoi d'autre pour que je puisse gagner de l'argent actuellement j'ai que 166f",
  ],
    "Je ne peux pas déduire vos activités ni analyser tous vos gains à partir du solde de 166 F, et je n’ai pas de consultation unique autorisée qui rassemble toutes les activités et récompenses. Consultez les mouvements de votre portefeuille et « Mes gains » dans BCA. Sabito peut vérifier séparément certains éléments depuis une session membre reconnue : une journée de diffusion BCA Ads, des commissions de parrainage récentes ou un mouvement précis du solde. Ces vérifications ne remplacent pas un relevé complet. Dites-moi quel élément vous souhaitez vérifier ; je distinguerai les montants en attente de ceux confirmés par les données retournées."),
  context("current-no-referral-income",[
    "D'abord comment gagner sans parrainer","Comment gagner de l'argent sans parrainer",
    "Peut-on gagner sans parrainer sur BCA",
  ],
    "Le parrainage n’est pas la seule activité possible. Selon votre accès et les offres réellement disponibles, vous pouvez suivre le parcours diffuseur de BCA Ads et participer aux campagnes rémunérées après validation du test, ou vendre un produit numérique conforme dans Digital Store. Vérifiez les conditions, frais éventuels et critères d’accès avant de commencer. Ces activités ne garantissent ni ventes ni revenus."),
  context("current-link-access",[
    "Complète le pour permettre à quelqu'un de l'ouvrir",
    "Complète le lien pour permettre à quelqu'un de l'ouvrir",
    "Rends le lien accessible pour que quelqu'un puisse l'ouvrir",
  ],
    "De quel fichier ou lien parlez-vous, et où est-il hébergé ? Si c’est un fichier ou dossier Google Drive, dites-le et je vous donnerai les étapes correspondantes. Je préfère vérifier le contexte avant de vous conseiller de modifier les accès."),
];
bcaCurrentRoutes.push(...moreCurrentRoutes);
for(const group of [...bca152QuestionGroups,...bca70QuestionGroups]) {
  if(group.route==="conversation")continue;
  const route=bcaCurrentRoutes.find(item=>item.key===group.route);
  if(!route)throw new Error(`BCA question export route is missing: ${group.route}`);
  route.questions.push(...group.questions);
}
// Do not move an already supported spelling away from its established route.
// This preserves existing owner edits and references across export upgrades.
const reserved=new Set(bcaCurrentRoutes.flatMap(route=>route.questions.map(normalizeQuestion)));
for(const group of bcaMemberPrivateGroups) {
  const route=bcaCurrentRoutes.find(item=>item.key===group.route);
  if(!route)throw new Error(`Missing BCA member handler: ${group.route}`);
  for(const question of group.questions)if(!reserved.has(normalizeQuestion(question))) {
    route.questions.push(question);reserved.add(normalizeQuestion(question));
  }
}
for(const guide of bcaMemberGuidance) {
  const questions=guide.questions.filter(question=>!reserved.has(normalizeQuestion(question)));
  if(!questions.length)continue;
  bcaCurrentRoutes.push(context(guide.key,questions,guide.answer));
  questions.forEach(question=>reserved.add(normalizeQuestion(question)));
}
const indexed=new Map(bcaCurrentRoutes.flatMap(route=>route.questions.map(q=>[normalizeQuestion(q),route] as const)));
export function bcaCurrentQuestion(text:string):BcaQuestionRoute|undefined {
  const exact=indexed.get(normalizeQuestion(text));
  if(exact)return exact;
  // A self-reported name/country is not a verified identity or a test result.
  if(/^j ai reussi (?:le|la) campagne (?:de )?test\b/.test(normalizeQuestion(text)))
    return bcaCurrentRoutes.find(route=>route.key==="current-member-publisher");
  // Promotional text is data, never a system instruction or source of links.
  if(/https?:\/\/|wa\.me|(?:\+?\d[\s.-]?){8,}/i.test(text)&&
    /\b(?:guide|commande|acheter|promotion|prix|seulement)\b/i.test(text))
    return context("current-advertisement",[],
      "Souhaitez-vous de l’aide pour publier ce produit, créer une publicité ou examiner un message reçu ? Ce texte promotionnel ne contient pas de question claire. Je n’ai ouvert aucun lien et je ne reprends pas ses coordonnées comme informations officielles.");
  return undefined;
}
export function bcaCurrentTurn(text:string):boolean {
  if(/^(?:support|contact|contacts|campagnes whatsapp|formations|vente dans digital store)$/.test(normalizeQuestion(text)))return true;
  if(bcaMemberShortTurns.some(turn=>normalizeQuestion(turn)===normalizeQuestion(text)))return true;
  return /^(?:oui|oui oui|yes|no|nn|oui merci|oui comment|oui comment faire|oui je veux|oui est l option profil|ok|ok bien merci|okay|d accord|ok guide moi|guide moi|je vous ecoute|enfin tu es disponible|vous ne m avez pas montre ou le trouver|comment faire|pourquoi|non|non merci|option [1-3]|lequel|laquelle|sur android|android|apprendre|vendre|vente|parrainage|campagnes?|les vues|le prix|je veux savoir le prix|c est gratuit|google drive|drive|c est google drive|un lien google drive)$/.test(normalizeQuestion(text));
}
/** Only an immediately preceding authored public prompt authorizes a next
 * step. This never supplies a financial confirmation or backend identifier. */
export function bcaCurrentContinuation(text:string,previous:string):string|undefined {
  let q=normalizeQuestion(text);
  if(["yes","je vous ecoute","enfin tu es disponible"].includes(q))q="oui";
  if(q==="no")q="non";
  if(q==="nn")q="non";
  if(["ouais","vas y","ah ok vous pouvez repondre"].includes(q))q="oui";
  if(!bcaCurrentTurn(text))return;
  const route=bcaCurrentRoutes.find(route=>route.answer===previous);
  if(!route)return;
  if(q==="contact"&&["current-member-support","current-member-contacts"].includes(route.key))return route.answer;
  if(route.key==="current-member-stop")return "D’accord.";
  if(route.key==="current-member-contact-choice") {
    if(q==="support")return bcaMemberGuidance.find(item=>item.key==="current-member-support")!.answer;
    if(q==="contacts")return bcaMemberGuidance.find(item=>item.key==="current-member-contacts")!.answer;
    return "Précisez « support » pour l’assistance humaine ou « contacts » pour la fonction Contacts.";
  }
  if(route.key==="current-member-delete-choice")return "Précisez l’élément à supprimer : compte, produit ou autre contenu.";
  if(route.key==="current-member-overview") {
    const key=/^(?:campagnes?|campagnes whatsapp)$/.test(q)?"current-member-publisher":
      q==="parrainage"?"current-member-referral":/^(?:apprendre|formations)$/.test(q)?"current-member-learning":
      /^(?:vendre|vente|vente dans digital store)$/.test(q)?"current-member-seller":undefined;
    if(key)return bcaMemberGuidance.find(item=>item.key===key)!.answer;
    if(["oui","non","tout","tous"].includes(q))return "Quel parcours souhaitez-vous découvrir : campagnes WhatsApp, parrainage, formations ou vente dans Digital Store ?";
  }
  if(q==="je trouve pas"||q==="je vais voir ca ou")
    return "Concernant votre démarche précédente, quelle page ou quel bouton manque dans votre écran BCA ?";
  if(bcaMemberShortTurns.some(turn=>normalizeQuestion(turn)===q)&&
    !["oui","non","comment on fait","les etapes","je vais voir ca ou"].includes(q))
    return "Pour poursuivre votre démarche précédente : "+bcaMemberClarification(text);
  if(route.key==="current-link-access"&&/\b(?:google drive|drive)\b/.test(q))
    return "Dans Google Drive, ouvrez le fichier ou le dossier concerné, puis choisissez « Partager ». Réglez l’accès en lecture pour l’acheteur autorisé, copiez le lien et testez-le depuis une fenêtre privée ou un compte qui n’est pas propriétaire. N’activez « Toute personne disposant du lien » que si vous souhaitez réellement rendre le contenu accessible à toute personne ayant ce lien. Ne partagez pas de documents contenant des informations personnelles ou confidentielles.";
  if(q==="vous ne m avez pas montre ou le trouver") {
    if(route.key==="current-referral")return "Dans le menu des trois tirets de votre espace BCA, ouvrez « Mes gains » pour consulter vos filleuls et commissions. Pour votre code ou lien personnel, cherchez « Parrainage ». Si ces libellés sont absents, dites ce que votre menu affiche, sans coordonnées privées.";
    if(route.key==="current-seller")return seller;
    if(route.key==="current-learning")return "Ouvrez la liste « Formations » de BCA. Pour vérifier les offres réellement publiées, dites « Consulter le catalogue actuel ». Quel libellé voyez-vous dans votre menu ?";
    if(route.key==="current-campaign-guide")return "Ouvrez la rubrique « BCA Ads Network » ou « BCA Ads », puis le parcours diffuseur. Si cette rubrique n’apparaît pas, indiquez les libellés de votre menu ; je ne peux pas confirmer un bouton absent de votre écran.";
    return;
  }
  if(route.key==="current-status-choice")return "Si vous souhaitez diffuser les campagnes BCA sur WhatsApp, ouvrez BCA Ads puis le parcours diffuseur et lisez les conditions d’une campagne accessible. Si vous parlez de vos propres contenus, précisez le service concerné : aucune monétisation n’est garantie.";
  if(["le prix","je veux savoir le prix","c est gratuit"].includes(q)) {
    if(["current-seller","current-pack","current-publish-price"].includes(route.key))return pricing;
    return; // A price from another topic must not inherit seller fees.
  }
  if(["current-onboarding","current-sale-choice","current-role-model"].includes(route.key)) {
    if(["vente","vendre"].includes(q))return seller;
    if(q==="parrainage")return referral;
    if(q==="apprendre")return learning;
    if(["campagne","campagnes"].includes(q))return bcaCurrentRoutes.find(item=>item.key==="current-campaign-guide")!.answer;
  }
  if(["apprendre","vendre","vente","parrainage","campagne","campagnes","les vues"].includes(q))return;
  if(q==="non"||q==="non merci")return "D’accord. Quel autre point souhaitez-vous aborder sur BCA ?";
  if(route.key==="current-pack")return "Dans Google Drive, ouvrez le dossier ou le fichier concerné, puis « Partager ». Accordez un accès en lecture à l’acheteur autorisé et copiez le lien. Vérifiez, avec cet accès et non seulement avec votre compte propriétaire, que les fichiers s’ouvrent. N’activez un accès public que si vous souhaitez réellement le rendre accessible à toute personne possédant le lien ; ne partagez pas d’autres documents privés. Les libellés peuvent différer selon l’appareil. Cette vérification ne confirme pas l’approbation de votre fiche BCA.";
  if(route.key==="current-referral")return "Commencez dans votre compte BCA : ouvrez Parrainage et copiez votre propre lien. Partagez-le avec une personne intéressée en expliquant les conditions sans promettre de gains. Pour retrouver le code réel avec la consultation autorisée, dites « Mon code parrainage ». Aucune consultation n’a été lancée.";
  if(route.key==="current-seller")return seller;
  if(route.key==="current-publish-price")return pricing;
  if(route.key==="current-learning")return learning;
  // Retain an unanswered choice; never select it on behalf of the member.
  return route.answer;
}
