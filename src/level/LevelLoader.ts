import { Container } from "pixi.js"
import { TileMap } from "./TileMap"
import { type LevelDefinition } from "./LevelData"
import { SensorSystem } from "../physics/SensorSystem"
import { SonicPhysics } from "../physics/SonicPhysics"
import { Player } from "../entities/Player"
import { Ring } from "../entities/Ring"
import { EnemyCrab } from "../entities/EnemyCrab"
import { EnemyBee } from "../entities/EnemyBee"
import { Spring } from "../entities/Spring"
import { Camera } from "../camera"
import { TILE_SIZE } from "../constants"

export interface CollisionResult {
  /** Player scored points */
  scorePoints?: number
  /** Player collected rings */
  collectRings?: number
  /** Player should be hurt (knockback from entity position) */
  hurtPlayer?: boolean
  /** Set player's ySpeed (e.g. spring bounce, enemy stomp bounce) */
  setYSpeed?: number
  /** Scatter the player's rings */
  scatterRings?: boolean
  /** Player should leave the ground */
  detachFromGround?: boolean
}

export interface GameEntity {
  x: number
  y: number
  width: number
  height: number
  active: boolean
  update(dt: number): void
  render(): void
  addToContainer(container: Container): void
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
  container: Container
}

export function loadLevel(def: LevelDefinition): LoadedLevel {
  // Map level name to tileset
  const tilesetMap: Record<string, string> = {
    "Green Hill": "greenhill",
    "Mechanical Plant": "industrial",
  }
  const tileset = tilesetMap[def.name] ?? "greenhill"
  const tileMap = new TileMap(def.tileGrid, tileset)
  const sensors = new SensorSystem(tileMap)
  const sonicPhysics = new SonicPhysics(sensors)
  const camera = new Camera(def.width * TILE_SIZE, def.height * TILE_SIZE)

  const player = new Player(def.playerStart.x, def.playerStart.y, sonicPhysics)

  const container = new Container()
  container.addChild(tileMap.container)

  const entities: GameEntity[] = []

  for (const spawn of def.entities) {
    let entity: GameEntity | null = null

    switch (spawn.type) {
      case "ring":
        entity = new Ring(spawn.x, spawn.y)
        break
      case "crab":
        entity = new EnemyCrab(spawn.x, spawn.y, tileMap)
        break
      case "bee":
        entity = new EnemyBee(spawn.x, spawn.y)
        break
      case "spring": {
        const force = (spawn.properties?.force as number) ?? -10
        entity = new Spring(spawn.x, spawn.y, force)
        break
      }
    }

    if (entity) {
      entities.push(entity)
      entity.addToContainer(container)
    }
  }

  player.addToContainer(container)

  return { tileMap, player, entities, camera, sonicPhysics, container }
}
