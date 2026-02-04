// import { Singleton } from '@i-thinking/utils'
import Database, { type QueryResult } from '@tauri-apps/plugin-sql'
import { defer, from, map, type Observable, shareReplay, switchMap } from 'rxjs'

const DBNAME = 'sqlite:i-thinking.db' as const

// @Singleton()
export class Client {
  static readonly database$ = defer(function () {
    return from(Database.load(DBNAME))
  }).pipe(
    shareReplay({
      bufferSize: 1,
      refCount: false
    })
  )

  db$(): Observable<Database> {
    return Client.database$
  }

  ready$(): Observable<void> {
    return Client.database$.pipe(
      map(function () {
        return
      })
    )
  }

  execute$(sql: string, params: unknown[] = []): Observable<QueryResult> {
    return Client.database$.pipe(
      switchMap(function (db) {
        return from(db.execute(sql, params))
      })
    )
  }

  query$<T = unknown>(sql: string, params: unknown[] = []): Observable<T[]> {
    return Client.database$.pipe(
      switchMap(function (db) {
        return from(db.select<T[]>(sql, params))
      })
    )
  }

  close$(): Observable<boolean> {
    return Client.database$.pipe(
      switchMap(function (db) {
        return from(db.close())
      })
    )
  }
}

export const database = new Client()
export type { QueryResult }
