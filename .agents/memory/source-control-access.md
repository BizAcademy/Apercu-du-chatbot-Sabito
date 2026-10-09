---
name: GitHub repository inspection
description: GitHub CLI authorization can differ from authenticated git access in this environment.
---

An active GitHub connection may authorize git operations while the GitHub CLI still asks for login.

**Why:** Repository inspection succeeded with authenticated git after gh reported that no CLI login was present.

**How to apply:** For read-only repository inspection, try authenticated git access before asking the user for another token. A gh login prompt alone does not establish that organization access is missing.
