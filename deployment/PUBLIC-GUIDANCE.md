# Guides conversationnels Buzz Booster

La migration additive `010_public_guidance_context.sql` conserve le contexte des
guides publics séparément des vérifications financières. Elle ne modifie aucune
transaction, référence approuvée ou configuration BCA.

Après un workflow GitHub vert et Pull/Deploy dans Plesk, exécuter les scripts :

1. `plesk:migrate:status`
2. `plesk:migrate:plan`
3. Après lecture du plan et sauvegarde habituelle, `plesk:migrate:apply:reviewed`
4. `plesk:migrate:status` : vérifier `pending: []`, puis Restart App.

Si la migration 009 est également en attente, le même plan présente les deux
migrations additives. Ne pas marquer manuellement une migration comme appliquée.
Aucune nouvelle clé ni modification du backend Buzz Booster n’est nécessaire.

## Comportements

- Demander à effectuer un dépôt donne les étapes de Recharger, sans référence.
- Répondre Wave poursuit ce guide sans redemander un pays déjà fourni.
- Demander à booster donne le parcours Nouvelle commande, puis le réseau
  manquant, puis l’objectif manquant, une seule question à la fois.
- Un membre autorisé peut consulter le catalogue actuel dès que ses critères
  sont suffisants. Quantité et budget ne sont pas obligatoires pour simplement
  consulter ou comparer. Un budget total exige une quantité et une devise XAF
  explicite ; aucune conversion silencieuse depuis une autre devise.
- Un visiteur reçoit les guides sans consultation des outils membre.
- Un diagnostic n’annonce pas de statut financier sans résultat réel.
- Une demande d’annulation explique la procédure, sans annuler ni rembourser.
- Une vérification explicite par numéro de commande conserve le circuit sécurisé
  existant, sans guide ou confirmation supplémentaire.

Le contexte est lié à la plateforme, au propriétaire de la conversation et à la
dernière réponse du guide. Les informations d’une autre conversation ou d’un
ancien sujet ne doivent pas être réutilisées arbitrairement.

## Vérifications

Tester notamment les formulations « je veux déposer », « je veux bosster »,
« je veux des vues TikTok », puis les réponses courtes Wave / Instagram / vues.
Les tests isolés ne remplacent pas la validation d’un catalogue de production
avec un vrai compte membre et comparaison avec Nouvelle commande.
