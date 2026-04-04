import { TileMap } from '../level/TileMap'
import { PLAYER_RADIUS } from '../constants'

export interface SensorResult {
  hit: boolean
  distance: number
  surfaceY: number
  angle: number
}

export interface WallSensorResult {
  hit: boolean
  wallX: number
}

export interface CeilingSensorResult {
  hit: boolean
  ceilingY: number
}

export class SensorSystem {
  constructor(private tileMap: TileMap) {}

  /**
   * Cast a floor sensor downward from (x, startY).
   * Returns the distance to ground and the surface angle.
   */
  castFloorSensor(x: number, y: number, maxDist: number = 32): SensorResult {
    const ground = this.tileMap.getGroundHeight(x, y, maxDist)
    if (ground === null) {
      return { hit: false, distance: maxDist, surfaceY: y + maxDist, angle: 0 }
    }
    const distance = ground.y - y
    return { hit: true, distance, surfaceY: ground.y, angle: ground.angle }
  }

  /**
   * Cast floor sensors A and B (offset left/right from center).
   * Returns the closer ground hit and the interpolated angle.
   */
  castFloorSensors(
    centerX: number,
    bottomY: number,
    maxDist: number = 32,
  ): SensorResult {
    const sensorA = this.castFloorSensor(
      centerX - PLAYER_RADIUS,
      bottomY,
      maxDist,
    )
    const sensorB = this.castFloorSensor(
      centerX + PLAYER_RADIUS,
      bottomY,
      maxDist,
    )

    // Use the sensor that found closer ground
    if (!sensorA.hit && !sensorB.hit) {
      return {
        hit: false,
        distance: maxDist,
        surfaceY: bottomY + maxDist,
        angle: 0,
      }
    }

    if (!sensorA.hit) return sensorB
    if (!sensorB.hit) return sensorA

    // Both hit: use the one with the higher (closer) surface
    if (sensorA.surfaceY <= sensorB.surfaceY) {
      // Compute angle from both sensors
      const dx = PLAYER_RADIUS * 2
      const dy = sensorB.surfaceY - sensorA.surfaceY
      const angle = Math.atan2(dy, dx)
      return { ...sensorA, angle }
    } else {
      const dx = PLAYER_RADIUS * 2
      const dy = sensorB.surfaceY - sensorA.surfaceY
      const angle = Math.atan2(dy, dx)
      return { ...sensorB, angle }
    }
  }

  /**
   * Cast wall sensor C (left) or D (right).
   */
  castWallSensor(
    x: number,
    y: number,
    direction: -1 | 1,
    reach: number = PLAYER_RADIUS + 2,
  ): WallSensorResult {
    const checkX = x + direction * reach
    const wall = this.tileMap.getWall(checkX, y, direction)
    if (wall !== null) {
      return { hit: true, wallX: wall }
    }
    return { hit: false, wallX: checkX }
  }

  /**
   * Cast ceiling sensors E and F.
   */
  castCeilingSensor(x: number, topY: number): CeilingSensorResult {
    const left = this.tileMap.getCeiling(x - PLAYER_RADIUS, topY)
    const right = this.tileMap.getCeiling(x + PLAYER_RADIUS, topY)

    if (left !== null) {
      return { hit: true, ceilingY: left }
    }
    if (right !== null) {
      return { hit: true, ceilingY: right }
    }
    return { hit: false, ceilingY: topY }
  }
}
