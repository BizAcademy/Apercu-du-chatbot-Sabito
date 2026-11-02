# Présentation et conseil budgétaire

La FAQ générale (accès, avantages, réseaux, durée des résultats, fiabilité et pays) s’ajoute une seule fois aux références Buzz Booster lors du chargement de la configuration. Elle n’écrase pas les références de même titre et ne réinstalle pas un guide supprimé après cette installation. Les anciens projets reçoivent ce complément même si leur pack initial est déjà installé.

Pour fournir le lien officiel : modifier la référence « Comment faire pour accéder à la plateforme ? » dans l’administration et y saisir l’URL officielle vérifiée. Aucun lien n’est déduit de l’adresse de Sabito, du Preview ou d’un domaine autorisé du widget. Ce complément n’exige aucune migration ni nouvelle clé.

Les demandes sur le but de Buzz Booster expliquent l’utilité et les limites des prestations avant de proposer le réseau à développer. Les demandes de conseil avec un budget conservent le montant, le réseau et l’objectif, sans être transformées en guides de dépôt.

Avant une comparaison chiffrée : préciser XAF (F/FCFA seul est ambigu), distinguer argent disponible et somme à déposer frais compris, puis demander la quantité nécessaire au filtre budget. Aucun montant étranger ou brut n’est transmis comme budget XAF net. Le montant déclaré n’est jamais présenté comme un solde vérifié.

Ces comportements utilisent le contexte public existant de la migration 010 ; aucune migration supplémentaire ni nouvelle clé. Les visiteurs reçoivent des conseils généraux, les outils restent réservés aux membres autorisés. La validation du catalogue en production exige toujours un vrai essai membre.

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
