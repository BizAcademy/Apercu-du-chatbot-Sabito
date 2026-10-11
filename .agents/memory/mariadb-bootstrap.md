---
name: MariaDB bootstrap in this environment
description: Distinguish shell-tool sandbox failures from actual MariaDB startup failures.
---

A MariaDB initialization failure mentioning an invalid `/proc/.../fd/-1` in a shell-tool invocation is not evidence that MariaDB cannot run in this workspace.

**Why:** The standard initializer failed in the shell execution sandbox but completed successfully when run by the managed development workflow, with normal authenticated accounts.

**How to apply:** Prefer normal initialization in the managed workflow when this sandbox error occurs. Do not weaken database authentication or introduce `--skip-grant-tables` to compensate for a tool-side execution restriction.
