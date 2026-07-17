# Parallel research subagents (user-endorsed default)

When mapping an unfamiliar API, library, or doc set, do not read docs
end-to-end. Split the question into independent facets (e.g. endpoints /
auth & rate limits / pagination), spawn one research subagent per facet in
parallel, then synthesize into a doc under `docs/research/`.

Evidence: 2026-07-17, chartlab session — full Chartly API map
(`docs/research/api-map.md`) in 11 minutes. User: "let's do research this
way from now on." Applies across projects, not just chartlab.
