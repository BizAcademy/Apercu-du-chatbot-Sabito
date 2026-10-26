# Questions configurées longues

Les questions principales, variantes, questions proposées et formulations déclencheuses
n'ont plus de plafond applicatif de caractères. Les réponses conservent leurs limites
actuelles. Les requêtes HTTP et Socket.IO restent limitées à 2 Mio pour protéger le
serveur : une requête trop volumineuse est refusée, jamais tronquée.

## Installation Plesk

1. Pousser les modifications sur GitHub et attendre le workflow vert.
2. Dans Plesk : Pull puis Deploy Now.
3. Dans Node.js → Run script, examiner le plan :

   `plesk:migrate:plan`

4. Sauvegarder la base. Vérifier que la seule migration en attente est
   `008_long_knowledge_questions.sql`. Elle élargit la colonne de la question principale
   de VARCHAR(255) à LONGTEXT ; elle ne supprime ni ne raccourcit aucune donnée.
   L'opération ALTER peut verrouiller temporairement la table.
5. Après lecture du plan, appliquer avec l'approbation supplémentaire requise pour ALTER :

   `plesk:migrate:apply:reviewed --allow-destructive`

   Malgré le nom de cette option générique, cette migration ne supprime aucune donnée.
   Ne pas l'utiliser sans relire le plan si d'autres migrations sont en attente.
6. Vérifier avec `plesk:migrate:status`, puis cliquer Restart App.

Ne pas relancer un build ou une installation de dépendances dans Plesk.
Ne pas modifier les migrations précédemment appliquées.
