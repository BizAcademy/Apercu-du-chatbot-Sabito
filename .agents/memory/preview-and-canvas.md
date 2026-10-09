---
name: Preview and Canvas
description: Distinguish the default Preview entry from isolated Canvas component previews.
---

A successfully rendered Canvas component does not guarantee that the default Preview page is accessible. Focusing or presenting a Canvas frame cannot repair a missing default page.

**Why:** Repeated attempts to focus a working frame did not resolve the user's preview problem: the isolated component loaded, but the default Preview entry returned 404.

**How to apply:** When a user says Preview will not open, check the default page separately from the selected component before attempting another Canvas focus.

The user explicitly wants the Sabito chat accessible in Preview in Build, not only in Design.

**Why:** The user repeated this requirement after Canvas presentation and routing adjustments did not provide the requested Build experience.

**How to apply:** Present the web application for chat previews; preserve Canvas as a design reference, not the sole delivery surface.
