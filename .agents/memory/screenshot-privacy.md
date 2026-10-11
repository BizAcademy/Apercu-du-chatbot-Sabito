---
name: Troubleshooting screenshot privacy
description: Prevent uploaded Plesk environment screenshots from leaking through source-control publication.
---

Treat troubleshooting screenshots of environment-variable panels as potentially secret-bearing, not ordinary publishable project assets. Before a GitHub push, check whether uploaded screenshots are tracked and whether the destination repository is public.

**Why:** An uploaded Plesk environment screenshot was found in the public deployment repository. Private chat handling does not protect files that are also committed to public source control.

**How to apply:** Request cropped screenshots ending before the custom environment-variable section. Removing a current image or adding an ignore rule does not remove earlier committed copies. Coordinate rotation of exposed credentials and source-history cleanup before public startup; changing repository visibility alone cannot invalidate downloaded credentials. Never record their values in memory or repeat them in chat.
