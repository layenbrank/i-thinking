# Findings & Decisions

## Requirements
- Create project skill `naming-conventions` for Tauri IPC/Command/Service/Entity naming
- Content must be portable: abstract names only (`resource`, `feature`, `namespace`)
- No real repo paths, business module names, or "open file X" guidance
- Include SKILL.md, ipc-patterns.md, examples.md
- Light eval with with/without skill comparison + viewer

## Research Findings
- Prompt fully specifies the seven rule sections to embed in SKILL.md
- Prior repo naming refactor already uses `namespace:action` + `{namespace}_{action}` + `to*` + `*P::One|Many` (internal validation only; not cited in skill)
- session-catchup.py is not present under this project's planning-with-files skill
- Benchmark iteration-1: with_skill 100% vs without_skill 70% (delta +0.30)
- Eval-1 (fix bad invokes) is non-discriminating: prompt itself encodes the target conventions, so baseline also scores 100%
- Eval-0/2 discriminate well: baseline invents dual IPC one/many, omits `resource_` prefix and `to*`

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| name: naming-conventions | User request |
| Keep Tauri-focused description | Triggers still match IPC/command work |
| Progressive disclosure via two reference files | Keep SKILL.md lean |
| Post-eval: forbid dual IPC insert-one/many | Close gap exposed by baseline |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| No session-catchup.py in project skill | Log and continue |
| Windows GBK when reading UTF-8 eval JSON/md | PYTHONUTF8=1 |

## Resources
- Skill: `.cursor/skills/naming-conventions/`
- Viewer: `naming-conventions-workspace/iteration-1/review.html`
- Benchmark: `naming-conventions-workspace/iteration-1/benchmark.md`

## Visual/Browser Findings
- Static review.html opened for human Outputs/Benchmark tabs
