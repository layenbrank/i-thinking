import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { listSkills, parseFrontmatter } from './workspace-skills'

let root = ''

beforeEach(function () {
  root = mkdtempSync(path.join(tmpdir(), 'ws-skills-'))
})

afterEach(function () {
  rmSync(root, { recursive: true, force: true })
})

describe('parseFrontmatter', function () {
  it('reads name and description', function () {
    const actual = parseFrontmatter(`---
name: demo-skill
description: Does a thing
---
# Body
`)
    expect(actual).toEqual({ name: 'demo-skill', description: 'Does a thing' })
  })

  it('joins folded description lines', function () {
    const actual = parseFrontmatter(`---
name: fold
description: >
  first
  second
---
`)
    expect(actual.name).toBe('fold')
    expect(actual.description).toContain('first')
    expect(actual.description).toContain('second')
  })
})

describe('listSkills', function () {
  it('finds skills under .cursor/skills and dedupes by absolute path', function () {
    const skillDir = path.join(root, '.cursor', 'skills', 'hello')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      `---
name: hello
description: Say hi
---
`
    )

    const actual = listSkills(root)

    expect(actual).toHaveLength(1)
    expect(actual[0]).toMatchObject({
      name: 'hello',
      description: 'Say hi',
      relative: '.cursor/skills/hello/SKILL.md'
    })
  })

  it('scans .qoder/skills and nested app .cursor/skills', function () {
    const qoder = path.join(root, '.qoder', 'skills', 'q')
    mkdirSync(qoder, { recursive: true })
    writeFileSync(path.join(qoder, 'SKILL.md'), '---\nname: qoder-skill\ndescription: Q\n---\n')

    const nested = path.join(root, 'apps', 'client', '.cursor', 'skills', 'nested')
    mkdirSync(nested, { recursive: true })
    writeFileSync(path.join(nested, 'SKILL.md'), '---\nname: nested-skill\ndescription: N\n---\n')

    const names = listSkills(root)
      .map(function (item) {
        return item.name
      })
      .sort()

    expect(names).toEqual(['nested-skill', 'qoder-skill'])
  })

  it('falls back to folder name when frontmatter is missing', function () {
    const skillDir = path.join(root, '.agents', 'skills', 'plain')
    mkdirSync(skillDir, { recursive: true })
    writeFileSync(path.join(skillDir, 'SKILL.md'), '# no frontmatter\n')

    const actual = listSkills(root)
    expect(actual).toHaveLength(1)
    expect(actual[0].name).toBe('plain')
    expect(actual[0].description).toBe('')
  })
})
