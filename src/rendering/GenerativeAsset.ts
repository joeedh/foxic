/** We store the prompt history for image assets generated using AI */

import { GenerativeAssets } from "./GenerativeAssetData"

export type AssetPurpose = "tilemap" | "character" | "background"

export interface GenerativeAsset {
  name: string
  purpose: AssetPurpose
  prompt: string
  // does not includes the current this.prompt
  promptHistory: string[]
  outputFile: string
  width: number
  height: number
}

export function getAsset(name: string): GenerativeAsset {
  const asset = GenerativeAssets.find((asset) => asset.name === name)
  if (asset === undefined) {
    throw new Error("could not find asset " + name)
  }
  return asset
}

export function getAssetFromPath(path: string): GenerativeAsset {
  const asset = GenerativeAssets.find((asset) => asset.outputFile === path)
  if (asset === undefined) {
    throw new Error("could not find asset " + name)
  }
  return asset
}
export function getAssetPath(name: string): string {
  return getAsset(name).outputFile
}
