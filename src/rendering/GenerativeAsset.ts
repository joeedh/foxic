/** We store the prompt history for image assets generated using AI */

import { GenerativeAssets } from './GenerativeAssetData'

export type AssetPurpose = 'tilemap' | 'character' | 'background'

export type PromptParameter =
  | {
      type: 'string'
      name: string
      value: string
    }
  | { type: 'integer'; name: string; value: number }
  | { type: 'float'; name: string; value: number }
  | { type: 'number_array'; name: string; value: number[] }

export interface Prompt {
  prompt: string
  // the prompt seed if one exists
  seed?: number
  // any other relevent prompt properties
  extraParameters?: PromptParameter[]
}

export interface GenerativeAsset {
  name: string
  purpose: AssetPurpose
  prompt: Prompt
  // does not includes the current this.prompt
  promptHistory: Prompt[]
  outputFile: string
  width: number
  height: number
  seed?: number
}

export function getAsset(name: string): GenerativeAsset {
  const asset = GenerativeAssets.find((asset) => asset.name === name)
  if (asset === undefined) {
    throw new Error('could not find asset ' + name)
  }
  return asset
}

export function getAssetFromPath(path: string): GenerativeAsset {
  const asset = GenerativeAssets.find((asset) => asset.outputFile === path)
  if (asset === undefined) {
    throw new Error('could not find asset ' + name)
  }
  return asset
}
export function getAssetPath(name: string): string {
  return getAsset(name).outputFile
}
