declare namespace Upload {
  namespace UploadedChunk {
    export interface Item {
      index: number
      hash: string
    }
  }

  namespace Prepare {
    export interface Params {
      name: string
      size: number
      hash?: string
      mime: string
      chunk: number
    }

    export interface Response {
      id: string
      exists: boolean
      chunks: number[]
      uploaded: UploadedChunk.Item[]
      url: string
    }
  }

  namespace Hash {
    export interface Params {
      id: string
      hash: string
    }

    export interface Response {
      id: string
      exists: boolean
      chunks: number[]
      uploaded: UploadedChunk.Item[]
    }
  }

  namespace Chunk {
    export interface Params {
      id: string
      index: number
      hash: string
      data?: Buffer
    }

    export interface Response {
      success: boolean
      index: number
      reused: boolean
      message: string
    }
  }

  namespace Finalize {
    export interface Params {
      id: string
    }

    export interface Response {
      success: boolean
      url: string
      id: string
    }
  }

  namespace Progress {
    export interface Response {
      id: string
      progress: number
      chunks: number[]
      uploaded: UploadedChunk.Item[]
      total: number
      status: string
    }
  }

  namespace Files {
    export interface Asset {
      id: string
      name: string
      size: number
      mime: string
      hash: string
      status: string
      createdAt: number
      url: string
    }

    export interface Response {
      items: Asset[]
      count: number
      page: number
      size: number
      total: number
      next: boolean
      prev: boolean
    }
  }
}
