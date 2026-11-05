import type { BcaGuide } from "./bca-guide-data";

const guide=(key:string,title:string,variants:string[],content:string,followUpKeys:string[]):BcaGuide=>
  ({key,title,variants,content,followUpKeys});

/** Public replies requested by the owner from the BCA unanswered export.
 * Premium-course navigation was explicitly clarified by the owner.
 * Personal amounts and payment states remain backend-owned.
 */
export const bcaMemberFaq:BcaGuide[]=[
  guide("member-premium-courses","Comment accéder aux applications premium ?",[
    "Comment accéder aux applications premium","Où trouver la formation CapCut ?",
    "Comment accéder à la formation Canal+ ?","Je cherche les formations pour CapCut et Canal+",
    "Où sont les cours sur les applications premium ?",
  ],"Les explications concernant les applications premium se trouvent dans les formations BCA.\n1. Connectez-vous à BCA et ouvrez la liste des formations.\n2. Choisissez la formation consacrée à Canal+ ou celle consacrée à CapCut, selon votre besoin.\n3. Ouvrez la formation et suivez les explications présentées dans le cours.\nIl s’agit de formations, pas d’une rubrique qui active directement un abonnement. Consultez les conditions d’accès affichées sur la fiche de la formation ; je ne fournis ni compte partagé, ni code d’accès, ni lien non vérifié.",["20","member-free-courses"]),
  guide("member-bca-overview","Comment fonctionne la plateforme BCA ?",[
    "Comment fonctionne la bac","Comment fonctionne le BCA","Je veux comprendre le fonctionnement de BCA",
    "Comment commencer sur BizConnect Academy ?","Expliquez-moi les services de BCA",
  ],"BCA réunit des formations, des produits digitaux, le parrainage et les campagnes publicitaires BCA Ads.\n1. Connectez-vous à votre espace membre et consultez les indications d’activation et de sécurité.\n2. Pour apprendre, ouvrez la liste des formations et choisissez un sujet adapté à votre objectif.\n3. Pour vendre, consultez Digital Store et ses conditions vendeur.\n4. Pour recommander BCA, utilisez votre propre code ou lien dans la rubrique de parrainage.\n5. Pour diffuser des publicités, suivez le parcours diffuseur BCA Ads et faites valider la campagne test avant de rechercher des campagnes rémunérées disponibles.\nChaque service a ses conditions. L’inscription, un dépôt ou la publication d’un statut ne garantissent pas un revenu.",["member-new-after-deposit","member-income","20"]),
  guide("member-income","Quels parcours choisir pour envisager des revenus avec BCA ?",[
    "Comment génére mes premier revenu","Je veux comprendre comment gagner de l'argent avec BCA",
    "On peut gagner de l'argent dans le BCA à des différents manière ? Si oui explique stp",
    "Comment faire pour gagner de l'argent sur BCA","Comment je fais pour gagner de l'argent chaque jour sur bca",
    "Si tu n'est pas partage ton lien comment tu vas faire pour gagner de l'argent",
    "comment gagner de l'argent a la bca",
  ],"Plusieurs parcours sont possibles, avec des conditions différentes :\n1. Apprendre une compétence dans les formations, puis l’utiliser pour proposer un service à des clients.\n2. Vendre un produit digital conforme dans Digital Store, en respectant les conditions et les frais affichés.\n3. Recommander BCA avec votre propre lien ou code de parrainage, selon les règles d’éligibilité des commissions.\n4. Diffuser des campagnes BCA Ads disponibles après validation du parcours et de la campagne test. Seules les vues validées selon les règles de la campagne peuvent être rémunérées ; le test n’est pas rémunéré.\nPartager un lien de parrainage n’est donc pas le seul parcours possible. En revanche, aucun gain quotidien, montant fixe, vente ou remboursement de votre inscription n’est garanti. Choisissez d’abord un parcours et suivez ses étapes.",["20","22","faq-status-access"]),
  guide("member-new-after-deposit","Je suis nouveau sur BCA après mon dépôt : par où commencer ?",[
    "Je me suis inscrit et j'ai fait le premier dépôt de 2900 et je suis bloqué je ne sais pas comment ça fonctionne le BCA",
    "Je suis un niveau sur le bas je me suis inscrit et j'ai fait le dépôt de 2900 et je ne sais pas comment ça fonctionne pouvez-vous m'expliquer et m'aider à faire ce qui est possible s'il vous plaît",
    "Je suis nouveau et j’ai déjà fait mon dépôt","Déjà fait le dépôt",
    "Que faire après mon inscription et mon premier dépôt ?",
  ],"Bienvenue sur BCA. Je peux vous orienter, mais je n’ai pas vérifié votre paiement : un dépôt dans le portefeuille et l’activation du compte sont deux opérations différentes.\n1. Consultez l’état de votre compte et l’historique du paiement dans votre espace membre.\n2. Si votre accès est disponible, ouvrez la liste des formations et commencez par un sujet qui vous intéresse.\n3. Pour les campagnes WhatsApp, ouvrez « Présentation BCA », puis « Guide d’utilisation », et suivez le parcours diffuseur et la campagne test.\n4. Pour la vente ou le parrainage, consultez respectivement Digital Store ou votre rubrique de parrainage.\nSi un écran vous bloque, indiquez le nom de la rubrique et le message exact, sans PIN ni mot de passe. Ne refaites pas un paiement uniquement parce que vous ne savez pas quelle étape suivre. Souhaitez-vous de l’aide pour une formation, une campagne ou l’état de votre accès ?",["20","faq-status-access","member-bca-overview"]),
  guide("member-whatsapp-views","Mes vues WhatsApp n’apparaissent pas dans BCA : que vérifier ?",[
    "Je pense mon statut sur WhatsApp mais je ne vois pas le nombre de vues dans le BCA",
    "Je poste mon statut WhatsApp mais les vues ne remontent pas sur BCA",
    "Pourquoi mes vues WhatsApp ne sont pas affichées dans BCA ?",
    "J’ai publié la campagne et je ne vois pas les vues","Comment suivre les vues de ma campagne WhatsApp ?",
  ],"Publier un statut WhatsApp ne suffit pas à faire apparaître des vues validées ou un gain dans BCA.\n1. Vérifiez que vous suivez bien une campagne BCA Ads et la journée de publication correspondante.\n2. Utilisez le contenu et le lien de suivi fournis, puis déclarez la publication selon les consignes.\n3. Effectuez la vérification ou transmettez la preuve demandée, avec la méthode et dans le délai affichés.\n4. Consultez le résultat dans la journée de campagne : les vues WhatsApp affichées sur votre téléphone, les clics du lien et les vues validées par BCA ne sont pas la même mesure.\nOuvrez « Présentation BCA », puis « Guide d’utilisation » pour reprendre les étapes. Si cela persiste, précisez le statut affiché et la journée concernée. Je n’ai pas consulté votre dossier et ne peux pas attribuer une cause précise ni confirmer un gain.",["faq-status-publish","28","member-campaign-availability"]),
  guide("member-campaign-availability","Pourquoi certaines personnes ne reçoivent pas les campagnes à publier ?",[
    "Pourquoi certaines personnes ne reçoivent pas les campagnes à publier",
    "je nein pas rési les campagnes peyet","Je ne reçois pas les campagnes payantes",
    "Pourquoi les campagnes disponibles ne sont-elles pas les mêmes pour tous ?",
    "Aucune campagne rémunérée ne s’affiche pour moi",
  ],"L’accès aux campagnes rémunérées dépend du parcours diffuseur et des campagnes réellement disponibles pour votre profil.\n1. Vérifiez que votre profil diffuseur est autorisé et que la campagne test complète est validée, pas seulement publiée.\n2. Consultez les campagnes proposées pour votre pays, votre ville et votre profil.\n3. Vérifiez les notifications et les conditions de la campagne : une campagne peut ne plus être disponible ou avoir atteint ses objectifs.\nLa validation du test ne garantit pas une campagne payante immédiate. L’absence de campagne ne prouve pas, à elle seule, que votre compte est bloqué. Je n’ai pas consulté votre situation personnelle. Reprenez « Présentation BCA » → « Guide d’utilisation » et contactez le support officiel si une incohérence persiste ; ne falsifiez pas votre profil ni vos preuves.",["faq-status-access","faq-no-paid-campaign","faq-blocked-publisher"]),
  guide("member-find-customers","Comment trouver plus de clients pour mon activité ?",[
    "Comment faire pour trouver plus de clients","Comment attirer des clients pour mes produits digitaux ?",
    "Comment présenter mes services à des clients ?","Comment développer ma clientèle ?",
    "Comment améliorer mes chances de vendre sur BCA ?",
  ],"Pour chercher des clients, commencez par une offre claire et utile :\n1. Identifiez le problème précis que votre produit ou service peut résoudre.\n2. Décrivez honnêtement ce que le client reçoit, le prix, les conditions et les limites.\n3. Préparez des exemples ou une démonstration que vous avez le droit de partager.\n4. Présentez votre offre à un public concerné, dans les espaces où la promotion est autorisée, sans spam ni faux témoignages.\n5. Écoutez les retours pour améliorer votre offre. Sur BCA, consultez les formations pertinentes, les conditions de Digital Store et, si adapté, le parcours annonceur BCA Ads.\nCe sont des conseils généraux : je ne dispose pas des ventes réelles de votre marché et ne garantis ni clients ni ventes.",["member-choose-product","22","26"]),
  guide("member-choose-product","Quel produit choisir pour vendre sur BCA ?",[
    "Je demande si tu devais vendre un produit ça serait Quoi","Pour toi qu est qui ce vendrai le mieux sur la bca",
    "Quel produit digital pourrait intéresser les membres ?","Quels produits se vendent le mieux sur BCA ?",
    "Que pourrais-je vendre dans Digital Store ?",
  ],"Je n’ai pas les statistiques de ventes BCA pour désigner un produit qui se vendrait forcément le mieux.\n1. Choisissez un besoin réel d’un public que vous connaissez.\n2. Envisagez, par exemple, un guide pratique, une ressource de travail ou un contenu pédagogique que vous avez créé et que vous avez le droit de vendre.\n3. Vérifiez sa qualité, les règles de Digital Store, les droits de diffusion, les frais et la validation éventuelle.\n4. Présentez une offre précise, puis ajustez-la selon les retours réels.\nNe revendez pas un contenu ou un accès à un service sans autorisation. Pour vous orienter davantage, indiquez vos compétences et le public que vous souhaitez aider.",["22","member-find-customers","20"]),
  guide("member-download-contacts","Le téléchargement du fichier de contacts BCA échoue : que faire ?",[
    "J’essaie de télécharger le fichier de contacts mais ça passe pas",
    "Je n’arrive pas à télécharger les contacts","Le fichier de contacts ne se télécharge pas",
    "Le téléchargement des contacts échoue","Où reprendre le téléchargement des contacts ?",
  ],"1. Connectez-vous à BCA et retournez dans la rubrique qui propose le fichier de contacts.\n2. Vérifiez les conditions d’accès et utilisez uniquement le bouton de téléchargement officiel.\n3. Consultez les téléchargements de votre navigateur : le fichier peut déjà y être enregistré. Vérifiez aussi votre connexion, l’espace disponible et les éventuels messages de blocage.\n4. Si l’échec continue, indiquez le message exact, l’appareil et le navigateur utilisés au support officiel, sans envoyer de données personnelles contenues dans le fichier.\nJe n’ai pas vérifié votre accès ni le fichier : je ne peux pas affirmer que le serveur est en panne ou que votre compte est bloqué. N’utilisez pas de lien alternatif non vérifié et respectez les règles applicables à l’utilisation des contacts.",["19","member-bca-overview"]),
  guide("member-free-courses","Comment trouver les formations gratuites sur BCA ?",[
    "les formations gratuites","Où sont les formations gratuites ?","Apprendre des compétences",
    "Comment apprendre une compétence avec BCA ?","Quelles formations puis-je suivre gratuitement ?",
  ],"1. Ouvrez la liste des formations dans votre espace BCA.\n2. Consultez les fiches des sujets qui vous intéressent et vérifiez leur prix et leurs conditions d’accès.\n3. Choisissez une formation affichée comme gratuite ou déjà accessible à votre compte, puis suivez ses leçons.\nJe ne peux pas fournir une liste actuelle de cours gratuits sans consulter le catalogue réellement disponible. Toutes les formations ne sont pas nécessairement gratuites.\nPour les explications sur Canal+ ou CapCut, cherchez la formation correspondante dans cette même liste.",["20","member-premium-courses","member-income"]),
  guide("member-present-bca","Comment présenter et recommander BCA honnêtement ?",[
    "recommander la plateforme",
    "Je veux un message qui explique de manière complète ce que c’est la BCA et comment elle fonctionne tout en présentant ses avantages ‘de sorte à pousser la personne à rejoindre la BCA sans hésiter",
    "Peux-tu proposer un message pour présenter BCA ?","Comment expliquer BCA à une personne intéressée ?",
    "Un texte pour recommander BizConnect Academy",
  ],"Voici un message que vous pouvez adapter :\n« BizConnect Academy regroupe des formations, des produits digitaux et des services de parrainage et de publicité. Vous pouvez y apprendre une compétence, découvrir les conditions de vente sur Digital Store ou suivre le parcours de diffusion de campagnes BCA Ads. Chaque activité a ses étapes, ses conditions et, selon le service, des frais. Prenez le temps de consulter les formations et les informations officielles pour choisir ce qui correspond à votre objectif. L’inscription ne garantit aucun revenu. Si la plateforme vous intéresse, je peux vous présenter les rubriques et vous transmettre mon lien d’invitation. »\nUtilisez votre propre lien réel, sans inventer de gains, masquer les frais ou faire pression sur la personne.",["01","18","member-income"]),
];
