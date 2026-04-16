import {
  ACCELERATION,
  DECELERATION,
  FRICTION,
  TOP_SPEED,
  ROLL_FRICTION,
  ROLL_DECELERATION,
  AIR_ACCELERATION,
  AIR_DRAG_THRESHOLD,
  AIR_DRAG_FACTOR,
  JUMP_FORCE,
  JUMP_RELEASE_CAP,
  GRAVITY,
  MAX_Y_SPEED,
  SLOPE_FACTOR_NORMAL,
  SLOPE_FACTOR_ROLLUP,
  SLOPE_FACTOR_ROLLDOWN,
  PLAYER_HEIGHT,
  PLAYER_HEIGHT_ROLLING,
  PLAYER_RADIUS,
  FALL_OFF_SPEED,
  CONTROL_LOCK_FRAMES,
} from '../constants'
import { SensorSystem, SensorMode, getSensorMode } from './SensorSystem'

export interface PhysicsState {
  x: number
  y: number
  xSpeed: number
  ySpeed: number
  groundSpeed: number
  groundAngle: number
  onGround: boolean
  pushing: boolean
  controlLockTimer: number
  currentDepth: number
}

export class SonicPhysics {
  constructor(private sensors: SensorSystem) {}

  updateGround(
    state: PhysicsState,
    inputLeft: boolean,
    inputRight: boolean,
    rolling: boolean,
  ) {
    // Decrement control lock timer
    if (state.controlLockTimer > 0) {
      state.controlLockTimer--
      inputLeft = false
      inputRight = false
    }

    // 1. Slope factor
    const slopeFactor = rolling
      ? state.groundSpeed > 0
        ? SLOPE_FACTOR_ROLLDOWN
        : SLOPE_FACTOR_ROLLUP
      : SLOPE_FACTOR_NORMAL

    state.groundSpeed -= slopeFactor * Math.sin(state.groundAngle)

    // 2. Input
    if (!rolling) {
      if (inputRight) {
        if (state.groundSpeed < 0) {
          state.groundSpeed += DECELERATION
          if (state.groundSpeed >= 0) state.groundSpeed = 0.5
        } else if (state.groundSpeed < TOP_SPEED) {
          state.groundSpeed += ACCELERATION
          if (state.groundSpeed > TOP_SPEED) state.groundSpeed = TOP_SPEED
        }
      } else if (inputLeft) {
        if (state.groundSpeed > 0) {
          state.groundSpeed -= DECELERATION
          if (state.groundSpeed <= 0) state.groundSpeed = -0.5
        } else if (state.groundSpeed > -TOP_SPEED) {
          state.groundSpeed -= ACCELERATION
          if (state.groundSpeed < -TOP_SPEED) state.groundSpeed = -TOP_SPEED
        }
      } else {
        // Friction
        if (state.groundSpeed > 0) {
          state.groundSpeed -= FRICTION
          if (state.groundSpeed < 0) state.groundSpeed = 0
        } else if (state.groundSpeed < 0) {
          state.groundSpeed += FRICTION
          if (state.groundSpeed > 0) state.groundSpeed = 0
        }
      }
    } else {
      // Rolling input
      if (inputRight && state.groundSpeed < 0) {
        state.groundSpeed += ROLL_DECELERATION
      } else if (inputLeft && state.groundSpeed > 0) {
        state.groundSpeed -= ROLL_DECELERATION
      }

      // Rolling friction
      if (state.groundSpeed > 0) {
        state.groundSpeed -= ROLL_FRICTION
        if (state.groundSpeed < 0) state.groundSpeed = 0
      } else if (state.groundSpeed < 0) {
        state.groundSpeed += ROLL_FRICTION
        if (state.groundSpeed > 0) state.groundSpeed = 0
      }
    }

    // 3. Convert ground speed to x/y velocity
    state.xSpeed = state.groundSpeed * Math.cos(state.groundAngle)
    state.ySpeed = state.groundSpeed * -Math.sin(state.groundAngle)

    // 4. Move
    state.x += state.xSpeed
    state.y += state.ySpeed

    // 5. Re-detect ground using mode-aware sensors
    const height = rolling ? PLAYER_HEIGHT_ROLLING : PLAYER_HEIGHT
    const mode = getSensorMode(state.groundAngle)
    const d = state.currentDepth
    const floor = this.sensors.castGroundSensorsWithMode(
      state.x,
      state.y,
      height,
      mode,
      32,
      d,
    )

    if (floor.hit && floor.distance <= 14) {
      // Snap to surface based on mode
      switch (mode) {
        case SensorMode.Floor:
          state.y = floor.surfaceY - height
          break
        case SensorMode.Ceiling:
          state.y = floor.surfaceY
          break
        case SensorMode.RightWall:
          state.x = floor.surfaceX - PLAYER_RADIUS
          break
        case SensorMode.LeftWall:
          state.x = floor.surfaceX + PLAYER_RADIUS
          break
      }
      state.groundAngle = floor.angle

      // Fall-off check: detach if too slow on steep surfaces
      const absAngle = Math.abs(state.groundAngle)
      if (
        absAngle > Math.PI / 4 &&
        Math.abs(state.groundSpeed) < FALL_OFF_SPEED
      ) {
        state.onGround = false
        state.groundAngle = 0
        state.controlLockTimer = CONTROL_LOCK_FRAMES
      } else {
        state.onGround = true
      }
    } else {
      // Lost ground
      state.onGround = false
      state.groundAngle = 0
    }

    // 6. Wall check
    state.pushing = false
    if (state.xSpeed > 0) {
      const wall = this.sensors.castWallSensor(
        state.x,
        state.y + height / 2,
        1,
        PLAYER_RADIUS + 2,
        d,
      )
      if (wall.hit) {
        state.x = wall.wallX - PLAYER_RADIUS - 1
        state.groundSpeed = 0
        state.xSpeed = 0
        state.pushing = true
      }
    } else if (state.xSpeed < 0) {
      const wall = this.sensors.castWallSensor(
        state.x,
        state.y + height / 2,
        -1,
        PLAYER_RADIUS + 2,
        d,
      )
      if (wall.hit) {
        state.x = wall.wallX + PLAYER_RADIUS + 1
        state.groundSpeed = 0
        state.xSpeed = 0
        state.pushing = true
      }
    }
  }

