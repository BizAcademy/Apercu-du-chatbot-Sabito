import { expandQuestion } from "./question-spelling";
/** Approved Buzz Booster help supplied by the product owner. Editable copies are
 * installed once per project; dynamic examples below are never live configuration. */
export type BuzzGuide={key:string;title:string;variants:string[];content:string;match:RegExp};
const guide=(key:string,title:string,variants:string[],match:RegExp,lines:string[]):BuzzGuide=>
  ({key,title,variants,match,content:lines.join("\n")});
export const buzzGuides:BuzzGuide[]=[
  guide("overview","Comment fonctionne Buzz Booster ?",[
    "C'est quoi Buzz Booster ?","Quels réseaux sont disponibles ?","Comment ça fonctionne ?","Comment ça marche ?",
    "Je veux savoir comment ça fonctionne","C’est quoi cette plateforme ?","Quels services proposez-vous ?",
    "Je suis nouveau, expliquez-moi","Vous proposez quoi ?","Que peut-on faire ici ?","Je suis nouveau",
    "Explique-moi la plateforme","Expliquez-moi Buzz Booster","Présentation générale de Buzz Booster",
  ],/fonctionne buzz|presentation de buzz|c est quoi buzz|quels reseaux|^(?:comment (?:ca|cela) (?:fonctionne|marche)|je veux savoir comment (?:ca|cela) fonctionne|c est quoi cette plateforme|quels services proposez vous|vous proposez quoi|que peut on faire ici|je suis nouveau(?: expliquez moi)?|explique(?:z)? moi (?:la plateforme|buzz booster))[?.! ]*$/,[
    "Buzz Booster est une plateforme pour commander des services de visibilité et d’engagement sur les réseaux sociaux. Selon les offres du catalogue actuel, cela peut concerner des abonnés ou membres, des vues, des mentions J’aime, des commentaires ou d’autres interactions. Consultez Nouvelle commande pour savoir quels réseaux et services sont réellement proposés.",
    "Si vous êtes déjà connecté, gardez votre compte et passez directement à Recharger : inutile de recréer un compte.",
    "1. Si vous n’avez pas encore de compte, inscrivez-vous et vérifiez votre adresse e-mail, puis connectez-vous.",
    "2. Rechargez votre solde depuis Recharger avec un moyen de paiement disponible.",
    "3. Ouvrez Nouvelle commande pour consulter les catalogues, catégories et services.",
    "4. Lisez les conditions, puis renseignez le lien demandé et la quantité.",
    "5. Vérifiez le prix affiché avant de valider votre commande.",
    "6. Suivez ensuite son évolution dans Ordres.",
    "Vous pouvez aussi consulter vos paiements et mouvements de portefeuille, partager votre lien de parrainage, suivre un remboursement réellement enregistré et contacter Support.",
    "Je peux vous guider pour un premier dépôt, comparer les caractéristiques documentées ou expliquer le suivi d’une commande. Les informations personnelles nécessitent une session membre ; cette présentation, non. Je ne réalise pas de paiement, de commande ou de remboursement à votre place.",
    "Les prix, conditions, garanties et délais dépendent de l’offre affichée. Ces services ne garantissent ni ventes, ni monétisation, ni résultats organiques.",
    "Souhaitez-vous découvrir les services ou apprendre à effectuer votre premier dépôt ?",
  ]),
  guide("signup","Comment créer un compte ?",["Comment s'inscrire ?","Créer un compte Buzz Booster","Inscription Buzz Booster"],/comment.*(?:inscri|creer.*compte)|^(?:inscription|creer un compte)/,[
    "1. Ouvrez la page d’inscription de Buzz Booster.",
    "2. Renseignez les champs demandés : nom d’utilisateur, e-mail, mot de passe et pays.",
    "3. Utilisez votre code ou lien de parrainage à l’inscription si vous en possédez un.",
    "4. Validez, suivez la vérification de l’e-mail affichée, puis connectez-vous.",
    "Le backend documenté exige un mot de passe d’au moins huit caractères. Ne communiquez jamais votre mot de passe ou votre code de vérification dans le chat.",
  ]),
  guide("email","Je n'ai pas reçu mon e-mail de vérification",["Comment vérifier mon adresse e-mail ?","Renvoyer l'e-mail de vérification"],/(?:mail|email).*(?:verification|verifier|recu)|verification.*(?:mail|email)/,[
    "1. Vérifiez l’adresse e-mail saisie et vos courriers indésirables.",
    "2. Utilisez l’option de renvoi proposée par l’interface, en respectant ses limites.",
    "3. Contactez Support si le problème persiste.",
    "Ne transmettez pas le code de vérification à Sabito. La vérification de l’e-mail n’est pas une activation payante.",
  ]),
  guide("password","J'ai oublié mon mot de passe",["Comment réinitialiser mon mot de passe ?","Je n'arrive pas à me connecter"],/mot de passe|(?:comment|impossible|arrive pas).*(?:connecter|connexion)/,[
    "1. Ouvrez la page de connexion et utilisez « mot de passe oublié ».",
    "2. Suivez les instructions reçues par e-mail.",
    "3. Définissez votre nouveau mot de passe uniquement dans le formulaire prévu.",
    "Ne transmettez jamais à Sabito un mot de passe, un lien de réinitialisation ou un code secret. En cas de difficulté persistante, ouvrez Support.",
  ]),
  guide("wallets","Quelle différence entre le solde local et le solde USD ?",["Comment comprendre mes soldes ?","Comment fonctionnent les portefeuilles ?"],/(?:difference|comprendre|fonctionnent|expliquer).*(?:solde|portefeuille)/,[
    "Le portefeuille local et le portefeuille USD sont distincts. Ne les additionnez pas comme un solde unique.",
    "Le connecteur identifie le solde local interne en XAF : le pays du membre ne permet pas de le rebaptiser XOF ou dans une autre devise.",
    "Les indications de l’interface et les règles de conversion courantes font foi. Pour connaître vos soldes personnels, demandez une vérification ; Sabito ne les déduit pas d’un ancien message ou d’une capture.",
  ]),
  guide("mobile-money","Comment faire un dépôt Mobile Money ?",["Comment faire un dépôt ?","Comment recharger mon compte ?","Guide Mobile Money"],/(?:comment|guide|procedure|etapes).*(?:depot|recharg|mobile money)|^guide mobile/,[
    "1. Connectez-vous et ouvrez Recharger.",
    "2. Choisissez Mobile Money, puis un pays et un opérateur réellement proposés.",
    "3. Renseignez le téléphone du compte Mobile Money et le montant.",
    "4. Si un OTP est demandé, saisissez-le uniquement dans le formulaire sécurisé, jamais dans ce chat.",
    "5. Vérifiez le numéro, le pays, l’opérateur, le montant crédité, les frais et le total à payer.",
    "6. Confirmez, puis validez chez l’opérateur et attendez la confirmation.",
    "7. Consultez Historique paiements puis le solde.",
    "La version documentée indique un minimum de 500 FCFA et 2 % de frais ajoutés. Ces paramètres peuvent évoluer : le formulaire courant fait foi, notamment dans un autre pays ou une autre devise.",
    "Exemple indicatif avec ces paramètres : 5 000 XAF de dépôt + 100 XAF de frais = 5 100 XAF à payer, pour un crédit de base de 5 000 XAF, hors éventuel bonus. Les frais ne sont pas du solde utilisable.",
    "Les pays et opérateurs sont dynamiques : je ne peux pas garantir une option absente de Recharger.",
  ]),
  guide("wave","Comment payer avec Wave ?",["Wave ne s'ouvre pas","Le lien Wave manque","Guide Wave"],/\bwave\b/,[
    "1. Dans Recharger, choisissez Mobile Money, le pays et Wave si cette option est proposée.",
    "2. Renseignez le numéro et le montant, vérifiez le récapitulatif et confirmez.",
    "3. Utilisez le bouton de poursuite du paiement ou la redirection vers l’application ou la page Wave.",
    "4. Finalisez chez Wave, revenez sur Buzz Booster et attendez la confirmation.",
    "Si le lien ou le bouton n’est pas disponible, je ne peux pas inventer un lien. Ne payez pas sur un numéro transmis dans le chat et ne créez pas immédiatement un deuxième dépôt.",
    "Vérifiez d’abord le dépôt existant dans Historique paiements ou demandez sa vérification à Sabito, puis contactez Support si nécessaire.",
    "Le retour depuis Wave ne prouve pas, à lui seul, que le portefeuille a été crédité.",
  ]),
  guide("crypto","Comment faire un dépôt en cryptomonnaie ?",["Le paiement crypto est indisponible","Guide crypto","Quelles cryptomonnaies sont acceptées ?"],/(?:comment|guide|indisponible|quelle|reseau|adresse).*(?:crypto)|crypto.*(?:indisponible|disponible|fonctionne)/,[
    "Le paiement crypto existe dans le code, mais dépend de sa configuration et de sa disponibilité réelle. S’il est absent ou indisponible, je ne peux pas l’activer.",
    "1. Ouvrez Recharger et choisissez crypto si cette méthode est disponible.",
    "2. Indiquez le montant à créditer en USD, puis vérifiez les frais et le total.",
    "3. Cliquez sur Continuer vers le paiement.",
    "4. Suivez exclusivement la devise, le réseau, le montant, l’adresse et l’expiration affichés sur la page sécurisée.",
    "5. Attendez la confirmation du crédit dans le portefeuille USD.",
    "La configuration documentée indique un minimum de 1 USD et 1,5 % de frais ajoutés : par exemple 10,15 USD à payer pour 10 USD à créditer. Le formulaire courant prévaut.",
    "Je n’invente aucune cryptomonnaie, aucun réseau ni aucune adresse. Un paiement incomplet, irrégulier ou expiré ne garantit pas un crédit automatique ; contactez Support. Ne payez pas une deuxième fois avant clarification.",
  ]),
  guide("deposit-references","Où trouver la référence de mon dépôt ?",["Différence entre référence de dépôt et transaction AfribaPay","Quel numéro faut-il fournir pour vérifier un dépôt ?"],/(?:ou trouver|difference|quel numero|quelle reference).*(?:depot|paiement|afriba)/,[
    "Ouvrez Historique paiements pour retrouver l’opération.",
    "Une référence marchande Buzz Booster, par exemple BUZZ_… ou BB-…, est distincte de l’identifiant AfribaPay PIM… ou POM…. Le téléphone est encore un autre champ.",
    "Le numéro d’une commande SMM concerne l’achat d’un service, pas le dépôt. Fournissez uniquement l’identifiant utile de votre propre opération.",
    "Si plusieurs dépôts correspondent à un téléphone, précisez la référence du dépôt concerné plutôt que choisir arbitrairement.",
  ]),
  guide("deposit-issues","Pourquoi mon dépôt peut-il attendre sa confirmation ?",["Dépôt débité mais solde non crédité : que faire ?","Erreur whitelist IP PAYIN","Access forbidden AfribaPay"],/pourquoi.*depot|que faire.*depot|whitelist|payin|access forbidden/,[
    "Une demande de paiement créée n’est pas un paiement confirmé. Un débit chez l’opérateur ne prouve pas, à lui seul, le crédit du portefeuille.",
    "Consultez Historique paiements. Pour un cas personnel, connectez-vous et demandez la vérification du dépôt avec sa référence utile.",
    "Le crédit de base et le bonus doivent être vérifiés séparément. Une erreur technique ne signifie pas que le paiement a échoué.",
    "Une erreur « Access forbidden / whitelist IP / PAYIN » indique un blocage technique d’autorisation côté service de paiement. Ne modifiez pas votre téléphone et ne répétez pas les paiements pour le contourner ; contactez Support.",
  ]),
  guide("deposit-bonus","Comment fonctionne le bonus de dépôt ?",["Quel est le bonus de dépôt ?","Les dépôts crypto donnent-ils un bonus ?"],/(?:comment|quel|condition|eligib|crypto).*(?:bonus de depot)|bonus.*crypto/,[
    "La règle documentée prévoit 200 FCFA internes à partir de 5 000 FCFA internes de dépôt éligible confirmé, selon le backend. Les montants affichés et la configuration courante font foi.",
    "Ce n’est pas une promesse de 200 unités dans toutes les devises, ni un bonus garanti sur tous les dépôts crypto.",
    "Un dépôt confirmé et son bonus sont deux informations différentes. Le bonus peut être crédité, en attente, non éligible ou pas encore vérifiable avant le crédit du dépôt.",
    "Pour votre propre bonus, demandez une vérification à Sabito avec la référence utile du dépôt.",
  ]),
  guide("order-create","Comment passer une commande ?",["Comment commander des abonnés ?","Comment booster une publication ?","Comment créer une commande ?"],/(?:comment|guide|procedure|etapes).*(?:command|acheter.*(?:abonne|like|vue)|boost)/,[
    "1. Connectez-vous et vérifiez le portefeuille et le solde à utiliser.",
    "2. Ouvrez Nouvelle commande.",
    "3. Choisissez le catalogue ou fournisseur, la catégorie puis un service disponible.",
    "4. Lisez le prix, les quantités minimale et maximale, la description et les conditions.",
    "5. Renseignez le lien demandé et la quantité, puis choisissez le portefeuille si proposé.",
    "6. Vérifiez le montant final calculé et les détails avant validation.",
    "7. Retrouvez votre commande dans Ordres.",
    "Le lien dépend du service : profil, publication, vidéo ou chaîne. Respectez les limites de quantité ; un prix « / 1k » est un tarif pour 1 000 unités, pas nécessairement le total.",
    "Le prix final affiché prévaut. Je ne garantis aucun délai ou remplacement absent de la description, ni la modification du lien après validation. En cas de doute après validation, vérifiez Ordres avant de recommander.",
  ]),
  guide("service-choice","Quel service choisir ?",["Quel service pour Instagram ?","Quel catalogue choisir ?"],/quel.*(?:service|catalogue)|choisir.*(?:service|catalogue)/,[
    "Pour quel réseau social et quel objectif cherchez-vous un service ?",
    "Ouvrez Nouvelle commande et comparez uniquement les services actuellement proposés : type de lien, quantités, prix final, description, conditions et éventuelles garanties.",
    "Je n’ai pas accès au catalogue en temps réel par le connecteur actuel. Je ne peux donc pas inventer un service disponible, un identifiant, un prix ou un délai.",
  ]),
  guide("order-tracking","Comment suivre une commande ?",["Que signifie une commande partielle ?","Quels sont les statuts des commandes ?"],/(?:comment suivre|que signifie|quels.*statut).*(?:commande|partiel)|signifie.*partiel/,[
    "1. Ouvrez Ordres et recherchez la commande par son numéro.",
    "2. Consultez son statut et les détails disponibles.",
    "En attente : pending. En cours : processing. Terminé : completed. Partiel : partial. Annulé : canceled ou cancelled. Échoué : failed. Remboursé : refunded.",
    "Une commande partielle n’est pas nécessairement terminée ou remboursée. Pour votre commande, demandez une vérification avec le numéro affiché dans Ordres.",
    "La quantité restante ne peut être présentée que si le connecteur la retourne. Je ne peux pas inventer un pourcentage livré ni promettre une livraison complète.",
  ]),
  guide("order-requests","Comment demander une annulation, un remboursement ou une accélération ?",["J'ai demandé une annulation, pourquoi la commande continue ?","Comment accélérer une commande ?","Comment annuler une commande ?"],/(?:comment|pourquoi|demande).*(?:annul|acceler)|demande.*rembours/,[
    "1. Dans Ordres, retrouvez la commande et utilisez l’action proposée.",
    "2. Choisissez la demande d’annulation, de remboursement ou d’accélération et décrivez le problème.",
    "3. Envoyez la demande, conservez le numéro de ticket et suivez la réponse dans Support.",
    "L’interface documentée indique habituellement 24 à 72 heures : c’est indicatif, pas garanti.",
    "Envoyer une demande n’annule pas immédiatement la commande. Une annulation, un remboursement, un refus ou une accélération ne peut être annoncé comme acquis sans résultat métier explicite.",
    "Sabito explique la procédure mais n’exécute ni annulation ni remboursement.",
  ]),
  guide("refunds","Comment vérifier un remboursement ?",["Mon ticket est fermé, je suis remboursé ?","Un remboursement revient-il sur Mobile Money ?"],/(?:comment|ticket.*ferm|mobile money).*(?:rembours)|rembours.*(?:mobile money|banque)|ticket.*ferm/,[
    "Ouvrez Remboursements pour consulter les crédits effectivement enregistrés, ou demandez à Sabito une vérification avec le numéro de commande.",
    "Un ticket fermé ne prouve ni un remboursement ni un refus. Une commande annulée, échouée ou partielle ne garantit pas un remboursement immédiat ou intégral.",
    "Le remboursement doit correspondre à une écriture réelle, avec son montant et sa devise. Un recrédit de portefeuille n’est pas un retour sur Mobile Money ou sur un compte bancaire.",
    "L’absence de remboursement enregistré ne suffit pas à conclure à un refus.",
  ]),
  guide("affiliation","Comment fonctionne le parrainage ?",["Comment partager mon lien de parrainage ?","Quel est le pourcentage de parrainage ?","Un petit dépôt exclut-il le bonus ?"],/(?:comment|quel|pourcentage|petit depot|retroactif).*(?:parrain|affili|commission|filleul)|petit depot.*bonus/,[
    "1. Ouvrez Affiliation et copiez votre code ou votre lien.",
    "2. Partagez-le pour que le filleul l’utilise à l’inscription.",
    "3. Les récompenses dépendent d’un dépôt éligible confirmé et de la configuration courante.",
    "4. Consultez vos résultats dans Affiliation.",
    "Les valeurs de 5 % pour le parrain, 2 % pour le filleul et 2 000 FCFA de seuil sont des valeurs par défaut documentées, modifiables. Elles ne prouvent pas les paramètres actifs : Affiliation et le serveur font foi.",
    "Un petit dépôt antérieur n’exclut pas forcément une relation encore éligible. Je ne garantis ni ajout rétroactif, ni changement de parrain, ni récompense sur chaque dépôt, ni retrait des commissions.",
    "Sabito peut consulter votre code, votre commission de parrain et votre bonus de filleul séparément.",
  ]),
  guide("history","Où retrouver mes paiements et transactions ?",["Différence entre Historique paiements et Transactions","Où trouver mes mouvements ?"],/(?:ou (?:trouver|retrouver|consulter|voir)|difference).*(?:paiement|transaction|mouvement)/,[
    "Historique paiements présente les opérations de paiement et leurs références.",
    "Transactions présente les mouvements de débit et de crédit du portefeuille : dépôts, achats de services, remboursements, bonus de dépôt, commissions de parrainage, bonus du filleul et ajustements administrateur.",
    "Sur téléphone, ouvrez le menu de navigation pour retrouver ces rubriques.",
    "Pour vérifier un mouvement personnel, fournissez son numéro ; pour un ajustement, consultez seulement les détails autorisés. Sabito ne révèle ni notes internes ni identité d’un administrateur et n’invente pas un motif absent.",
  ]),
  guide("support","Comment contacter le support ?",["Comment ouvrir un ticket ?","Où suivre mon ticket ?"],/(?:comment|ou).*(?:support|ticket)/,[
    "1. Ouvrez Support dans le menu.",
    "2. Décrivez le problème et donnez la référence pertinente.",
    "3. Joignez une capture utile en masquant les données sensibles.",
    "4. Envoyez la demande et consultez la réponse dans Support.",
    "Le connecteur Buzz Booster ne crée pas de ticket. Sabito peut expliquer la procédure ; un éventuel ticket interne Sabito n’est annoncé qu’après son enregistrement réel et n’est pas un ticket Buzz Booster.",
    "Ne transmettez jamais de mot de passe, OTP, PIN Mobile Money, clé API, secret serveur ou phrase de récupération crypto.",
  ]),
  guide("no-activation","Faut-il payer pour activer son compte ?",["Comment activer mon compte ?","Activation de compte Buzz Booster"],/activ.*compte|compte.*activ/,[
    "Buzz Booster ne propose pas d’activation de compte payante. Suivez l’inscription et la vérification de votre e-mail affichées par l’interface.",
    "La vérification d’e-mail est une mesure d’authentification, pas un service d’activation payante. Ne payez pas une prétendue activation proposée dans le chat.",
  ]),
  guide("no-withdrawal","Puis-je effectuer un retrait ?",["Fais-moi un retrait","Comment retirer mes commissions ?","Vérifier mon retrait"],/retrait|retirer.*(?:argent|solde|commission)/,[
    "Le connecteur Buzz Booster actuel ne propose pas de service de retrait ni de suivi de retrait. Je ne peux pas effectuer cette opération ou inventer un statut.",
    "Pour une question sur l’utilisation de vos fonds ou commissions, consultez les indications de la plateforme ou contactez Support.",
  ]),
  guide("identity","Puis-je vérifier l'opération d'un autre utilisateur ?",["Voici l'identifiant d'un autre utilisateur, vérifie son dépôt"],/(?:autre (?:utilisateur|membre|compte)|compte de quelqu un)/,[
    "Je ne peux consulter que les opérations autorisées du membre connecté. Un identifiant donné dans le chat ne permet pas de changer d’identité.",
    "Je ne révèle ni l’existence ni les détails d’une opération appartenant à un autre compte.",
  ]),
];

/** Ordered, conservative routing of general guides. Personal cases are not guides. */
export function buzzGuideFor(text:string):BuzzGuide|undefined {
  const q=expandQuestion(text).normalize("NFKD").replace(/\p{M}/gu,"").toLowerCase().replace(/['’_-]/g," ").replace(/\s+/g," ").trim();
  const prioritized=["identity","no-withdrawal","no-activation","overview","wave","crypto","order-requests","refunds","order-tracking","service-choice","deposit-references","deposit-bonus","affiliation"];
  const found=[...prioritized.map(key=>buzzGuides.find(guide=>guide.key===key)!),...buzzGuides.filter(guide=>!prioritized.includes(guide.key))]
    .find(guide=>guide.match.test(q));
  if(found&&["affiliation","deposit-bonus"].includes(found.key)&&/\b(mon|ma|mes)\b/.test(q)&&!/^comment\b/.test(q))return undefined;
  return found;
}
