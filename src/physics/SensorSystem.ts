import { TileMap } from '../level/TileMap'
import { PLAYER_RADIUS } from '../constants'

export interface SensorResult {
  hit: boolean
  distance: number
  surfaceY: number
  surfaceX: number
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

export enum SensorMode {
  Floor,
  RightWall,
  Ceiling,
  LeftWall,
}

export function getSensorMode(angle: number): SensorMode {
  let a = angle
  while (a > Math.PI) a -= 2 * Math.PI
  while (a <= -Math.PI) a += 2 * Math.PI

  const deg45 = Math.PI / 4
  const deg135 = (3 * Math.PI) / 4

  if (a >= -deg45 && a < deg45) return SensorMode.Floor
  if (a >= deg45 && a < deg135) return SensorMode.LeftWall
  if (a >= -deg135 && a < -deg45) return SensorMode.RightWall
  return SensorMode.Ceiling
}

function noHit(x: number, y: number, maxDist: number): SensorResult {
  return { hit: false, distance: maxDist, surfaceY: y, surfaceX: x, angle: 0 }
}

export class SensorSystem {
  constructor(private tileMap: TileMap) {}

  castFloorSensor(
    x: number,
    y: number,
    maxDist: number = 32,
    depth: number = 0,
  ): SensorResult {
    const ground = this.tileMap.getGroundHeight(x, y, maxDist, depth)
    if (ground === undefined) return noHit(x, y + maxDist, maxDist)
    return {
      hit: true,
      distance: ground.y - y,
      surfaceY: ground.y,
      surfaceX: x,
      angle: ground.angle,
    }
  }

  castFloorSensors(
    centerX: number,
    bottomY: number,
    maxDist: number = 32,
    depth: number = 0,
  ): SensorResult {
    const sensorA = this.castFloorSensor(
      centerX - PLAYER_RADIUS,
      bottomY,
      maxDist,
      depth,
    )
    const sensorB = this.castFloorSensor(
      centerX + PLAYER_RADIUS,
      bottomY,
      maxDist,
      depth,
    )

    if (!sensorA.hit && !sensorB.hit) {
      return noHit(centerX, bottomY + maxDist, maxDist)
    }
    if (!sensorA.hit) return sensorB
    if (!sensorB.hit) return sensorA

    const dx = PLAYER_RADIUS * 2
    const dy = sensorB.surfaceY - sensorA.surfaceY
    const angle = Math.atan2(dy, dx)
    if (sensorA.surfaceY <= sensorB.surfaceY) {
      return { ...sensorA, angle }
    } else {
      return { ...sensorB, angle }
    }
  }

  castGroundSensorsWithMode(
    centerX: number,
    centerY: number,
    height: number,
    mode: SensorMode,
    maxDist: number = 32,
    depth: number = 0,
  ): SensorResult {
    switch (mode) {
      case SensorMode.Floor:
        return this.castFloorSensors(centerX, centerY + height, maxDist, depth)
      case SensorMode.Ceiling:
        return this.castCeilingSensorsForMode(centerX, centerY, maxDist, depth)
      case SensorMode.RightWall:
        return this.castRightWallSensorsForMode(
          centerX,
          centerY,
          height,
          maxDist,
          depth,
        )
      case SensorMode.LeftWall:
        return this.castLeftWallSensorsForMode(
          centerX,
          centerY,
          height,
          maxDist,
          depth,
        )
    }
  }

  private castCeilingSensorsForMode(
    centerX: number,
    topY: number,
    maxDist: number,
    depth: number,
  ): SensorResult {
    const leftResult = this.tileMap.getCeilingHeight(
      centerX - PLAYER_RADIUS,
      topY,
      maxDist,
      depth,
    )
    const rightResult = this.tileMap.getCeilingHeight(
      centerX + PLAYER_RADIUS,
      topY,
      maxDist,
      depth,
    )

    if (leftResult === undefined && rightResult === undefined) {
      return noHit(centerX, topY - maxDist, maxDist)
    }
    if (leftResult === undefined) {
      return {
        hit: true,
        distance: topY - rightResult!.y,
        surfaceY: rightResult!.y,
        surfaceX: centerX,
        angle: rightResult!.angle,
      }
    }
    if (rightResult === undefined) {
      return {
        hit: true,
        distance: topY - leftResult.y,
        surfaceY: leftResult.y,
        surfaceX: centerX,
        angle: leftResult.angle,
      }
    }

    const dx = PLAYER_RADIUS * 2
    const dy = rightResult.y - leftResult.y
    const angle = Math.atan2(dy, dx)
    const closer = leftResult.y >= rightResult.y ? leftResult : rightResult
    return {
      hit: true,
      distance: topY - closer.y,
      surfaceY: closer.y,
      surfaceX: centerX,
      angle,
    }
  }

