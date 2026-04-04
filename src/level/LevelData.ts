export interface EntitySpawn {
  type: string
  x: number
  y: number
  properties?: Record<string, unknown>
}

export interface LevelDefinition {
  name: string
  width: number
  height: number
  tileGrid: number[][]
  entities: EntitySpawn[]
  playerStart: { x: number; y: number }
}

// Tile IDs:
// 0 = air, 1 = dirt, 2 = grass, 3 = slope up-right 45, 4 = slope up-left 45
// 5 = gentle slope right low, 6 = gentle slope right high
// 7 = gentle slope left low, 8 = gentle slope left high
// 9 = half-height platform

function row(tiles: number[], width: number): number[] {
  // Pad or trim to level width
  const result = new Array(width).fill(0)
  for (let i = 0; i < Math.min(tiles.length, width); i++) {
    result[i] = tiles[i]
  }
  return result
}

function emptyRow(width: number): number[] {
  return new Array(width).fill(0)
}

function solidRow(width: number): number[] {
  return new Array(width).fill(1)
}

function groundRow(width: number): number[] {
  return new Array(width).fill(2)
}

export function createLevel1(): LevelDefinition {
  const W = 200
  const H = 30
  const grid: number[][] = []

  // Fill with air
  for (let r = 0; r < H; r++) {
    grid.push(emptyRow(W))
  }

  // Ground layer at row 25 (grass) and rows 26-29 (dirt)
  grid[25] = groundRow(W)
  for (let r = 26; r < H; r++) {
    grid[r] = solidRow(W)
  }

  // Add some hills and slopes
  // Hill 1: gentle slope up at columns 20-23, flat at 24-28, gentle slope down 29-32
  for (let c = 20; c <= 21; c++) {
    grid[24][c] = 5 // gentle slope right low
    grid[25][c] = 1
  }
  for (let c = 22; c <= 23; c++) {
    grid[24][c] = 6 // gentle slope right high
    grid[25][c] = 1
  }
  for (let c = 24; c <= 28; c++) {
    grid[24][c] = 2 // flat grass on top
    grid[25][c] = 1
  }
  for (let c = 29; c <= 30; c++) {
    grid[24][c] = 8 // gentle slope left high
    grid[25][c] = 1
  }
  for (let c = 31; c <= 32; c++) {
    grid[24][c] = 7 // gentle slope left low
    grid[25][c] = 1
  }

  // Hill 2: steeper 45-degree slope at columns 50-52, flat 53-56, down 57-59
  grid[24][50] = 3
  grid[25][50] = 1
  grid[23][51] = 3
  grid[24][51] = 1
  grid[25][51] = 1
  grid[22][52] = 3
  grid[23][52] = 1
  grid[24][52] = 1
  grid[25][52] = 1
  for (let c = 53; c <= 56; c++) {
    grid[22][c] = 2
    grid[23][c] = 1
    grid[24][c] = 1
    grid[25][c] = 1
  }
  grid[22][57] = 4
  grid[23][57] = 1
  grid[24][57] = 1
  grid[25][57] = 1
  grid[23][58] = 4
  grid[24][58] = 1
  grid[25][58] = 1
  grid[24][59] = 4
  grid[25][59] = 1

  // Floating platforms
  grid[20][70] = 2
  grid[20][71] = 2
  grid[20][72] = 2

  grid[18][80] = 2
  grid[18][81] = 2
  grid[18][82] = 2
  grid[18][83] = 2

  // Gap in ground (pit) at columns 90-95
  for (let c = 90; c <= 95; c++) {
    grid[25][c] = 0
    grid[26][c] = 0
    grid[27][c] = 0
    grid[28][c] = 0
    grid[29][c] = 0
  }

  // Loop structure (simplified S-curve) at columns 110-125
  // Upward ramp
  for (let c = 110; c <= 113; c++) {
    const r = 25 - (c - 110)
    grid[r][c] = 3
    for (let fill = r + 1; fill <= 25; fill++) {
      grid[fill][c] = 1
    }
  }
  // Top flat
  for (let c = 114; c <= 118; c++) {
    grid[21][c] = 2
    grid[22][c] = 1
    grid[23][c] = 1
    grid[24][c] = 1
    grid[25][c] = 1
  }
  // Downward ramp
  for (let c = 119; c <= 122; c++) {
    const r = 21 + (c - 119)
    grid[r][c] = 4
    for (let fill = r + 1; fill <= 25; fill++) {
      grid[fill][c] = 1
    }
  }

  // More terrain variation at end
  for (let c = 140; c <= 145; c++) {
    grid[24][c] = 9 // half-height platforms
  }

  const entities: EntitySpawn[] = [
    // Rings
    ...Array.from({ length: 5 }, (_, i) => ({
      type: 'ring',
      x: (35 + i * 2) * 16 + 8,
      y: 24 * 16,
    })),
    ...Array.from({ length: 8 }, (_, i) => ({
      type: 'ring',
      x: (53 + i * 0.5) * 16 + 8,
      y: 21 * 16,
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      type: 'ring',
      x: (70 + i) * 16 + 8,
      y: 19 * 16,
    })),
    // Enemies
    { type: 'crab', x: 45 * 16, y: 25 * 16 },
    { type: 'crab', x: 75 * 16, y: 25 * 16 },
    { type: 'bee', x: 65 * 16, y: 20 * 16 },
    { type: 'bee', x: 100 * 16, y: 20 * 16 },
    // Springs
    { type: 'spring', x: 88 * 16 + 8, y: 25 * 16, properties: { force: -10 } },
    { type: 'spring', x: 130 * 16 + 8, y: 25 * 16, properties: { force: -12 } },
  ]

  return {
    name: 'Green Hill',
    width: W,
    height: H,
    tileGrid: grid,
    entities,
    playerStart: { x: 3 * 16, y: 24 * 16 },
  }
}

