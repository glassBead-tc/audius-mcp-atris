# Iteration 2 — decontaminated baseline
Changes vs iteration 1:
- Fixtures rebuilt OUTSIDE the project (scratchpad/handoff-it2) so run repos carry no .claude/skills.
- Baseline agents given a hard constraint: no Skill tool, no reading .claude/skills — true no-skill baseline.
- Session transcripts DE-LABELED: no "POSITIVE/NEGATIVE SURPRISE" markers, no expectation-gap framing; agents must infer the surprises. This is the discriminating test iteration 1 lacked.
- Fixture bugs fixed deliberately: fooify config fix is now a real uncommitted logic change (committed code has the bug), src/server.js exists in the repo; hint comments stripped from client.js and collect.sh. chartlab's missing to_csv.sh is retained ON PURPOSE as a ground-truth-verification trap.
Run outputs live in scratchpad; grading/timing/benchmark recorded here.
