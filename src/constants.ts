// Screen
export const SCREEN_WIDTH = 800
export const SCREEN_HEIGHT = 450

// Tile
export const TILE_SIZE = 16

// Ground movement (pixels per frame at 60 FPS)
export const ACCELERATION = 0.046875
export const DECELERATION = 0.5
export const FRICTION = 0.046875
export const TOP_SPEED = 6.0
export const ROLL_FRICTION = 0.0234375
export const ROLL_DECELERATION = 0.125

// Air movement
export const AIR_ACCELERATION = 0.09375
export const AIR_DRAG_THRESHOLD = -4.0
export const AIR_DRAG_FACTOR = 0.96875

// Jumping
export const JUMP_FORCE = -6.5
export const JUMP_RELEASE_CAP = -4.0
export const GRAVITY = 0.21875
export const MAX_Y_SPEED = 16.0

// Input buffering
export const JUMP_BUFFER_FRAMES = 4

// Slopes
export const SLOPE_FACTOR_NORMAL = 0.125
export const SLOPE_FACTOR_ROLLUP = 0.078125
export const SLOPE_FACTOR_ROLLDOWN = 0.3125

// Spin dash
export const SPINDASH_BASE = 8.0
export const SPINDASH_CHARGE = 2.0

// Player dimensions
export const PLAYER_WIDTH = 20
export const PLAYER_HEIGHT = 40
export const PLAYER_RADIUS = 10 // half-width for sensors
export const PLAYER_HEIGHT_ROLLING = 30
