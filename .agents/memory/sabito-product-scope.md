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

L'utilisateur veut publier Sabito sur « cybrancy », et non sur Replit.

**Why:** L'utilisateur a explicitement choisi cet hébergement après la proposition de publication sur Replit.

**How to apply:** Préparer un déploiement externe ; confirmer le fournisseur exact et l'offre avant d'adapter le projet. Ne pas supposer que « cybrancy » désigne Cybrancee sans confirmation.
