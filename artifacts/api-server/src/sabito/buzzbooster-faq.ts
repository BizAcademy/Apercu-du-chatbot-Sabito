import type { BuzzGuide } from "./buzzbooster-guides";
import { expandQuestion,tokenSimilarity } from "./question-spelling";

const faq=(key:string,title:string,variants:string[],match:RegExp,content:string):BuzzGuide=>
  ({key,title,variants,match,content});

/** Owner-approved general information, not live availability or commercial proof.
 * An administrator may add the official site to the editable access reference.
 * Never derive it from the widget, an allowed embedding origin or PUBLIC_URL. */
export const buzzFaq:BuzzGuide[]=[
  faq("faq-access","Comment faire pour accéder à la plateforme ?",[
    "Comment accéder à Buzz Booster ?","Comment aller sur la plateforme ?","Où ouvrir Buzz Booster ?",
    "Comment rejoindre le site ?","Comment se connecter à Buzz Booster ?",
  ],/(?:comment|ou|je veux).*(?:acceder|acces|aller sur|ouvrir|rejoindre).*(?:plateforme|buzz|site)|comment (?:se|me) connecter (?:a buzz|sur la plateforme)/,
  "Vous pouvez accéder à Buzz Booster depuis le navigateur de votre téléphone ou de votre ordinateur, en ouvrant son site officiel. L’adresse officielle n’est pas renseignée dans cette référence : je ne vais pas en inventer une ni utiliser l’adresse de Sabito ou de l’aperçu.\nSi vous êtes nouveau :\n1. Appuyez sur « Inscription ».\n2. Renseignez les informations demandées.\n3. Vérifiez votre adresse e-mail selon les instructions affichées.\n4. Connectez-vous pour accéder au tableau de bord.\nSi vous avez déjà un compte, utilisez simplement « Connexion », sans recréer de compte. Vous pourrez consulter les services, recharger votre solde et passer vos commandes."),
  faq("faq-advantages","Pourquoi choisir Buzz Booster ?",[
    "Quels sont les avantages de Buzz Booster ?","Pourquoi choisir cette plateforme ?",
    "Pourquoi prendre Buzz Booster ?","Quel intérêt de choisir Buzz Booster ?",
  ],/(?:pourquoi|avantage|interet).*(?:choisir|prendre|buzz)|avantages? (?:de|offerts par) (?:cette|la) plateforme/,
  "Buzz Booster permet de retrouver plusieurs catalogues de services dans un même espace, de comparer les offres, de payer avec votre solde et de suivre vos commandes. Vous disposez aussi d’un historique de paiements, du suivi des mouvements du portefeuille et d’un support en cas de difficulté.\nJe peux vous aider à comprendre les offres et à choisir selon votre objectif et votre budget. Le prix, les conditions et les délais dépendent du service sélectionné. Je ne dispose pas d’éléments permettant d’affirmer que Buzz Booster est la moins chère, la meilleure ou la plus rapide."),
  faq("faq-networks","Buzz Booster agit sur quelles applications ?",[
    "Sur quels réseaux sociaux fonctionne Buzz Booster ?","Quelles applications peut-on booster ?",
    "Est-ce que Buzz Booster contrôle Instagram ?",
    "Buzz Booster est-il partenaire des réseaux sociaux ?",
  ],/(?:quels? reseaux|quelles? applications|sur quelles? plateformes)|buzz.*(?:partenaire|controle)|(?:partenaire|controle).*(?:reseau|instagram|tiktok)/,
  "Buzz Booster propose des services destinés aux réseaux sociaux et plateformes présents dans ses catalogues. Instagram, TikTok, Facebook, YouTube ou WhatsApp sont des exemples possibles, pas une liste de disponibilités actuelles garanties. Les prestations peuvent concerner des vues, des abonnés, des membres ou d’autres interactions, selon les offres.\nUn service de boost ne signifie ni partenariat officiel avec un réseau social, ni contrôle de ses applications. Je n’ai pas consulté de catalogue actuel dans cette réponse générale.\nQuelle application vous intéresse ? Je pourrai vous orienter ; les outils de catalogue nécessitent une session membre autorisée."),
  faq("faq-expiry","Les vues et les abonnés gagnés ont-ils une expiration ?",[
    "Les abonnés expirent-ils ?","Est-ce que les vues sont permanentes ?","Les abonnés sont-ils à vie ?",
    "Combien de temps durent les abonnés ?","Pourquoi les abonnés peuvent-ils baisser ?",
    "Quelle est la durée de garantie des abonnés ?",
  ],/(?:vues?|abonnes?|resultats?|interactions?).*(?:expir|permanent|a vie|durent|baisser)|(?:duree|garantie|expiration).*(?:abonne|vue|resultat|service)/,
  "Il n’existe pas de durée unique pour tous les services : les conditions dépendent de l’offre choisie. Il faut distinguer une éventuelle durée prévue dans le service d’une baisse après livraison. Des abonnés peuvent se désabonner ou être supprimés par le réseau social ; les compteurs de vues et d’interactions peuvent aussi être réévalués.\nCertaines offres peuvent prévoir un remplacement ou une garantie limitée, uniquement si leurs conditions l’indiquent. Un remplacement ne signifie pas que les résultats sont permanents ; je ne promets pas des vues ou abonnés « à vie » et n’invente aucune durée de garantie.\nQuel service vous intéresse ? Je peux vous aider à comprendre ses conditions."),
  faq("faq-trust","Buzz Booster est-elle une plateforme fiable ?",[
    "Peut-on faire confiance à Buzz Booster ?","La plateforme est-elle fiable ?",
    "Buzz Booster est-il sûr ?","Les services sont-ils garantis à 100 % ?",
  ],/(?:buzz|plateforme).*(?:fiable|confiance|sur\b)|(?:fiable|confiance).*(?:buzz|plateforme)|services?.*garantis?.*100/,
  "Buzz Booster dispose d’un espace pour consulter les paiements, les commandes et les mouvements du solde, ainsi que d’un support pour signaler un problème. Cela ne rend pas chaque service sans risque et ne garantit pas chaque livraison : les résultats dépendent de l’offre, du fournisseur et du réseau social.\nLisez les conditions et les garanties documentées. Avec une session membre autorisée, je peux aider à comparer les offres et leurs statistiques accessibles, avec la période et la taille d’échantillon. Une commande terminée ne prouve pas la satisfaction ; je n’invente ni avis clients, ni certification, ni fiabilité de 100 %.\nUne première commande modeste peut être envisagée si elle respecte le minimum du service, sans garantir les résultats futurs."),
  faq("faq-countries","La plateforme est disponible dans quels pays ?",[
    "Quels pays sont acceptés ?","Buzz Booster fonctionne dans quels pays ?",
    "Est-ce disponible dans mon pays ?","Peut-on payer depuis tous les pays ?",
    "Quels pays et opérateurs sont disponibles pour le dépôt ?",
  ],/(?:quels? pays|dans (?:mon|tous les|quel) pays|pays.*(?:disponible|accepte|paiement|operateur)|disponible.*pays)/,
  "Il faut distinguer l’accès au site des moyens de paiement disponibles dans votre pays.\nPour connaître les options de dépôt :\n1. Ouvrez « Recharger ».\n2. Choisissez la méthode de paiement.\n3. Consultez les pays et opérateurs affichés.\nCes options peuvent évoluer. Je n’ai pas consulté de source actualisée des pays et opérateurs dans cet échange et ne vais pas inventer de liste ni annoncer une disponibilité mondiale. Les pays proposés à l’inscription ne prouvent pas les pays de paiement ; l’absence d’un opérateur ne prouve pas qu’un pays entier est exclu.\nDans quel pays souhaitez-vous effectuer votre dépôt ?"),
];

/** Conservative corrections only for public FAQ vocabulary, never identifiers. */
export function faqLanguage(text:string) {
  const vocabulary=["acceder","plateforme","applications","reseaux","abonnes","expiration","permanent","fiable","disponible","avantages","choisir","garantie","confiance"];
  return expandQuestion(text).split(" ").map(word=>{
    if(word.length<5||/\d/.test(word))return word;
    if(vocabulary.includes(word))return word;
    const matches=vocabulary.filter(candidate=>tokenSimilarity(word,candidate)>=0.8);
    return matches.length===1?matches[0]:word;
  }).join(" ");
}
