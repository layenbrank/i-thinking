import { PublisherGithub } from '@electron-forge/publisher-github'
import { PublisherS3 } from '@electron-forge/publisher-s3'
import type { ForgeConfig } from '@electron-forge/shared-types'

import {
  GITHUB_OWNER,
  GITHUB_REPO,
  PUBLISH_GITHUB,
  PUBLISH_S3,
  S3_BUCKET,
  S3_FOLDER,
  S3_PUBLIC,
  S3_REGION
} from './env'

/**
 * 发布目标：默认不启用，避免无凭证时 `forge publish` 失败。
 * - GitHub Releases：STUDIO_PUBLISH_GITHUB=1 + GITHUB_TOKEN
 * - S3：STUDIO_PUBLISH_S3=1 + STUDIO_S3_BUCKET（及 AWS 凭证）
 */
function buildPublishers(): NonNullable<ForgeConfig['publishers']> {
  const publishers: NonNullable<ForgeConfig['publishers']> = []

  if (PUBLISH_GITHUB) {
    publishers.push(
      new PublisherGithub({
        repository: {
          owner: GITHUB_OWNER,
          name: GITHUB_REPO
        },
        prerelease: false,
        draft: true,
        generateReleaseNotes: true
      })
    )
  }

  if (PUBLISH_S3 && S3_BUCKET) {
    publishers.push(
      new PublisherS3({
        bucket: S3_BUCKET,
        region: S3_REGION,
        folder: S3_FOLDER,
        public: S3_PUBLIC
      })
    )
  }

  return publishers
}

export { buildPublishers }
