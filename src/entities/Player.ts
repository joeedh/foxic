import { StateMachine } from '../core/StateMachine'
import { SonicPhysics, type PhysicsState } from '../physics/SonicPhysics'
import {
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_HEIGHT_ROLLING,
  SPINDASH_BASE,
  JUMP_BUFFER_FRAMES,
} from '../constants'
import {
  pressed,
  justPressed,
  justReleased,
  pressedWithinFrames,
  consumePress,
  Action,
} from '../input'
import type { GameEntity, CollisionResult } from '../level/LevelLoader'
import { getPlayerFrame } from '../rendering/AssetLoader'
import { AnimationController } from '../rendering/AnimationController'
import type { WebGLRenderer } from '../rendering/WebGLRenderer'

export type PlayerState =
  | 'idle'
  | 'running'
  | 'jumping'
  | 'rolling'
  | 'crouching'
  | 'spindash'
  | 'falling'

export class Player implements GameEntity {
  physics: PhysicsState
  private sm: StateMachine<Player, PlayerState>
  private sonicPhysics: SonicPhysics
  private anim: AnimationController
  facingRight = true
  spindashCharge = 0
  rings = 0
  score = 0
  invincibleTimer = 0
  width = PLAYER_WIDTH
  active = true

  constructor(x: number, y: number, sonicPhysics: SonicPhysics) {
    this.sonicPhysics = sonicPhysics
    this.physics = {
      x,
      y,
      xSpeed: 0,
      ySpeed: 0,
      groundSpeed: 0,
      groundAngle: 0,
      onGround: false,
      pushing: false,
      controlLockTimer: 0,
      currentDepth: 0,
    }

    this.anim = new AnimationController()
    this.anim.define('idle', {
      frames: ['idle'],
      ticksPerFrame: 1,
      loop: false,
    })
    this.anim.define('run', {
      frames: ['run1', 'run2', 'run3', 'run2'],
      ticksPerFrame: 15,
      loop: true,
    })
    this.anim.define('jump', {
      frames: ['jump'],
      ticksPerFrame: 1,
      loop: false,
    })
    this.anim.define('crouch', {
      frames: ['crouch'],
      ticksPerFrame: 1,
      loop: false,
    })
    this.anim.define('skid', {
      frames: ['skid'],
      ticksPerFrame: 1,
      loop: false,
    })
    this.anim.define('push', {
      frames: ['push'],
      ticksPerFrame: 1,
      loop: false,
    })
    this.anim.play('idle')

    this.sm = new StateMachine<Player, PlayerState>(this)
    this.setupStates()
    this.sm.transition('falling')
  }

