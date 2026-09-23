import { describe, expect, it } from 'vitest'
import { createMemoryRouter } from 'react-router-dom'

import { findTransitionKey } from './transition-key'
import directiveRoutes from './routes/directive'

/**
 * 走真实路由表：`createMemoryRouter` 与 `createHashRouter` 一样会给每条路由按它在树上的位置编 id，
 * 于是「转场 key 取最深那条 match 的 id」这条规则可以在这里验，不必起窗口。
 *
 * 用例**不能**放进 `routes/`：那里整个目录会被 `import.meta.glob` 打进生产包（见 `index.ts`）。
 */
const router = createMemoryRouter(directiveRoutes, { initialEntries: ['/directive'] })

async function keyOf(path: string): Promise<string> {
  await router.navigate(path)
  const matches = router.state.matches.map(function (match) {
    return { id: match.route.id }
  })
  return findTransitionKey(matches)
}

describe('directive routes', function () {
  it('sends the bare path to the card wall and a name to the workspace', async function () {
    expect(await keyOf('/directive')).not.toBe(await keyOf('/directive/build-intern'))
  })

  it('keeps one key while only the directive name changes', async function () {
    // 同一条路由的参数变化不该重挂编排台（编辑器、运行台、分栏状态都在那棵树上）
    expect(await keyOf('/directive/build-intern')).toBe(await keyOf('/directive/other'))
  })
})