export function createLevel2(): LevelDefinition {
  const W = 200
  const H = 30
  const grid: number[][] = []

  for (let r = 0; r < H; r++) {
    grid.push(emptyRow(W))
  }

  // Ground at row 25
  grid[25] = groundRow(W)
  for (let r = 26; r < H; r++) {
    grid[r] = solidRow(W)
  }

  // Industrial style: more vertical, tighter corridors

  // Staircase up at columns 15-25
  for (let step = 0; step < 5; step++) {
    const c = 15 + step * 2
    const r = 24 - step
    grid[r][c] = 2
    grid[r][c + 1] = 2
    for (let fill = r + 1; fill <= 25; fill++) {
      grid[fill][c] = 1
      grid[fill][c + 1] = 1
    }
  }

  // Elevated corridor (rows 20-21)
  for (let c = 25; c <= 45; c++) {
    grid[20][c] = 2
    for (let r = 21; r <= 25; r++) {
      grid[r][c] = 1
    }
  }

  // Drop shaft at 46-48
  for (let c = 46; c <= 48; c++) {
    for (let r = 20; r <= 25; r++) {
      grid[r][c] = 0
    }
  }

  // Speed ramp (45-degree slopes)
  for (let i = 0; i < 4; i++) {
    const c = 55 + i
    grid[25 - i][c] = 3
    for (let fill = 25 - i + 1; fill <= 25; fill++) {
      grid[fill][c] = 1
    }
  }
  for (let c = 59; c <= 65; c++) {
    grid[21][c] = 2
    for (let r = 22; r <= 25; r++) {
      grid[r][c] = 1
    }
  }
  for (let i = 0; i < 4; i++) {
    const c = 66 + i
    grid[21 + i][c] = 4
    for (let fill = 21 + i + 1; fill <= 25; fill++) {
      grid[fill][c] = 1
    }
  }

  // Floating platforms section (80-100)
  grid[22][82] = 2
  grid[22][83] = 2
  grid[20][88] = 2
  grid[20][89] = 2
  grid[18][94] = 2
  grid[18][95] = 2
  grid[18][96] = 2
  grid[20][100] = 2
  grid[20][101] = 2

  // Pit at 105-110
  for (let c = 105; c <= 110; c++) {
    for (let r = 25; r < 30; r++) {
      grid[r][c] = 0
    }
  }

  // Tunnel section (120-150): ceiling above ground
  for (let c = 120; c <= 150; c++) {
    grid[22][c] = 1 // ceiling
  }

  // Half-height platforms for variety
  for (let c = 160; c <= 165; c++) {
    grid[24][c] = 9
  }
  for (let c = 170; c <= 175; c++) {
    grid[23][c] = 9
  }

  const entities: EntitySpawn[] = [
    // Rings along elevated corridor
    ...Array.from({ length: 10 }, (_, i) => ({
      type: 'ring',
      x: (28 + i * 2) * 16 + 8,
      y: 19 * 16,
    })),
    // Rings on floating platforms
    ...Array.from({ length: 3 }, (_, i) => ({
      type: 'ring',
      x: (94 + i) * 16 + 8,
      y: 17 * 16,
    })),
    // Enemies
    { type: 'crab', x: 35 * 16, y: 20 * 16 },
    { type: 'crab', x: 130 * 16, y: 25 * 16 },
    { type: 'crab', x: 145 * 16, y: 25 * 16 },
    { type: 'bee', x: 85 * 16, y: 18 * 16 },
    { type: 'bee', x: 95 * 16, y: 16 * 16 },
    // Springs
    { type: 'spring', x: 49 * 16 + 8, y: 25 * 16, properties: { force: -12 } },
    { type: 'spring', x: 103 * 16 + 8, y: 25 * 16, properties: { force: -10 } },
    { type: 'spring', x: 112 * 16 + 8, y: 25 * 16, properties: { force: -10 } },
  ]

  return {
    name: 'Mechanical Plant',
    width: W,
    height: H,
    tileGrid: grid,
    entities,
    playerStart: { x: 3 * 16, y: 24 * 16 },
  }
}
