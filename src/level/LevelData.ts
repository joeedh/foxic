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
  depthGrid?: number[][] // parallel to tileGrid, default 0
  entities: EntitySpawn[]
  playerStart: { x: number; y: number }
}

import { placeLoop } from './Tile'

// Tile IDs:
// 0 = air, 1 = dirt, 2 = grass, 3 = slope up-right 45, 4 = slope up-left 45
// 5 = gentle slope right low, 6 = gentle slope right high
// 7 = gentle slope left low, 8 = gentle slope left high
// 9 = half-height platform
// 100+ = loop tiles (generated)

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
  const depthGrid: number[][] = []

  // Fill with air
  for (let r = 0; r < H; r++) {
    grid.push(emptyRow(W))
    depthGrid.push(new Array(W).fill(0))
  }

  // --- Helper: set surface tile and fill dirt below to row 29 ---
  function setSurface(col: number, surfaceRow: number, tile: number) {
    grid[surfaceRow][col] = tile
    for (let r = surfaceRow + 1; r < H; r++) {
      grid[r][col] = 1
    }
  }

  // --- Helper: set grass surface with dirt fill ---
  function setGround(col: number, surfaceRow: number) {
    setSurface(col, surfaceRow, 2)
  }

  // --- Helper: clear a column (make pit) ---
  function clearColumn(col: number, fromRow: number, toRow: number) {
    for (let r = fromRow; r <= toRow; r++) {
      grid[r][col] = 0
    }
  }

  // =====================================================
  // ZONE A: Flat Intro (cols 0-19)
  // Calm, flat ground so the player learns to move/jump
  // =====================================================
  for (let c = 0; c < 20; c++) {
    setGround(c, 25)
  }

  // =====================================================
  // ZONE B: First Gentle Hills (cols 20-44)
  // Introduce gentle slopes - rolling terrain
  // =====================================================

  // Gentle slope up (cols 20-23): rise from row 25 to row 23
  setSurface(20, 25, 5) // gentle right low
  setSurface(21, 25, 6) // gentle right high
  setSurface(22, 24, 5) // gentle right low
  setSurface(23, 24, 6) // gentle right high

  // Flat hilltop (cols 24-28) at row 23
  for (let c = 24; c <= 28; c++) {
    setGround(c, 23)
  }

  // Gentle slope down (cols 29-32): row 23 back to 25
  setSurface(29, 23, 8) // gentle left high
  setSurface(30, 23, 7) // gentle left low
  setSurface(31, 24, 8) // gentle left high
  setSurface(32, 24, 7) // gentle left low

  // Short valley (cols 33-36) at row 25
  for (let c = 33; c <= 36; c++) {
    setGround(c, 25)
  }

  // Second gentle hill (cols 37-44): lower rise
  setSurface(37, 25, 5)
  setSurface(38, 25, 6)
  for (let c = 39; c <= 41; c++) {
    setGround(c, 24)
  }
  setSurface(42, 24, 8)
  setSurface(43, 24, 7)
  setGround(44, 25)

  // =====================================================
  // ZONE C: Steep Hill & Speed Ramp (cols 45-70)
  // Introduce 45-degree slopes, build speed downhill
  // =====================================================

  // Flat approach (cols 45-49)
  for (let c = 45; c <= 49; c++) {
    setGround(c, 25)
  }

  // Steep 45-degree climb (cols 50-53): row 25 up to row 21
  for (let i = 0; i < 4; i++) {
    setSurface(50 + i, 24 - i, 3)
  }

  // Hilltop plateau (cols 54-58) at row 21
  for (let c = 54; c <= 58; c++) {
    setGround(c, 21)
  }

  // Steep 45-degree descent (cols 59-62): row 21 down to 25
  for (let i = 0; i < 4; i++) {
    setSurface(59 + i, 22 + i, 4)
  }

  // Speed valley leads into loop (cols 63-66)
  for (let c = 63; c <= 66; c++) {
    setGround(c, 25)
  }

  // === LOOP (centered at col 71, row 22) ===
  // Inner radius 48px = 3 tiles, outer radius 64px = 4 tiles
  // Center at row 22 so bottom inner surface aligns with
  // ground level (row 25)
  // Clear the loop area first (cols 66-76, rows 17-27)
  for (let r = 17; r <= 27; r++) {
    for (let c = 66; c <= 76; c++) {
      grid[r][c] = 0
    }
  }
  placeLoop(grid, depthGrid, 71, 22, 1, 48, 64)
  // Ground continues through the loop (the floor)
  for (let c = 66; c <= 76; c++) {
    setGround(c, 25)
  }
  // Extra ground tiles on the exit side
  setGround(77, 25)

  // =====================================================
  // ZONE D: Floating Platforms & First Pit (cols 78-95)
  // Teach jumping precision, introduce springs
  // =====================================================

  // Ground continues (cols 78-77 already set, 78 onward)
  // (no gap needed — 76-77 lead into Zone D)

  // Spring platform before the pit (col 78)
  setGround(78, 25)

  // First pit (cols 79-84) -- 6 tiles wide
  for (let c = 79; c <= 84; c++) {
    clearColumn(c, 25, 29)
  }

  // Landing area (cols 85-89)
  for (let c = 85; c <= 89; c++) {
    setGround(c, 25)
  }

  // Floating platforms above (cols 80-88)
  // Low platform over the pit
  for (let c = 80; c <= 82; c++) {
    grid[22][c] = 2
  }
  // Higher platform
  for (let c = 85; c <= 87; c++) {
    grid[19][c] = 2
  }
  // Even higher secret platform
  grid[16][89] = 2
  grid[16][90] = 2

  // Ground continues (cols 90-95)
  for (let c = 90; c <= 95; c++) {
    setGround(c, 25)
  }

  // =====================================================
  // ZONE E: Underground Tunnel (cols 96-120)
  // Ceiling creates enclosed feel, crabs patrol inside
  // =====================================================

  // Ground through tunnel
  for (let c = 96; c <= 120; c++) {
    setGround(c, 25)
  }

  // Tunnel ceiling (row 21) and walls
  for (let c = 98; c <= 118; c++) {
    grid[21][c] = 1
  }
  // Tunnel entrance slope (ceiling tapers)
  grid[22][96] = 1
  grid[22][97] = 1
  grid[21][97] = 1
  // Tunnel exit slope
  grid[22][119] = 1
  grid[22][120] = 1
  grid[21][119] = 1

  // Interior variation: small dip in tunnel floor
  setSurface(106, 26, 2)
  grid[25][106] = 0
  setSurface(107, 26, 2)
  grid[25][107] = 0
  setSurface(108, 26, 2)
  grid[25][108] = 0

  // Half-height platforms inside tunnel as obstacles
  grid[24][102] = 9
  for (let r = 25; r < H; r++) grid[r][102] = 1
  grid[24][112] = 9
  for (let r = 25; r < H; r++) grid[r][112] = 1

  // =====================================================
  // ZONE F: Elevation Climb (cols 121-145)
  // Multi-tier terrain with mixed slope types
  // =====================================================

  // Flat exit from tunnel (cols 121-124)
  for (let c = 121; c <= 124; c++) {
    setGround(c, 25)
  }

  // Gentle slope up (cols 125-128): 25 -> 23
  setSurface(125, 25, 5)
  setSurface(126, 25, 6)
  setSurface(127, 24, 5)
  setSurface(128, 24, 6)

  // Mid plateau (cols 129-131) at row 23
  for (let c = 129; c <= 131; c++) {
    setGround(c, 23)
  }

  // Steep climb (cols 132-134): 23 -> 20
  for (let i = 0; i < 3; i++) {
    setSurface(132 + i, 22 - i, 3)
  }

  // Upper plateau (cols 135-140) at row 20
  for (let c = 135; c <= 140; c++) {
    setGround(c, 20)
  }

  // Steep descent (cols 141-144): 20 -> 24
  for (let i = 0; i < 4; i++) {
    setSurface(141 + i, 21 + i, 4)
  }

  // Landing (col 145)
  setGround(145, 25)

  // =====================================================
  // ZONE G: Platform Gauntlet (cols 146-170)
  // Floating platforms, bees, springs -- the test zone
  // =====================================================

  // Ground with second pit (cols 146-148 ground, 149-156 pit)
  for (let c = 146; c <= 148; c++) {
    setGround(c, 25)
  }
  for (let c = 149; c <= 156; c++) {
    clearColumn(c, 25, 29)
  }
  // Landing (cols 157-160)
  for (let c = 157; c <= 160; c++) {
    setGround(c, 25)
  }

  // Floating stepping-stone platforms over the pit
  grid[23][150] = 2
  grid[23][151] = 2
  grid[21][153] = 2
  grid[21][154] = 2
  grid[23][156] = 2

  // Upper path: floating platforms (cols 160-170)
  for (let c = 162; c <= 164; c++) {
    grid[20][c] = 2
  }
  for (let c = 167; c <= 169; c++) {
    grid[18][c] = 2
  }

  // Ground continues (cols 161-170)
  for (let c = 161; c <= 170; c++) {
    setGround(c, 25)
  }

  // Half-height platforms as stepping stones
  grid[23][163] = 9
  grid[22][166] = 9

  // =====================================================
  // ZONE H: Final Run (cols 171-199)
  // Downhill speed section to the finish
  // =====================================================

  // Small rise (cols 171-173)
  setSurface(171, 25, 5)
  setSurface(172, 25, 6)
  setGround(173, 24)

  // Long gentle downhill (cols 174-179)
  setSurface(174, 24, 8)
  setSurface(175, 24, 7)
  for (let c = 176; c <= 179; c++) {
    setGround(c, 25)
  }

  // Final rolling hills (cols 180-189)
  setSurface(180, 25, 5)
  setSurface(181, 25, 6)
  setGround(182, 24)
  setGround(183, 24)
  setSurface(184, 24, 8)
  setSurface(185, 24, 7)
  setGround(186, 25)
  setSurface(187, 25, 5)
  setSurface(188, 25, 6)
  setGround(189, 24)

  // Flat finish area (cols 190-199)
  for (let c = 190; c <= 199; c++) {
    setGround(c, 25)
  }
  // Also fill the gentle hill top at 189
  setSurface(189, 24, 2)

  // =====================================================
  // ENTITIES
  // =====================================================
  const entities: EntitySpawn[] = [
    // --- RINGS ---

    // Zone A: Intro rings - simple line to collect (cols 8-14)
    ...Array.from({ length: 4 }, (_, i) => ({
      type: 'ring' as const,
      x: (8 + i * 2) * 16 + 8,
      y: 24 * 16,
    })),

    // Zone B: Rings along first hilltop (cols 24-28)
    ...Array.from({ length: 3 }, (_, i) => ({
      type: 'ring' as const,
      x: (25 + i * 2) * 16 + 8,
      y: 22 * 16,
    })),

    // Zone B: Rings on second small hill
    { type: 'ring', x: 40 * 16 + 8, y: 23 * 16 },

    // Zone C: Ring arc over steep hilltop (cols 54-58)
    ...Array.from({ length: 5 }, (_, i) => ({
      type: 'ring' as const,
      x: (54 + i) * 16 + 8,
      y: 20 * 16,
    })),

    // Zone D: Rings on floating platforms
    ...Array.from({ length: 3 }, (_, i) => ({
      type: 'ring' as const,
      x: (80 + i) * 16 + 8,
      y: 21 * 16,
    })),
    // Secret high rings
    { type: 'ring', x: 89 * 16 + 8, y: 15 * 16 },
    { type: 'ring', x: 90 * 16 + 8, y: 15 * 16 },

    // Zone E: Rings inside tunnel (cols 100-116)
    ...Array.from({ length: 4 }, (_, i) => ({
      type: 'ring' as const,
      x: (101 + i * 4) * 16 + 8,
      y: 24 * 16,
    })),

    // Zone F: Rings along the climb
    ...Array.from({ length: 3 }, (_, i) => ({
      type: 'ring' as const,
      x: (136 + i * 2) * 16 + 8,
      y: 19 * 16,
    })),

    // Zone G: Rings on stepping stones
    { type: 'ring', x: 150 * 16 + 8, y: 22 * 16 },
    { type: 'ring', x: 153 * 16 + 8, y: 20 * 16 },

    // Zone G: Rings on upper platforms
    { type: 'ring', x: 163 * 16 + 8, y: 19 * 16 },
    { type: 'ring', x: 168 * 16 + 8, y: 17 * 16 },

    // Zone H: Finish line rings
    ...Array.from({ length: 3 }, (_, i) => ({
      type: 'ring' as const,
      x: (194 + i * 2) * 16 + 8,
      y: 24 * 16,
    })),

    // --- ENEMIES ---
    /* disabled during testing of loop de loops
    // Crab 1: flat area before first hill (safe, telegraphed)
    { type: 'crab', x: 16 * 16, y: 25 * 16 },

    // Crab 2: valley between hills
    { type: 'crab', x: 35 * 16, y: 25 * 16 },

    // Crab 3: inside tunnel (enclosed, tense)
    { type: 'crab', x: 110 * 16, y: 25 * 16 },

    // Crab 4: near the end, on flat ground
    { type: 'crab', x: 178 * 16, y: 25 * 16 },

    // Bee 1: above the speed valley
    { type: 'bee', x: 66 * 16, y: 21 * 16 },

    // Bee 2: over the platform gauntlet
    { type: 'bee', x: 155 * 16, y: 19 * 16 },

    // Bee 3: guarding upper path
    { type: 'bee', x: 165 * 16, y: 17 * 16 },

    // --- SPRINGS ---

    // Spring 1: before the first pit, launches over it
    {
      type: 'spring',
      x: 78 * 16 + 8,
      y: 25 * 16,
      properties: { force: -10 },
    },

    // Spring 2: inside tunnel, launches to ceiling height
    {
      type: 'spring',
      x: 104 * 16 + 8,
      y: 25 * 16,
      properties: { force: -8 },
    },

    // Spring 3: at the second pit, launches across
    {
      type: 'spring',
      x: 148 * 16 + 8,
      y: 25 * 16,
      properties: { force: -12 },
    },

    // Spring 4: launches to upper floating platforms
    {
      type: 'spring',
      x: 161 * 16 + 8,
      y: 25 * 16,
      properties: { force: -14 },
    },
    */

    // --- DEPTH TRIGGERS for loop ---
    // Left trigger (enter loop going right, or exit going left)
    {
      type: 'depthTrigger',
      x: 67 * 16 + 8,
      y: 24 * 16,
      properties: { fromDepth: 0, toDepth: 1 },
    },
    // Right trigger (exit loop going right, or enter going left)
    {
      type: 'depthTrigger',
      x: 74 * 16 + 8,
      y: 24 * 16,
      properties: { fromDepth: 0, toDepth: 1 },
    },
  ]

  return {
    name: 'Green Hill',
    width: W,
    height: H,
    tileGrid: grid,
    depthGrid,
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
