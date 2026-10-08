function findPlatformKey(platform = process.platform, arch = process.arch): string {
  return `${platform}-${arch}`
}

function findBinaryName(name: string, platform: string = process.platform): string {
  return platform === 'win32' ? `${name}.exe` : name
}

export { findBinaryName, findPlatformKey }
