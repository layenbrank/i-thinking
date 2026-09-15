import { describe, expect, it } from 'vitest'

import { OUTPUT_FORMATS, ConvertSchema } from './doc'

describe('doc schemas', function () {
  it('accepts allowed convert payloads', function () {
    const parsed = ConvertSchema.parse({
      inputPath: 'C:/tmp/a.md',
      outputPath: 'C:/tmp/a.html',
      format: 'html'
    })
    expect(parsed.format).toBe('html')
  })

  it('rejects unknown formats', function () {
    expect(function () {
      ConvertSchema.parse({
        inputPath: 'a.md',
        outputPath: 'a.out',
        format: 'exe'
      })
    }).toThrow()
  })

  it('lists output formats', function () {
    expect(OUTPUT_FORMATS).toContain('markdown')
    expect(OUTPUT_FORMATS).toContain('docx')
  })
})
