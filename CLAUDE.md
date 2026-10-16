@AGENTS.md

# Claude-specific notes

The shared rules above (imported from `AGENTS.md`) apply in full.

- **Plan first for anything touching more than 2 files.** Write a short plan, wait for the human's OK, then implement.
- Work in small verifiable steps: change, run, check, continue.
- Use the repo's real commands (see `README.md` and `package.json` scripts). Don't invent commands.
- Read `docs/` before scanning the codebase.
- When given a task, expect a requirement ID (e.g. "implement R4 / E6"). Open that section of `docs/REQUIREMENTS.md` and match it exactly.
- Keep replies short: what changed, how you verified it, what's left.
- If the human asks for something that conflicts with `docs/REQUIREMENTS.md`, point out the conflict in one line, follow the human, and update the doc.
- Keep this file short. Shared rules belong in `AGENTS.md` so Claude and Codex never drift apart.