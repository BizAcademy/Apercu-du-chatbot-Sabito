---
name: Sabito product scope
description: Durable product boundaries for the multi-platform Sabito assistant.
---

Sabito is intended to connect to each of the user's platforms through an identifier, token, or key generated from that platform's administrator dashboard. It should understand each platform, answer user questions with current information, and guide users when needed.

**Why:** The user stated this as the core product vision. Static documentation alone cannot satisfy the real-time requirement.

**How to apply:** Keep platform credentials server-side, isolate tenants, combine approved documentation with narrowly authorized live tools, and enforce the authenticated user's permissions for all account-specific data.
