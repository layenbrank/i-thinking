import Database from '@tauri-apps/plugin-sql'

// Singleton DB connection for morph
let _db: Database | null = null

async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load('sqlite:morph.db')
  }
  return _db
}

// ─── Schema Init ─────────────────────────────────────────────────────────────

export async function initMorphDB(): Promise<void> {
  const db = await getDb()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pdf_files (
      id          TEXT PRIMARY KEY,
      path        TEXT NOT NULL UNIQUE,
      name        TEXT NOT NULL,
      page_count  INTEGER NOT NULL DEFAULT 0,
      last_opened INTEGER NOT NULL,
      metadata    TEXT NOT NULL DEFAULT '{}'
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS pdf_annotations (
      id          TEXT PRIMARY KEY,
      file_path   TEXT NOT NULL,
      page_index  INTEGER NOT NULL,
      type        TEXT NOT NULL,
      rect        TEXT NOT NULL,
      data        TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    )
  `)

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_annotations_file ON pdf_annotations (file_path)`)
}

// ─── File Record ─────────────────────────────────────────────────────────────

export async function upsertFile(meta: Morph.PdfMeta): Promise<void> {
  const db = await getDb()
  const id = btoa(encodeURIComponent(meta.path)).replace(/[+/=]/g, '_')
  const name = meta.path.split(/[\\/]/).pop() ?? meta.path

  await db.execute(
    `INSERT INTO pdf_files (id, path, name, page_count, last_opened, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT(path) DO UPDATE SET
       page_count  = excluded.page_count,
       last_opened = excluded.last_opened,
       metadata    = excluded.metadata`,
    [
      id,
      meta.path,
      name,
      meta.page_count,
      Date.now(),
      JSON.stringify({ title: meta.title, author: meta.author })
    ]
  )
}

export async function queryRecentFiles(
  limit = 20
): Promise<{ id: string; path: string; name: string; page_count: number; last_opened: number }[]> {
  const db = await getDb()
  return db.select(
    `SELECT id, path, name, page_count, last_opened
     FROM pdf_files
     ORDER BY last_opened DESC
     LIMIT $1`,
    [limit]
  )
}

// ─── Annotations ─────────────────────────────────────────────────────────────

export async function queryAnnotations(filePath: string): Promise<Morph.Annotation[]> {
  const db = await getDb()

  const rows: {
    id: string
    file_path: string
    page_index: number
    type: string
    rect: string
    data: string
    created_at: number
    updated_at: number
  }[] = await db.select(
    `SELECT * FROM pdf_annotations WHERE file_path = $1 ORDER BY page_index, created_at`,
    [filePath]
  )

  return rows.map((row) => ({
    id: row.id,
    filePath: row.file_path,
    pageIndex: row.page_index,
    type: row.type as Morph.AnnotationType,
    rect: JSON.parse(row.rect) as Morph.NormalizedRect,
    data: JSON.parse(row.data),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export async function insertAnnotation(annotation: Morph.Annotation): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT INTO pdf_annotations
       (id, file_path, page_index, type, rect, data, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      annotation.id,
      annotation.filePath,
      annotation.pageIndex,
      annotation.type,
      JSON.stringify(annotation.rect),
      JSON.stringify(annotation.data),
      annotation.createdAt,
      annotation.updatedAt
    ]
  )
}

export async function updateAnnotation(
  id: string,
  changes: Partial<Pick<Morph.Annotation, 'rect' | 'data'>>
): Promise<void> {
  const db = await getDb()
  const now = Date.now()

  const sets: string[] = ['updated_at = $1']
  const params: unknown[] = [now]

  if (changes.rect !== undefined) {
    params.push(JSON.stringify(changes.rect))
    sets.push(`rect = $${params.length}`)
  }
  if (changes.data !== undefined) {
    params.push(JSON.stringify(changes.data))
    sets.push(`data = $${params.length}`)
  }

  params.push(id)
  await db.execute(
    `UPDATE pdf_annotations SET ${sets.join(', ')} WHERE id = $${params.length}`,
    params
  )
}

export async function removeAnnotation(id: string): Promise<void> {
  const db = await getDb()
  await db.execute(`DELETE FROM pdf_annotations WHERE id = $1`, [id])
}

export async function countAnnotationsByPage(filePath: string): Promise<Record<number, number>> {
  const db = await getDb()
  const rows: { page_index: number; cnt: number }[] = await db.select(
    `SELECT page_index, COUNT(*) as cnt
     FROM pdf_annotations
     WHERE file_path = $1
     GROUP BY page_index`,
    [filePath]
  )
  return Object.fromEntries(rows.map((r) => [r.page_index, r.cnt]))
}
