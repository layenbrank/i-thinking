import { Client } from '@/databases/client'
import { outbox } from '@/databases/outbox.service'
import { Singleton } from '@i-thinking/utils'
import {
  concatMap,
  defer,
  map,
  of,
  switchMap,
  tap,
  type Observable
} from 'rxjs'
import { v4 as UUID } from 'uuid'

export interface MarkdownSchema {
  id: string
  title: string
  fragment: string
  createdAt: number
  updatedAt: number
}

export interface MarkdownInsert {
  title: string
  fragment: string
}

export interface MarkdownUpdate {
  id: string
  title?: string
  fragment?: string
}

@Singleton()
export class MarkdownRepo extends Client {
  static ensured = false

  constructor() {
    super()
    setTimeout(() => {
      console.log('[MarkdownRepo] Ensuring markdowns table exists...', this)
    }, 3000)
  }

  toEnsure$(): Observable<void> {
    return defer(() => {
      if (MarkdownRepo.ensured) return of(void 0)

      return this.execute$(
        'CREATE TABLE IF NOT EXISTS markdowns (id TEXT PRIMARY KEY, title TEXT, fragment TEXT, createdAt INTEGER, updatedAt INTEGER)'
      ).pipe(
        tap(function () {
          MarkdownRepo.ensured = true
        }),
        map(function () {
          return
        })
      )
    })
  }

  toRead$(id: string): Observable<MarkdownSchema[]> {
    return this.toEnsure$().pipe(
      switchMap(() =>
        this.query$<MarkdownSchema>('SELECT * FROM markdowns WHERE id = $1', [
          id
        ])
      )
    )
  }

  toInsert$(value: MarkdownInsert): Observable<{ id: string }> {
    const id = UUID()
    const timestamp = Date.now()

    return this.toEnsure$().pipe(
      switchMap(() =>
        this.execute$(
          'INSERT INTO markdowns (id, title, fragment, createdAt, updatedAt) VALUES ($1, $2, $3, $4, $5)',
          [id, value.title, value.fragment, timestamp, timestamp]
        )
      ),
      concatMap(() =>
        outbox.append$({
          entity: 'markdown',
          op: 'upsert',
          entityId: id,
          payload: {
            id,
            title: value.title,
            fragment: value.fragment,
            createdAt: timestamp,
            updatedAt: timestamp
          }
        })
      ),
      map(() => ({ id }))
    )
  }

  toUpdate$(value: MarkdownUpdate): Observable<void> {
    const timestamp = Date.now()

    return this.toEnsure$().pipe(
      switchMap(() => {
        const setParts: string[] = []
        const params: unknown[] = []
        let index = 1

        if (value.title !== undefined) {
          setParts.push(`title = $${index++}`)
          params.push(value.title)
        }

        if (value.fragment !== undefined) {
          setParts.push(`fragment = $${index++}`)
          params.push(value.fragment)
        }

        setParts.push(`updatedAt = $${index++}`)
        params.push(timestamp)

        params.push(value.id)
        const whereIndex = index

        return this.execute$(
          `UPDATE markdowns SET ${setParts.join(', ')} WHERE id = $${whereIndex}`,
          params
        )
      }),
      concatMap(() =>
        outbox.append$({
          entity: 'markdown',
          op: 'upsert',
          entityId: value.id,
          payload: {
            ...value,
            updatedAt: timestamp
          }
        })
      ),
      map(function () {
        return
      })
    )
  }

  toRemove$(id: string): Observable<void> {
    return this.toEnsure$().pipe(
      switchMap(() =>
        this.execute$('DELETE FROM markdowns WHERE id = $1', [id])
      ),
      concatMap(() =>
        outbox.append$({
          entity: 'markdown',
          op: 'delete',
          entityId: id,
          payload: { id }
        })
      ),
      map(function () {
        return
      })
    )
  }

  toQuery$(keyword: string): Observable<MarkdownSchema[]> {
    return this.toEnsure$().pipe(
      switchMap(() =>
        this.query$<MarkdownSchema>(
          'SELECT * FROM markdowns WHERE title LIKE $1 ORDER BY updatedAt DESC',
          [`%${keyword}%`]
        )
      )
    )
  }
}

export const markdownRepo = new MarkdownRepo()
