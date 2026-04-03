import { SCREEN_WIDTH, SCREEN_HEIGHT } from "./constants"

export class Camera {
  x = 0
  y = 0
  private targetX = 0
  private targetY = 0
  private lookTimer = 0
  private lookDirection = 0
  private lookaheadX = 0

  constructor(
    private levelWidth: number,
    private levelHeight: number,
  ) {}

  update(
    playerX: number,
    playerY: number,
    onGround: boolean,
    lookingUp: boolean,
    lookingDown: boolean,
    playerXSpeed: number = 0,
  ) {
    // Horizontal: lerp toward player with speed-based lookahead
    const lookaheadTarget = playerXSpeed * 16
    this.lookaheadX += (lookaheadTarget - this.lookaheadX) * 0.05
    this.targetX = playerX - SCREEN_WIDTH / 2 + this.lookaheadX
    this.x += (this.targetX - this.x) * 0.1

    // Vertical: snap on ground, lag in air
    if (onGround) {
      this.targetY = playerY - SCREEN_HEIGHT * 0.65
      this.y += (this.targetY - this.y) * 0.2
    } else {
      this.targetY = playerY - SCREEN_HEIGHT * 0.5
      // Slow vertical follow in air (max 6px per frame)
      const diff = this.targetY - this.y
      const maxScroll = 6
      if (Math.abs(diff) > maxScroll) {
        this.y += Math.sign(diff) * maxScroll
      } else {
        this.y = this.targetY
      }
    }

    // Look up/down
    if (lookingUp && onGround) {
      this.lookTimer = Math.min(this.lookTimer + 1, 120)
      this.lookDirection = -1
    } else if (lookingDown && onGround) {
      this.lookTimer = Math.min(this.lookTimer + 1, 120)
      this.lookDirection = 1
    } else {
      this.lookTimer = Math.max(this.lookTimer - 4, 0)
      if (this.lookTimer === 0) this.lookDirection = 0
    }

    if (this.lookDirection !== 0 && this.lookTimer > 0) {
      const lookOffset = (this.lookTimer / 120) * 104 * this.lookDirection
      this.y += lookOffset
    }

    // Clamp to level bounds
    this.x = Math.max(0, Math.min(this.levelWidth - SCREEN_WIDTH, this.x))
    this.y = Math.max(0, Math.min(this.levelHeight - SCREEN_HEIGHT, this.y))
  }
}
