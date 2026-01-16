// Compatibility shim: the project migrated to a decorator-free SQLite wrapper.
// Keep this file to avoid breaking existing imports.

// export { storage } from './sqlite.ts'
// export type { QueryResult } from './sqlite.ts'

// for sqlite & postgres
// // INSERT example
// const result = await db.execute(
//    "INSERT into todos (id, title, status) VALUES ($1, $2, $3)",
//    [ todos.id, todos.title, todos.status ]
// );
// // UPDATE example
// const result = await db.execute(
//    "UPDATE todos SET title = $1, completed = $2 WHERE id = $3",
//    [ todos.title, todos.status, todos.id ]
// );

// // for mysql
// // INSERT example
// const result = await db.execute(
//    "INSERT into todos (id, title, status) VALUES (?, ?, ?)",
//    [ todos.id, todos.title, todos.status ]
// );
// // UPDATE example
// const result = await db.execute(
//    "UPDATE todos SET title = ?, completed = ? WHERE id = ?",
//    [ todos.title, todos.status, todos.id ]
// );
// database.execute(query)
