# Arcana Codex Context and Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact Codex instruction entry point and replace Arcana's stale architecture document with a current, code-backed reference.

**Architecture:** `AGENTS.md` is the tiny automatic discovery layer, `system.md` is the concise always-loaded operating guide, and `ARCHITECTURE.md` is the detailed source of truth loaded only when needed. Runtime code is not changed.

**Tech Stack:** Markdown documentation, static HTML/CSS/global JavaScript repository, Node/npm verification, PowerShell regression tests.

---

## File Structure

- Create `AGENTS.md`: automatic Codex entry point only.
- Create `system.md`: compact project operating rules and context-routing guide.
- Replace `ARCHITECTURE.md`: current detailed architecture reference.

### Task 1: Add the Codex discovery and operating layers

- [x] Confirm `AGENTS.md` and `system.md` do not already exist.
- [x] Create the tiny discovery file.
- [x] Create the compact operating guide.
- [x] Verify the discovery link, context routing, and line-count budget.

### Task 2: Rewrite the detailed architecture reference

- [x] Replace stale architecture content using current source, tests, and approved design specs.
- [x] Verify coverage of the Worker, Ritual design, reading readiness, persistence, and current tests.
- [x] Confirm the three documents retain distinct responsibilities.

### Task 3: Verify and commit

- [x] Run `npm test`.
- [x] Run stale-text searches and `git diff --check`.
- [x] Review the final diff for documentation-only scope.
- [x] Commit the implementation.