  updateAir(
    state: PhysicsState,
    inputLeft: boolean,
    inputRight: boolean,
    rolling: boolean,
  ) {
    // Decrement control lock in air too
    if (state.controlLockTimer > 0) {
      state.controlLockTimer--
    }

    // 1. Gravity
    state.ySpeed += GRAVITY
    if (state.ySpeed > MAX_Y_SPEED) state.ySpeed = MAX_Y_SPEED

    // 2. Air drag
    if (state.ySpeed < 0 && state.ySpeed > AIR_DRAG_THRESHOLD) {
      state.xSpeed *= AIR_DRAG_FACTOR
    }

    // 3. Air acceleration
    if (inputRight && state.xSpeed < TOP_SPEED) {
      state.xSpeed += AIR_ACCELERATION
      if (state.xSpeed > TOP_SPEED) state.xSpeed = TOP_SPEED
    } else if (inputLeft && state.xSpeed > -TOP_SPEED) {
      state.xSpeed -= AIR_ACCELERATION
      if (state.xSpeed < -TOP_SPEED) state.xSpeed = -TOP_SPEED
    }

    // 4. Move
    state.x += state.xSpeed
    state.y += state.ySpeed

    const height = rolling ? PLAYER_HEIGHT_ROLLING : PLAYER_HEIGHT
    const d = state.currentDepth

    // 5. Floor check (landing)
    if (state.ySpeed >= 0) {
      const floor = this.sensors.castFloorSensors(
        state.x,
        state.y + height,
        8,
        d,
      )
      if (floor.hit && floor.distance <= 0) {
        state.y = floor.surfaceY - height
        state.groundAngle = floor.angle
        state.onGround = true
        state.groundSpeed =
          state.xSpeed * Math.cos(floor.angle) -
          state.ySpeed * Math.sin(floor.angle)
      }
    }

    // 6. Ceiling check
    if (state.ySpeed < 0) {
      const ceil = this.sensors.castCeilingSensor(state.x, state.y, d)
      if (ceil.hit && ceil.ceilingY > state.y) {
        state.y = ceil.ceilingY
        state.ySpeed = 0
      }
    }

    // 7. Wall check
    state.pushing = false
    if (state.xSpeed > 0) {
      const wall = this.sensors.castWallSensor(
        state.x,
        state.y + height / 2,
        1,
        PLAYER_RADIUS + 2,
        d,
      )
      if (wall.hit) {
        state.x = wall.wallX - PLAYER_RADIUS - 1
        state.xSpeed = 0
        state.pushing = true
      }
    } else if (state.xSpeed < 0) {
      const wall = this.sensors.castWallSensor(
        state.x,
        state.y + height / 2,
        -1,
        PLAYER_RADIUS + 2,
        d,
      )
      if (wall.hit) {
        state.x = wall.wallX + PLAYER_RADIUS + 1
        state.xSpeed = 0
        state.pushing = true
      }
    }
  }

  jump(state: PhysicsState) {
    state.xSpeed =
      state.groundSpeed * Math.cos(state.groundAngle) -
      JUMP_FORCE * Math.sin(state.groundAngle)
    state.ySpeed =
      state.groundSpeed * -Math.sin(state.groundAngle) +
      JUMP_FORCE * Math.cos(state.groundAngle)
    state.onGround = false
    state.groundAngle = 0
  }

  variableJump(state: PhysicsState) {
    if (state.ySpeed < JUMP_RELEASE_CAP) {
      state.ySpeed = JUMP_RELEASE_CAP
    }
  }
}
