# Task Plan: Create naming-conventions Skill

## Goal
在项目 `.cursor/skills/naming-conventions/` 创建通用 Tauri 四层命名规范 Skill（无真实业务路径），并用轻量 eval + viewer 做首轮验证。

## Current Phase
Phase 3 complete — awaiting optional human feedback in review.html

## Phases

### Phase 0: Planning files
- [x] Create/reset task_plan.md / findings.md / progress.md
- **Status:** complete

### Phase 1: Draft skill
- [x] Write SKILL.md with frontmatter name `naming-conventions`
- [x] Write ipc-patterns.md and examples.md (abstract names only)
- [x] Grep skill for forbidden real module/path references
- **Status:** complete

### Phase 2: Light evals
- [x] Create evals/evals.json (2–3 prompts + assertions)
- [x] Run with_skill / without_skill into naming-conventions-workspace/iteration-1
- [x] Grade, aggregate, launch eval-viewer
- **Status:** complete

### Phase 3: Iterate on feedback
- [x] Self-review grading gaps; apply skill fixes if needed
- [ ] Optional: incorporate user feedback from review.html Submit
- **Status:** complete (self-iteration done; human feedback optional)

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Skill name `naming-conventions` | User override of prompt's `tauri-naming-conventions` |
| Omit disable-model-invocation | Auto-trigger on rename/IPC/review tasks |
| Abstract placeholders only | Skill must stay portable across Tauri projects |
| Light eval first | Plan default; full description loop only after feedback |
| Clarify One\|Many stays in Entity not dual IPC | Baseline eval-0 split insert-one/insert-many |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| session-catchup at ~/.cursor/... missing | 1 | Project skill has no scripts/; continue without |
| aggregate/viewer GBK decode | 1 | Set PYTHONUTF8=1 |
| aggregate relative path wrong | 1 | Use absolute workspace path |
