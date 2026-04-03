import { type PhysicsState } from "./SonicPhysics"

export interface AABB {
  x: number
  y: number
  width: number
  height: number
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

export function playerAABB(
  state: PhysicsState,
  width: number,
  height: number,
): AABB {
  return {
    x: state.x - width / 2,
    y: state.y,
    width,
    height,
  }
}
