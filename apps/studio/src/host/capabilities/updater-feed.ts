const SQUIRREL_FIRST_RUN = '--squirrel-firstrun'

function findFeedUrl(): string | undefined {
  const injected = process.env.STUDIO_UPDATE_FEED_URL?.trim()
  if (injected) return injected.replace(/\/$/, '')
  const updateUrl = process.env.STUDIO_UPDATE_URL?.trim()
  if (updateUrl) return updateUrl.replace(/\/$/, '')
  const base = process.env.STUDIO_S3_UPDATE_BASE?.trim()
  if (!base) return undefined
  return `${base.replace(/\/$/, '')}/win32/x64`
}

function hasSquirrelFirstRun(argv: readonly string[] = process.argv): boolean {
  return argv.includes(SQUIRREL_FIRST_RUN)
}

export { SQUIRREL_FIRST_RUN, findFeedUrl, hasSquirrelFirstRun }
