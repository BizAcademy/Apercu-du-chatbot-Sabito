---
name: Sabito product scope
description: Durable product boundaries for the multi-platform Sabito assistant.
---

Le code de connexion doit être généré ici, dans Sabito, puis configuré dans l'environnement BCA ou d'un autre site. Sabito should understand each connected platform, answer user questions with current information, and guide users when needed.

**Why:** The user explicitly corrected the credential-generation direction and asked to follow the original project's context. Static documentation alone cannot satisfy the real-time requirement.

**How to apply:** Preserve Sabito-issued connection credentials configured on each platform's backend. Do not replace this onboarding flow with a request for a BCA-issued key. Keep secrets server-side, isolate tenants, and enforce user permissions for account-specific data; live data access is a separate capability from chat authentication.

Le projet Sabito existant doit être repris, et non poursuivi comme un chat séparé.

**Why:** The user explicitly confirmed this after asking the agent to reread the original GitHub project.

**How to apply:** Treat the original administrator dashboard, project-issued credentials, temporary user tokens, Socket.IO protocol and local approved-knowledge engine as the reference architecture. Adapt storage to the existing workspace without replacing its database or discarding evaluation corrections.

Validated answer corrections must become platform-specific references for future responses, not merely edits to the displayed conversation.

**Why:** The user explicitly chose reusable knowledge when asked how corrections should be used.

**How to apply:** Preserve approved corrections, consult them for subsequent questions and reformulations, and allow the administrator to revise or remove them.

Until platform administrator authentication exists, corrections in the evaluation Preview remain isolated to the tester's browser workspace rather than becoming shared BCA knowledge.

**Why:** An anonymous preview must not allow any visitor to overwrite the platform's trusted knowledge. The evaluation workspace is not a production administration surface.

**How to apply:** Promote evaluation corrections into shared platform knowledge only behind verified platform administrator permissions; do not publish unauthenticated correction management.

The user does not want Sabito's answers to consume Replit credits.

**Why:** The user explicitly rejected credit-funded answer generation and asked for the platform keys needed for real-time BCA access.

**How to apply:** Keep Replit-billed inference disabled unless the user explicitly changes this instruction. Prefer the original knowledge-based engine or a separately agreed provider configuration; distinguish inference costs from platform-data access.

L'utilisateur veut publier Sabito sur Cybrancee, et non sur Replit. Sa capture de l'hébergement confirme un panneau Plesk.

**Why:** L'utilisateur a explicitement choisi cet hébergement après la proposition de publication sur Replit.

**How to apply:** Préparer un déploiement externe pour Cybrancee ; vérifier l'offre, l'accès Node.js et le type de base disponible avant d'adapter le projet. La page d'installation Plesk ne prouve pas que Sabito est déployé.

Le 11 octobre 2026, l'utilisateur a précisé que Node.js 21.7.3 est la version maximale proposée dans son panneau Cybrancee ; Node.js 22 n'y est pas disponible.

**Why:** Les instructions d'installation précédentes supposaient à tort que l'utilisateur pouvait sélectionner une version 22 ou supérieure.

**How to apply:** Ne pas répéter cette sélection comme une étape réalisable sans vérifier que l'hébergement a été mis à jour. Distinguer compatibilité technique effectivement testée et support de sécurité du runtime ; demander l'activation d'une version LTS prise en charge pour la production.

L'utilisateur utilise MySQL/MariaDB sur Cybrancee. Il veut ce mode pour Sabito, y compris les tests ici, et une connexion par hôte, port, nom de base, utilisateur et mot de passe, pas uniquement par URL. L'architecture fournie exige une base de test isolée dans le Preview et interdit de réutiliser les identifiants de production pour les tests.

**Why:** L'utilisateur a confirmé le type de base et demandé explicitement de changer le mode PostgreSQL pour MySQL/MariaDB avec des paramètres séparés.

**How to apply:** Utiliser une base MySQL/MariaDB locale isolée pour le Preview, et la base Cybrancee pour la production seulement. Conserver l'ancienne base sans suppression ni transfert automatique ; les identifiants créés dans l'ancien Preview ne sont pas automatiquement présents dans la nouvelle base. Expliquer que localhost nécessite que Sabito et MariaDB tournent sur le même serveur. Vérifier l'historique et l'impact des migrations de production avant application ; ne pas les appliquer automatiquement au démarrage ni autoriser des changements destructifs sans validation.
