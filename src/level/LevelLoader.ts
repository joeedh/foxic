import { TileMap } from './TileMap'
import { type LevelDefinition } from './LevelData'
import { SensorSystem } from '../physics/SensorSystem'
import { SonicPhysics } from '../physics/SonicPhysics'
import { Player } from '../entities/Player'
import { Ring } from '../entities/Ring'
import { EnemyCrab } from '../entities/EnemyCrab'
import { EnemyBee } from '../entities/EnemyBee'
import { Spring } from '../entities/Spring'
import { Camera } from '../camera'
import { TILE_SIZE } from '../constants'
import type { WebGLRenderer } from '../rendering/WebGLRenderer'

export interface CollisionResult {
  scorePoints?: number
  collectRings?: number
  hurtPlayer?: boolean
  setYSpeed?: number
  scatterRings?: boolean
  detachFromGround?: boolean
}

export interface GameEntity {
  x: number
  y: number
  width: number
  height: number
  active: boolean
  update(dt: number): void
  render(renderer: WebGLRenderer): void
  onPlayerCollision(
    playerIsRolling: boolean,
    playerYSpeed: number,
    playerBottomY: number,
  ): CollisionResult | null
}

export interface LoadedLevel {
  tileMap: TileMap
  player: Player
  entities: GameEntity[]
  camera: Camera
  sonicPhysics: SonicPhysics
}

export function loadLevel(def: LevelDefinition): LoadedLevel {
  const tilesetMap: Record<string, string> = {
    'Green Hill': 'greenhill',
    'Mechanical Plant': 'industrial',
  }
  const tileset = tilesetMap[def.name] ?? 'greenhill'
  const tileMap = new TileMap(def.tileGrid, tileset)
  const sensors = new SensorSystem(tileMap)
  const sonicPhysics = new SonicPhysics(sensors)
  const camera = new Camera(def.width * TILE_SIZE, def.height * TILE_SIZE)

  const player = new Player(def.playerStart.x, def.playerStart.y, sonicPhysics)

  const entities: GameEntity[] = []

  for (const spawn of def.entities) {
    let entity: GameEntity | null = null

    switch (spawn.type) {
      case 'ring':
        entity = new Ring(spawn.x, spawn.y)
        break
      case 'crab':
        entity = new EnemyCrab(spawn.x, spawn.y, tileMap)
        break
      case 'bee':
        entity = new EnemyBee(spawn.x, spawn.y)
        break
      case 'spring': {
        const force = (spawn.properties?.force as number) ?? -10
        entity = new Spring(spawn.x, spawn.y, force)
        break
      }
    }

    if (entity) {
      entities.push(entity)
    }
  }

  return { tileMap, player, entities, camera, sonicPhysics }
}
