# Historique de 24 heures, suivi de satisfaction et administration

Cette évolution nécessite la migration additive `009_conversation_support.sql`.
Elle ajoute deux tables, sans effacer les conversations, les références ni les données financières.

## Installer sur Plesk

Envoyer les sources vers GitHub, attendre le dernier workflow de release vert,
puis effectuer Pull Updates et Deploy Now.

Dans Run script, exécuter successivement :

1. `plesk:migrate:status`
2. `plesk:migrate:plan`
3. Après lecture du plan et sauvegarde habituelle de la base : `plesk:migrate:apply:reviewed`
4. `plesk:migrate:status` doit afficher `pending: []`.
5. Restart App, puis recharger le site hébergeant le widget.

Aucune nouvelle clé ni modification du backend des plateformes n’est nécessaire pour cette fonctionnalité.

## Historique et confidentialité

La fenêtre de reprise est fixe : 24 heures à partir de la création de la conversation.
Fermer le widget ne la supprime pas. Le serveur reprend la conversation récente de la même
plateforme et de la même identité authentifiée, y compris après renouvellement de session.
Un autre compte ne peut pas la récupérer. Après expiration, une nouvelle conversation commence.
L’historique est paginé pour ne pas tronquer silencieusement les longues conversations.

Pour les visiteurs anonymes, un cookie opaque HttpOnly, Secure et partitionné permet
de retrouver leur identité publique pendant 24 heures. Aucun JWT n’est persisté dans
localStorage. L’origine doit rester approuvée dans Sabito. Les navigateurs qui bloquent
tout cookie tiers peuvent empêcher la reprise anonyme après rechargement complet du site :
le widget ne contourne pas cette protection. Une simple fermeture/réouverture conserve
la conversation en mémoire même dans ce cas. Déconnexion et changement de membre effacent
l’affichage local ; le cookie visiteur est supprimé à la déconnexion.

L’expiration de la reprise utilisateur n’efface pas les archives de support administratives.
Supprimer un ticket ou une entrée des questions sans réponse efface uniquement cette entrée,
pas les messages, les références approuvées ni les opérations financières.

## Satisfaction et statistiques

Sabito répond au nouveau sujet puis demande si la réponse au sujet précédent a aidé.
Une réponse explicitement positive donne « Excellent ! » ; une réponse négative demande
à quel niveau aider et permet de reprendre la question avec « aidez-moi à nouveau ».
Cette étape n’exécute pas une transaction et ne crée jamais un avis positif automatiquement.
Les demandes de champs d’une vérification en cours ne sont pas considérées comme des résolutions.

Les statistiques sont isolées par plateforme et filtrables sur 7, 30 ou 90 jours :
questions fréquentes normalisées, avis demandés/reçus, avis positifs/négatifs,
satisfaction positive parmi les avis reçus, taux de réponse. Sans avis, le taux de
satisfaction est non mesuré, pas 100 %. La collecte des nouveaux indicateurs commence
après installation ; les conversations antérieures ne reçoivent pas d’avis rétroactif.