  private castRightWallSensorsForMode(
    centerX: number,
    centerY: number,
    height: number,
    maxDist: number,
    depth: number,
  ): SensorResult {
    const rightEdge = centerX + PLAYER_RADIUS
    const topResult = this.tileMap.getRightWallSurface(
      centerY,
      rightEdge,
      maxDist,
      depth,
    )
    const bottomResult = this.tileMap.getRightWallSurface(
      centerY + height,
      rightEdge,
      maxDist,
      depth,
    )

    if (topResult === undefined && bottomResult === undefined) {
      return noHit(centerX + maxDist, centerY, maxDist)
    }
    if (topResult === undefined) {
      return {
        hit: true,
        distance: bottomResult!.x - rightEdge,
        surfaceY: centerY,
        surfaceX: bottomResult!.x,
        angle: bottomResult!.angle,
      }
    }
    if (bottomResult === undefined) {
      return {
        hit: true,
        distance: topResult.x - rightEdge,
        surfaceY: centerY,
        surfaceX: topResult.x,
        angle: topResult.angle,
      }
    }

    const closer = topResult.x <= bottomResult.x ? topResult : bottomResult
    return {
      hit: true,
      distance: closer.x - rightEdge,
      surfaceY: centerY,
      surfaceX: closer.x,
      angle: closer.angle,
    }
  }

  private castLeftWallSensorsForMode(
    centerX: number,
    centerY: number,
    height: number,
    maxDist: number,
    depth: number,
  ): SensorResult {
    const leftEdge = centerX - PLAYER_RADIUS
    const topResult = this.tileMap.getLeftWallSurface(
      centerY,
      leftEdge,
      maxDist,
      depth,
    )
    const bottomResult = this.tileMap.getLeftWallSurface(
      centerY + height,
      leftEdge,
      maxDist,
      depth,
    )

    if (topResult === undefined && bottomResult === undefined) {
      return noHit(centerX - maxDist, centerY, maxDist)
    }
    if (topResult === undefined) {
      return {
        hit: true,
        distance: leftEdge - bottomResult!.x,
        surfaceY: centerY,
        surfaceX: bottomResult!.x,
        angle: bottomResult!.angle,
      }
    }
    if (bottomResult === undefined) {
      return {
        hit: true,
        distance: leftEdge - topResult.x,
        surfaceY: centerY,
        surfaceX: topResult.x,
        angle: topResult.angle,
      }
    }

    const closer = topResult.x >= bottomResult.x ? topResult : bottomResult
    return {
      hit: true,
      distance: leftEdge - closer.x,
      surfaceY: centerY,
      surfaceX: closer.x,
      angle: closer.angle,
    }
  }

  castWallSensor(
    x: number,
    y: number,
    direction: -1 | 1,
    reach: number = PLAYER_RADIUS + 2,
    depth: number = 0,
  ): WallSensorResult {
    const checkX = x + direction * reach
    const wall = this.tileMap.getWall(checkX, y, direction, depth)
    if (wall !== undefined) {
      return { hit: true, wallX: wall }
    }
    return { hit: false, wallX: checkX }
  }

  castCeilingSensor(
    x: number,
    topY: number,
    depth: number = 0,
  ): CeilingSensorResult {
    const left = this.tileMap.getCeiling(x - PLAYER_RADIUS, topY, depth)
    const right = this.tileMap.getCeiling(x + PLAYER_RADIUS, topY, depth)

    if (left !== undefined) return { hit: true, ceilingY: left }
    if (right !== undefined) return { hit: true, ceilingY: right }
    return { hit: false, ceilingY: topY }
  }
}