  private setupStates() {
    this.sm.add('idle', {
      update: (p) => {
        p.sonicPhysics.updateGround(p.physics, false, false, false)

        if (!p.physics.onGround) {
          p.sm.transition('falling')
        } else if (pressed(Action.Left) || pressed(Action.Right)) {
          p.sm.transition('running')
        } else if (pressed(Action.Down)) {
          p.sm.transition('crouching')
        } else if (justPressed(Action.Jump)) {
          p.sonicPhysics.jump(p.physics)
          p.sm.transition('jumping')
        }

        p.anim.play(p.physics.pushing ? 'push' : 'idle')
      },
    })

    this.sm.add('running', {
      update: (p) => {
        const left = pressed(Action.Left)
        const right = pressed(Action.Right)
        p.sonicPhysics.updateGround(p.physics, left, right, false)

        if (right) p.facingRight = true
        if (left) p.facingRight = false

        if (!p.physics.onGround) {
          p.sm.transition('falling')
        } else if (
          pressed(Action.Down) &&
          Math.abs(p.physics.groundSpeed) > 1
        ) {
          p.sm.transition('rolling')
        } else if (p.physics.groundSpeed === 0 && !left && !right) {
          p.sm.transition('idle')
        } else if (justPressed(Action.Jump)) {
          p.sonicPhysics.jump(p.physics)
          p.sm.transition('jumping')
        }

        const isSkidding =
          (right && p.physics.groundSpeed < -0.5) ||
          (left && p.physics.groundSpeed > 0.5)
        if (p.physics.pushing) {
          p.anim.play('push')
        } else if (isSkidding) {
          p.anim.play('skid')
        } else {
          p.anim.play('run')
          const speedRatio = Math.abs(p.physics.groundSpeed) / 3
          p.anim.setSpeedMultiplier(0.5 + speedRatio * 2.5)
        }
      },
    })

    this.sm.add('jumping', {
      update: (p) => {
        const left = pressed(Action.Left)
        const right = pressed(Action.Right)
        p.sonicPhysics.updateAir(p.physics, left, right, false)

        if (right) p.facingRight = true
        if (left) p.facingRight = false

        if (justReleased(Action.Jump)) {
          p.sonicPhysics.variableJump(p.physics)
        }

        if (p.physics.onGround) {
          p.handleLanding()
        }

        p.anim.play('jump')
      },
    })

    this.sm.add('falling', {
      update: (p) => {
        const left = pressed(Action.Left)
        const right = pressed(Action.Right)
        p.sonicPhysics.updateAir(p.physics, left, right, false)

        if (right) p.facingRight = true
        if (left) p.facingRight = false

        if (p.physics.onGround) {
          p.handleLanding()
        }

        p.anim.play('jump')
      },
    })

    this.sm.add('rolling', {
      update: (p) => {
        const left = pressed(Action.Left)
        const right = pressed(Action.Right)
        p.sonicPhysics.updateGround(p.physics, left, right, true)

        if (!p.physics.onGround) {
          p.sm.transition('jumping')
        } else if (Math.abs(p.physics.groundSpeed) < 0.5) {
          p.sm.transition('idle')
        } else if (justPressed(Action.Jump)) {
          p.sonicPhysics.jump(p.physics)
          p.sm.transition('jumping')
        }

        p.anim.play('jump')
      },
    })

    this.sm.add('crouching', {
      update: (p) => {
        p.sonicPhysics.updateGround(p.physics, false, false, false)

        if (!p.physics.onGround) {
          p.sm.transition('falling')
        } else if (!pressed(Action.Down)) {
          p.sm.transition('idle')
        } else if (justPressed(Action.Jump)) {
          p.sm.transition('spindash')
        }

        p.anim.play('crouch')
      },
    })

    this.sm.add('spindash', {
      enter: (p) => {
        p.spindashCharge = 0
      },
      update: (p) => {
        p.spindashCharge -= Math.floor(p.spindashCharge / 2) * 0.03125
        if (p.spindashCharge < 0) p.spindashCharge = 0

        if (justPressed(Action.Jump)) {
          p.spindashCharge += 2
          if (p.spindashCharge > 8) p.spindashCharge = 8
        }

        if (!pressed(Action.Down)) {
          const speed = SPINDASH_BASE + Math.floor(p.spindashCharge / 2)
          p.physics.groundSpeed = p.facingRight ? speed : -speed
          p.sm.transition('rolling')
        }

        p.anim.play('crouch')
      },
    })
  }

  private handleLanding() {
    if (pressedWithinFrames(Action.Jump, JUMP_BUFFER_FRAMES)) {
      consumePress(Action.Jump)
      this.sonicPhysics.jump(this.physics)
      this.sm.transition('jumping')
    } else if (pressed(Action.Down)) {
      this.sm.transition('rolling')
    } else if (this.physics.groundSpeed === 0) {
      this.sm.transition('idle')
    } else {
      this.sm.transition('running')
    }
  }

  get x(): number {
    return this.physics.x
  }

  get y(): number {
    return this.physics.y
  }

  get state(): PlayerState | null {
    return this.sm.current
  }

  get isRolling(): boolean {
    const s = this.sm.current
    return s === 'rolling' || s === 'jumping' || s === 'spindash'
  }

  get height(): number {
    return this.isRolling ? PLAYER_HEIGHT_ROLLING : PLAYER_HEIGHT
  }

  update(_dt: number) {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer--
    }
    this.sm.update(_dt)
    this.anim.update()
  }

  render(renderer: WebGLRenderer) {
    const frameName = this.anim.getCurrentFrame()
    const frame = getPlayerFrame(frameName)

    let alpha = 1
    if (
      this.invincibleTimer > 0 &&
      Math.floor(this.invincibleTimer / 4) % 2 === 0
    ) {
      alpha = 0.4
    }

    const drawW = PLAYER_WIDTH * 2
    const drawH = PLAYER_HEIGHT * 1.5
    const rotation = this.physics.onGround ? -this.physics.groundAngle : 0
    renderer.drawFrame(
      frame,
      this.physics.x - drawW / 2,
      this.physics.y + this.height / 2 - drawH / 2,
      drawW,
      drawH,
      {
        alpha,
        flipX: !this.facingRight,
        rotation,
      },
    )
  }

  onPlayerCollision(): CollisionResult | null {
    return null
  }

  hurt(enemyX?: number) {
    if (this.invincibleTimer > 0) return
    this.invincibleTimer = 120
    const knockbackDir =
      enemyX !== undefined
        ? this.physics.x < enemyX
          ? -1
          : 1
        : this.facingRight
          ? -1
          : 1
    this.physics.ySpeed = -4
    this.physics.xSpeed = knockbackDir * 2
    this.physics.onGround = false
    this.physics.groundSpeed = 0
    this.rings = 0
    this.sm.transition('falling')
  }
}
