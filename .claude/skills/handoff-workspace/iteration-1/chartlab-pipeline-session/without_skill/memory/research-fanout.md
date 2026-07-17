# Technique: parallel research fan-out for external API/doc research

Proven 2026-07-17 on the Chartly API (chartlab project): full API map in 11 minutes
vs. an expected afternoon of serial doc-reading. User mandated this as the default
research approach ("let's do research this way from now on").

Recipe:
1. Split the unknown into independent questions (e.g. endpoints / auth+limits / pagination).
2. Launch one research subagent per question, all in a single message so they run concurrently.
3. Synthesize the reports into one doc: `docs/research/<topic>-map.md` in the project repo.

Works because doc research decomposes into independent questions — the serial habit,
not the reading itself, is the bottleneck.
