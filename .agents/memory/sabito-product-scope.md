---
name: Sabito product scope
description: Durable product boundaries for the multi-platform Sabito assistant.
---

Sabito is intended to connect to each of the user's platforms through an identifier, token, or key generated from that platform's administrator dashboard. It should understand each platform, answer user questions with current information, and guide users when needed.

**Why:** The user stated this as the core product vision. Static documentation alone cannot satisfy the real-time requirement.

**How to apply:** Keep platform credentials server-side, isolate tenants, combine approved documentation with narrowly authorized live tools, and enforce the authenticated user's permissions for all account-specific data.

Validated answer corrections must become platform-specific references for future responses, not merely edits to the displayed conversation.

**Why:** The user explicitly chose reusable knowledge when asked how corrections should be used.

**How to apply:** Preserve approved corrections, consult them for subsequent questions and reformulations, and allow the administrator to revise or remove them.

Until platform administrator authentication exists, corrections in the evaluation Preview remain isolated to the tester's browser workspace rather than becoming shared BCA knowledge.

**Why:** An anonymous preview must not allow any visitor to overwrite the platform's trusted knowledge. The evaluation workspace is not a production administration surface.

**How to apply:** Promote evaluation corrections into shared platform knowledge only behind verified platform administrator permissions; do not publish unauthenticated correction management.

The user does not want Sabito's answers to consume Replit credits.

**Why:** The user explicitly rejected credit-funded answer generation and asked for the platform keys needed for real-time BCA access.

**How to apply:** Keep Replit-billed inference disabled unless the user explicitly changes this instruction. Prefer the original knowledge-based engine or a separately agreed provider configuration; distinguish inference costs from platform-data access.
