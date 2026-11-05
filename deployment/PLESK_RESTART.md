# Contrôler un redémarrage Cybrancy / Plesk

Le propriétaire effectue les opérations sur GitHub et Cybrancy lui-même.
Aucune installation de dépendances ni migration SQL n'est nécessaire pour
ce correctif de cycle de vie.

## Ce que corrige le serveur

- Un échec du lanceur termine le processus avec un code non nul, même si
  le canal de contrôle de Passenger maintient la boucle Node.js ouverte.
- Le lanceur affiche un code de diagnostic autorisé, jamais la configuration
  privée, une URL signée ou le détail brut d'une exception.
- SIGTERM, SIGINT et l'événement `exit` de Passenger utilisent le même arrêt.
- Socket.IO ferme ses transports sans envoyer une déconnexion permanente
  d'espace de noms : les widgets peuvent se reconnecter automatiquement.
- Les connexions HTTP et le pool MySQL sont fermés, avec un délai maximal.

## Mise en ligne et vérification

1. Attendre que le workflow GitHub du commit soit vert et que sa Release existe.
2. Dans Cybrancy : Pull now, Deploy now, puis Restart App.
3. Ouvrir `https://sabito.bizconnectacademy.com/v1/status`.

Le statut conserve `configured`, `missingSecrets` et `engine`, et ajoute :

- `release` : empreinte SHA-256 de la source du paquet réellement chargé ;
- `startedAt` : heure UTC de démarrage du processus, au format ISO.

`release` doit correspondre au suffixe du tag GitHub `plesk-<empreinte>`.
Après un nouveau redémarrage de la même version, `release` reste identique
mais `startedAt` change. Les réponses de statut ne sont pas mises en cache.
Ni PID, ni chemin interne, ni valeur secrète ne sont exposés.

Un simple `configured: true` ou HTTP 200 ne prouve pas un redémarrage.
L'avertissement du panneau Plesk n'est pas, à lui seul, une exception Node.js :
si l'identité du processus change et que le chat se reconnecte, mais que le
panneau affiche toujours cet avertissement, le contrôle d'état du panneau
reste à diagnostiquer côté hébergement. Ce correctif ne prétend pas réparer
une extension Plesk inaccessible depuis le dépôt.

En cas d'échec, consulter les nouvelles lignes Node.js :

- `RELEASE_NOT_READY_OR_ACCESS_DENIED` : vérifier la publication du paquet
  correspondant au commit et les autorisations configurées côté hébergement ;
- `GITHUB_ACCESS_FAILED` / `GITHUB_DOWNLOAD_FAILED` : vérifier l'accès aux Releases ;
- `RELEASE_DOES_NOT_MATCH_SOURCE` / `CHECKSUM_MISMATCH` : ne pas forcer l'installation ;
- `STARTUP_FAILED` : une autre erreur a été masquée pour protéger les secrets.

Ne pas supprimer `.env`, `.sabito-runtime`, les données ou le dépôt ; ne pas
remplacer les paramètres de connexion pour faire disparaître un avertissement.

## Validation isolée

`pnpm run test:plesk-deploy` couvre notamment un échec de chargement avec un
canal de contrôle simulé maintenu ouvert. `pnpm run build:cybrancee` construit
le paquet. Le lanceur MariaDB isolé avec `--verify` couvre les signaux, l'arrêt
Passenger avec un WebSocket authentifié actif, un redémarrage à chaud avec
la même base temporaire, la nouvelle heure de démarrage et la reconnexion du chat.
L'événement Passenger est simulé ; cela ne remplace pas une vérification du
bouton et de l'extension sur le serveur réel.

Les clés de test restent identiques entre les deux démarrages, comme les
paramètres privés de production ; une rotation de clé est un autre scénario.
