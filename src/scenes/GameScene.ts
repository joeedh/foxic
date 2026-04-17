import type { Scene } from './SceneManager'
import { loadLevel, type LoadedLevel } from '../level/LevelLoader'
import type { LevelDefinition } from '../level/LevelData'
import { HUD } from '../rendering/HUD'
import { ParallaxBackground } from '../rendering/ParallaxBackground'
import { pressed, Action } from '../input'
import { PLAYER_WIDTH, TILE_SIZE, SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants'
import { aabbOverlap, playerAABB } from '../physics/CollisionDetection'
import { ScatteredRing } from '../entities/Ring'
import { ParticleSystem } from '../rendering/Particles'
import type { WebGLRenderer } from '../rendering/WebGLRenderer'

export class GameScene implements Scene {
  private level!: LoadedLevel
  private hud: HUD
  private background: ParallaxBackground
  private levelDef: LevelDefinition
  private onLevelComplete: () => void
  private scatteredRings: ScatteredRing[] = []
  private particles: ParticleSystem
  private dustTimer = 0

  constructor(
    levelDef: LevelDefinition,
    onLevelComplete: () => void,
    renderer: WebGLRenderer,
  ) {
    this.levelDef = levelDef
    this.onLevelComplete = onLevelComplete
    this.hud = new HUD(renderer)
    this.background = new ParallaxBackground(levelDef.name)
    this.particles = new ParticleSystem()
  }

  enter() {
    this.level = loadLevel(this.levelDef)
    this.scatteredRings = []
    this.hud.reset()
  }

  exit() {}

  update(_dt: number) {
    const { player, entities, camera, tileMap } = this.level

    player.update(_dt)

    for (const entity of entities) {
      if (entity.active) {
        entity.update(_dt)
      }
    }

    for (const ring of this.scatteredRings) {
      if (ring.active) {
        ring.update(_dt)
        const ground = tileMap.getGroundHeight(ring.x, ring.y, 8)
        if (ground !== undefined && ring.y >= ground.y) {
          ring.bounce(ground.y)
        }
      }
    }

    const pBox = playerAABB(player.physics, PLAYER_WIDTH, player.height)

    for (const entity of entities) {
      if (!entity.active) continue

      const eBox = {
        x     : entity.x - entity.width / 2,
        y     : entity.y - entity.height / 2,
        width : entity.width,
        height: entity.height,
      }

      if (!aabbOverlap(pBox, eBox)) continue

      const result = entity.onPlayerCollision(
        player.isRolling,
        player.physics.ySpeed,
        player.physics.y + player.height,
      )
      if (!result) continue

      if (result.scorePoints) {
        player.score += result.scorePoints
        if (result.scorePoints >= 100) {
          this.particles.emitEnemyPoof(entity.x, entity.y)
        }
      }
      if (result.collectRings) {
        player.rings += result.collectRings
        this.particles.emitRingSparkle(entity.x, entity.y)
      }
      if (result.setYSpeed !== undefined) {
        player.physics.ySpeed = result.setYSpeed
      }
      if (result.detachFromGround) {
        player.physics.onGround = false
      }
      if (result.hurtPlayer && player.invincibleTimer <= 0) {
        if (result.scatterRings) {
          this.scatterRings(player.physics.x, player.physics.y, player.rings)
        }
        player.hurt(entity.x)
      }
    }

    if (player.physics.onGround && Math.abs(player.physics.groundSpeed) > 2) {
      this.dustTimer++
      if (this.dustTimer % 4 === 0) {
        const dir = player.physics.groundSpeed > 0 ? 1 : -1
        this.particles.emitDust(player.physics.x, player.physics.y + player.height, dir)
      }
    } else {
      this.dustTimer = 0
    }

    if (player.state === 'spindash') {
      this.particles.emitSpindashSpark(player.physics.x, player.physics.y + player.height)
    }

    this.particles.update()

    camera.update(
      player.physics.x,
      player.physics.y,
      player.physics.onGround,
      pressed(Action.Up) && player.state === 'idle',
      pressed(Action.Down) && player.state === 'idle',
      player.physics.xSpeed,
    )

    if (player.physics.y > this.levelDef.height * TILE_SIZE + 100) {
      player.physics.x = this.levelDef.playerStart.x
      player.physics.y = this.levelDef.playerStart.y
      player.physics.xSpeed = 0
      player.physics.ySpeed = 0
      player.physics.groundSpeed = 0
      player.rings = 0
    }

    if (player.physics.x > (this.levelDef.width - 5) * TILE_SIZE) {
      this.onLevelComplete()
    }

    this.hud.update(player.score, player.rings, this.levelDef.name)
  }

  private scatterRings(x: number, y: number, count: number) {
    const ringCount = Math.min(count, 32)
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2
      const ring = new ScatteredRing(x, y, angle)
      this.scatteredRings.push(ring)
    }
  }

  render(_interpolation: number, renderer: WebGLRenderer) {
    const { player, entities, camera, tileMap } = this.level

    // Background (screen space)
    this.background.update(camera.x, camera.y)
    this.background.render(renderer)

    // World space
    renderer.setOffset(-camera.x, -camera.y)

    // Tiles
    tileMap.render(renderer, camera.x, camera.y, SCREEN_WIDTH, SCREEN_HEIGHT)

    // Entities
    for (const entity of entities) {
      if (entity.active) {
        entity.render(renderer)
      }
    }

    // Player
    player.render(renderer)

    // Scattered rings
    for (const ring of this.scatteredRings) {
      if (ring.active) {
        ring.render(renderer)
      }
    }

    // Particles
    this.particles.render(renderer)

    // Back to screen space
    renderer.resetOffset()

    // HUD
    this.hud.render(renderer)
  }
}
