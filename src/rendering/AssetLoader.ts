import type { WebGLRenderer } from './WebGLRenderer'
import { Texture } from './WebGL/texture'
import { SpriteSheet, type Frame } from './SpriteSheet'
import { getAssetPath } from './GenerativeAsset'

let playerSheet: SpriteSheet
let enemiesSheet: SpriteSheet
let itemsSheet: SpriteSheet
let tileSheets: Record<string, SpriteSheet> = {}
let circleTex: Texture

export const backgroundTextures: Record<string, Texture> = {}

function createCircleTexture(renderer: WebGLRenderer): Texture {
  const size = 16
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  return renderer.createTextureFromCanvas(canvas)
}

export async function loadAllAssets(renderer: WebGLRenderer) {
  // Load sprite textures and bake chroma key (magenta -> alpha)
  const [playerTexRaw, enemiesTexRaw, itemsTexRaw] = await Promise.all([
    renderer.loadTexture(getAssetPath('player_spritesheet')),
    renderer.loadTexture(getAssetPath('enemies_spritesheet')),
    renderer.loadTexture(getAssetPath('items_spritesheet')),
  ])

  const playerTex = renderer.bakeChromaKey(playerTexRaw)
  const enemiesTex = renderer.bakeChromaKey(enemiesTexRaw)
  const itemsTex = renderer.bakeChromaKey(itemsTexRaw)

  playerSheet = new SpriteSheet(playerTex, {
    cols: 4,
    rows: 2,
    frameNames: [
      'idle',
      'run1',
      'run2',
      'run3',
      'jump',
      'crouch',
      'skid',
      'push',
    ],
    animations: {
      idle: ['idle'],
      run: ['run1', 'run2', 'run3', 'run2'],
      jump: ['jump'],
      crouch: ['crouch'],
      skid: ['skid'],
      push: ['push'],
    },
  })

  enemiesSheet = new SpriteSheet(enemiesTex, {
    cols: 3,
    rows: 2,
    frameNames: ['crab1', 'crab2', 'crab3', 'bee1', 'bee2', 'bee3'],
    animations: {
      crab: ['crab1', 'crab2', 'crab3'],
      bee: ['bee1', 'bee2', 'bee3'],
    },
  })

  itemsSheet = new SpriteSheet(itemsTex, {
    cols: 4,
    rows: 2,
    frameNames: [
      'ring1',
      'ring2',
      'ring3',
      'ring4',
      'spring_yellow_compressed',
      'spring_yellow_extended',
      'spring_red_compressed',
      'spring_red_extended',
    ],
    animations: {
      ring: ['ring1', 'ring2', 'ring3', 'ring4'],
    },
  })

  // Load backgrounds (no chroma key needed)
  const [bgGreenhill, bgIndustrial] = await Promise.all([
    renderer.loadTexture(getAssetPath('bg_greenhill')),
    renderer.loadTexture(getAssetPath('bg_industrial')),
  ])
  backgroundTextures.greenhill = bgGreenhill
  backgroundTextures.industrial = bgIndustrial

  // Load tilesets with chroma key (magenta -> alpha for slope/platform transparency)
  const tileFrameNames = [
    // Row 0
    'tile_1',
    'tile_2',
    'tile_3',
    'tile_4',
    'tile_9',
    // Row 1
    'tile_5',
    'tile_6',
    'tile_8',
    'tile_7',
    'tile_empty',
    // Row 2 (variants)
    'tile_1_v1',
    'tile_1_v2',
    'tile_1_v3',
    'tile_2_v1',
    'tile_2_v2',
  ]

  const [tileGreenhillTexRaw, tileIndustrialTexRaw] = await Promise.all([
    renderer.loadTexture(getAssetPath('tileset_greenhill')),
    renderer.loadTexture(getAssetPath('tileset_industrial')),
  ])

  const tileGreenhillTex = renderer.bakeChromaKey(tileGreenhillTexRaw)
  const tileIndustrialTex = renderer.bakeChromaKey(tileIndustrialTexRaw)

  tileSheets['greenhill'] = new SpriteSheet(tileGreenhillTex, {
    cols: 5,
    rows: 3,
    frameNames: tileFrameNames,
    borderTrim: 40.0,
  })

  tileSheets['industrial'] = new SpriteSheet(tileIndustrialTex, {
    cols: 5,
    rows: 3,
    frameNames: tileFrameNames,
    borderTrim: 40.0,
  })

  // Create circle texture for scattered rings
  circleTex = createCircleTexture(renderer)
}

// --- Accessor functions ---

export function getPlayerFrame(name: string): Frame {
  return playerSheet.frames[name]
}

export function getPlayerAnimation(name: string): Frame[] {
  return playerSheet.animations[name]
}

export function getEnemyFrame(type: 'crab' | 'bee', frameIndex: number): Frame {
  const anim = enemiesSheet.animations[type]
  return anim[frameIndex % anim.length]
}

export function getEnemyAnimation(type: 'crab' | 'bee'): Frame[] {
  return enemiesSheet.animations[type]
}

export function getRingFrame(frameIndex: number): Frame {
  const anim = itemsSheet.animations.ring
  return anim[frameIndex % anim.length]
}

export function getRingAnimation(): Frame[] {
  return itemsSheet.animations.ring
}

export function getSpringFrame(
  color: 'yellow' | 'red',
  compressed: boolean,
): Frame {
  const state = compressed ? 'compressed' : 'extended'
  return itemsSheet.frames[`spring_${color}_${state}`]
}

const tileVariants: Record<number, string[]> = {
  1: ['tile_1', 'tile_1_v1', 'tile_1_v2', 'tile_1_v3'],
  2: ['tile_2', 'tile_2_v1', 'tile_2_v2'],
}

export function getTileFrame(
  tileId: number,
  tileset: string,
  variantIndex?: number,
): Frame | null {
  const sheet = tileSheets[tileset]
  if (!sheet) return null

  if (variantIndex !== undefined) {
    const variants = tileVariants[tileId]
    if (variants) {
      const name = variants[variantIndex % variants.length]
      return sheet.frames[name] ?? null
    }
  }
  return sheet.frames[`tile_${tileId}`] ?? null
}

export function getTileVariantCount(tileId: number): number {
  return tileVariants[tileId]?.length ?? 0
}

export function hasTileset(name: string): boolean {
  return name in tileSheets
}

export function getCircleTexture(): Texture {
  return circleTex
}
