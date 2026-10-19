# Règles de vérification propres à chaque plateforme

Les instructions sont propres au projet créé dans Sabito. Elles ne constituent
ni du SQL ni une autorisation de lire une base. Les actions réelles sont définies
par les règles structurées de **Configuration de l'assistant → Intentions**.
Les accueils membre et visiteur se configurent dans **Messages**.

## Répondre d'abord, proposer une vérification ensuite

Pour chaque déclencheur, Sabito répond d'abord à la question à partir de sa
référence approuvée. Si aucune référence ne correspond, il utilise la **Réponse
initiale** configurée pour cette intention ; sans texte approuvé, il indique
qu'il ne connaît pas la réponse, sans inventer de délai.

Il termine par la **Question de confirmation**, par exemple :
« Avez-vous effectué un retrait ? Répondez par oui ou non. »

- `oui` : demander le premier champ configuré, puis les suivants si nécessaire ;
  le backend n'est appelé qu'une fois tous les champs valides recueillis ;
- `non` ou `annuler` : fermer la démarche, sans consulter les transactions ;
- réponse ambiguë ou numéro envoyé avant confirmation : redemander oui/non,
  sans conserver ce numéro comme champ de recherche ;
- visiteur non vérifié : après confirmation, demander une connexion membre
  plutôt que collecter des données personnelles ou appeler le backend.

Cette confirmation s'applique aussi aux règles existantes. Leur question par
défaut est personnalisable dans l'éditeur. L'attente est enregistrée dans la
conversation existante ; aucune migration SQL supplémentaire n'est nécessaire.

Le modèle **Retrait** configure `withdrawal_status`, demande le champ
`withdrawal_number` après confirmation, puis affiche `{statut}` et
`{details_transaction}`. Cette fonction doit être raccordée dans le connecteur
de la plateforme, avec les mêmes contrôles de droits que `deposit_status`.

## Exemple : dépôt non reçu

1. Sélectionner la plateforme concernée dans le dashboard.
2. Dans **Intentions**, ajouter le modèle « Dépôt non reçu ». Si une ancienne
   règle couvre déjà les mêmes expressions, modifier cette règle ou la désactiver
   avant d'activer le modèle. Une ambiguïté n'entraîne jamais un choix arbitraire.
3. Déclencheurs : `dépôt non reçu`, `dépôt en attente`, `vérifier mon dépôt`.
   Groupe de synonymes : `dépôt`, `recharge`, `versement`. Les synonymes sont
   propres à la plateforme et partagés entre ses règles et ses références.
   Une expression spécifique est préférable à un simple mot comme `compte`.
4. Champ `deposit_number`, question :
   « Veuillez me communiquer le numéro utilisé pour effectuer le dépôt. »
   Le modèle accepte un texte, notamment un numéro de téléphone avec indicatif.
   Cette question n'est posée qu'après la confirmation de l'utilisateur.
5. Fonction serveur : `deposit_status`. Enregistrer les réglages.
6. Réponses succès / attente / erreur de transaction :

   ```text
   Statut de votre transaction : {statut}.
   {details_transaction}
   ```

Les déclencheurs sont reconnus dans une phrase plus longue, sans pénalité due
au texte qui les entoure. Les accents et la casse sont normalisés. Le moteur
reste déterministe ; aucun modèle IA n'invente une réponse.

## Contrat du gestionnaire backend

Le connecteur existant de chaque plateforme reçoit :

```js
{
  operation: "deposit_status",
  external_user_id: "identité-membre-vérifiée-par-le-serveur",
  fields: { deposit_number: "+237 6xx xxx xxx" }
}
```

`external_user_id` n'est jamais une identité déclarée librement par le frontend.
Le gestionnaire doit :

- vérifier les droits du membre et limiter la requête aux transactions de ce
  membre, avec des paramètres SQL (jamais de concaténation) ;
- normaliser et valider le numéro selon ses propres règles ;
- refuser une recherche globale par téléphone ou référence seule ;
- ne jamais choisir arbitrairement une transaction si le numéro en désigne
  plusieurs : demander une référence plus précise via un champ configuré ;
- ne renvoyer que les détails affichables au membre, jamais une ligne complète
  de base, un secret de paiement, des notes internes ou les données d'un tiers.

Exemple de résultat autorisé :

```js
return {
  status: "pending",
  data: {
    statut: "En attente de confirmation du prestataire",
    reference: "DEP-123",
    montant: 15000,
    devise: "XAF",
    date: "2026-10-19T10:30:00Z",
    moyen_paiement: "Mobile Money",
    numero_masque: "+237 6** *** 123"
  }
};
```

`status` est la catégorie technique existante :
`ok`, `success`, `confirmed`, `active`, `pending`, `inactive`, `failed`,
`not_found`, `forbidden` ou `error`.
`data.statut` porte le libellé métier exact et prend priorité dans `{statut}`.
Sans ce champ, `{statut}` utilise `status`.
`{details_transaction}` affiche les champs non nuls du seul objet `data`.
Les données sont affichées comme du texte, pas comme du HTML.
Chaque clé de `data` peut aussi être interpolée séparément : `{montant}`, etc.

Un résultat `failed` indique une transaction réellement vérifiée mais refusée :
il utilise la réponse « Erreur » configurée sans la transformer en panne.
Un résultat `error`, `forbidden` ou `not_found`, une valeur requise manquante,
une panne ou un connecteur indisponible conserve le parcours sûr de support :
aucune vérification réussie n'est inventée.

Configurer les règles dans Sabito ne crée pas le gestionnaire dans BCA ou Buzz
Booster. Celui-ci reste à raccorder à leurs services réels, via le connecteur
et les identifiants serveur déjà générés par Sabito.

## Déploiement

Aucune migration supplémentaire pour cette évolution. Attendre le succès de
la release GitHub correspondant au push, puis Pull / Deploy Now / Restart dans
Plesk. Les réglages existants ne sont pas remplacés automatiquement.
