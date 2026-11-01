import type { IntentDefinition } from "./assistant-settings";
export function catalogueIntents():IntentDefinition[] {
  return [
    {id:"service_catalog",name:"Catalogue des services en direct",backend_function:"service_catalog",
      triggers:["consulter le catalogue","catalogue des services","offres disponibles","afficher les offres"],
      initial_response:"Je peux consulter les offres actuelles selon le réseau et votre objectif, sans passer de commande."},
    {id:"service_recommendations",name:"Recommandations de services en direct",backend_function:"service_recommendations",
      triggers:["recommande un service","recommander un service","conseille un service","comparer les services","je veux booster",
        "quel service me conseillez","quel service choisir pour"],
      initial_response:"Je peux comparer les offres selon votre besoin et les statistiques retournées, sans garantir de résultat."},
  ].map(intent=>({...intent,enabled:true,fields:[],
    guest_message:"Les guides généraux sont accessibles sans connexion. Connectez-vous à votre compte Buzz Booster pour consulter les offres actuelles et obtenir une recommandation issue du catalogue.",
    responses:{success:"Consultation du catalogue effectuée.",pending:"Le catalogue n’est pas encore disponible.",
      not_found:"Aucune offre ne correspond à ces critères.",error:"Le catalogue est indisponible pour le moment."},
  }));
}
