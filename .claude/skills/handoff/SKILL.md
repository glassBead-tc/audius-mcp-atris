---
name: handoff
description: End-of-session handoff — write the document a successor Claude needs to resume exactly where this session left off, audit the session for its most surprising positive and negative events, and change the environment so the positive becomes repeatable and the negative becomes structurally unlikely. Use whenever the user invokes /handoff, says they're wrapping up, asks to "write up where we are", wants continuity into a next session, or when context is running out mid-task and work must continue in a fresh session.
---

# Session Handoff

You are writing for your successor: a Claude with your exact capabilities and **zero
memory of this session**. Everything you know that isn't in a file, a commit, or a
memory is about to be destroyed. The test for the document you produce: could you,
reading it cold, resume productive work in under five minutes without re-deriving
anything this session already established?

Three deliverables, in order: the handoff document, a surprise audit, and environment
changes that act on the audit. Don't stop at the document — the audit and the changes
are what make the next session *better* than this one, not just informed.

## Step 1: Gather ground truth before writing

Memory of state is not state. Things you set up hours ago may have died, been
superseded, or drifted. Verify before you write:

- `git status` + `git log --oneline -5` — what's committed vs. floating
- Running processes you started (`ps`, background shells, dev servers, tunnels)
- Scheduled/background machinery you created (cron jobs, workflows, subagents)
- The task list, if one exists
- Any external state you mutated this session (deployed functions, DB schemas,
  published artifacts) — one cheap read each to confirm it's live

Anything you *cannot* verify cheaply, mark as "unverified as of handoff" in the
document rather than asserting it.

## Step 2: Write the handoff document

Location: `.claude/handoffs/<YYYY-MM-DD-HHMM>-<slug>.md` in the project repo
(create the directory if needed; if there is no project, use the memory directory).
Keep prior handoffs — they are cheap and form a useful session-by-session history.

Structure — every section earns its place by answering a question the successor
will actually have:

```markdown
# Handoff: <one-line description of the session>

## TL;DR
<3 sentences max: where things stand, what's next, what's blocking.>

## State of play
- **Done & committed**: <with commit hashes>
- **Done & NOT committed**: <working-tree changes, and why they're uncommitted>
- **In flight**: <started but unfinished, with exact resume point>
- **Blocked**: <what, on what, and the exact check that tells you it's unblocked>

## Ephemeral state — will NOT survive this session
<Background processes and their owners, shells, temp files outside the repo,
in-memory state. For each: what dies, what the successor must restart, and how.
This section exists because the most expensive handoff failures are invisible:
the successor assumes something is running that isn't.>

## Verified facts
<Facts established this session that the successor should NOT re-derive — each
with its evidence and a cheap re-verification command, because facts decay.
Example: "OAP chain halted at block 28272228 — verify:
curl -s .../health_check | jq .data.core_indexer">

## Next actions
<Ordered. Each with a concrete entry point: file:line, command to run, URL.
"Continue Phase 5a" is useless; "spike CoreService.GetStatus: POST JSON to
https://rpc.audius.co/core.v1.CoreService/GetStatus, expect block height" resumes
work in one step.>

## Tripwires
<Things that bit this session or nearly did, that the successor will plausibly
hit again. State the symptom first (what they'll see), then the cause, then the
fix — they'll grep this section when the symptom appears.>

## Artifacts & infrastructure map
<Paths, URLs, project IDs, dashboard links created or relied on this session.>

## Open questions for the user
<Decisions only the user can make, so the successor doesn't re-ask answered ones
— include decisions the user already made this session that constrain the work.>
```

Write it from the session, not from imagination — cite real commands, real hashes,
real errors. Vague handoffs are worse than none because they create false confidence.

## Step 3: The surprise audit

Identify **the most surprising positive thing** and **the most surprising negative
thing** that happened this session. Surprising means the largest gap between what
you expected and what happened — not the largest impact. A test suite passing is
good but not surprising; an undocumented API accepting plain JSON when you expected
gRPC-only is surprising. Surprises are where your model of the world was wrong,
which makes them the highest-leverage places to change the environment.

State each one explicitly in the handoff document under a `## Surprise audit`
section: what you expected, what happened, why the gap existed.

## Step 4: Change the environment

For each surprise, make a real change *now* — proposals die with the session.
"Environment" is writ large: code, config, hooks, permissions, memory, CLAUDE.md,
skills, scripts, scheduled jobs, docs, upstream bug reports.

**For the positive surprise — make it repeatable.** It happened by luck this time;
encode it so it happens by default next time. Ask: what would have to exist for a
future session to get this benefit without the luck? A reusable script, a memory
entry with the technique, a workflow recipe, a new default in config, a section in
CLAUDE.md.

**For the negative surprise — descend this hierarchy and stop at the highest rung
you can actually implement now:**

1. **Structurally impossible** — fix the root cause; add a guard in code; a
   permission deny; a validation that rejects the bad state
2. **Caught automatically** — a test, a health check, a lint rule, a hook that
   detects it before it costs anything
3. **Defaulted away** — change a default so the safe path is the passive path
4. **Documented at the point of use** — a comment/section exactly where the next
   victim will be looking when it happens
5. **Memory note** — last resort, for things only future-you can act on

A memory note for something a hook could prevent is a failure of imagination.
But respect ownership boundaries: change project-level surfaces freely; confirm
with the user before changing user-global config, shared services, or anything
destructive. Record every change you made (with paths) in the handoff document
under the surprise audit section.

## Step 5: Wire up discovery

A handoff nobody finds is a diary. Add or update a single "latest handoff" pointer
line in the auto-memory `MEMORY.md` index (replace the previous pointer rather than
accumulating; the handoffs directory itself is the history). If the project has a
CLAUDE.md convention for session notes, follow it too.

Close by telling the user, briefly: where the document lives, the two surprises,
and every environment change you made.
