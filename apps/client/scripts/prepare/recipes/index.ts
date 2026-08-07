import { corexRecipe } from './corex.ts'
import { ffmpegRecipe } from './ffmpeg.ts'
import { pandocRecipe } from './pandoc.ts'
import type { ArtifactRecipe } from './types.ts'

const RECIPES: ArtifactRecipe[] = [corexRecipe, pandocRecipe, ffmpegRecipe]

export { RECIPES, type ArtifactRecipe }
