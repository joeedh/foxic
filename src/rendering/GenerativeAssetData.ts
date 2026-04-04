import { GenerativeAsset } from "./GenerativeAsset"

// data for all generative assets live here (for now)
export const GenerativeAssets: GenerativeAsset[] = [
  {
    name: "player_spritesheet",
    purpose: "character",
    prompt: {
      prompt:
        "A 4x2 sprite sheet of a cartoon blue fox character with white-tipped tail, orange eyes, green belt buckle, and black boots on a magenta background. Top row: standing idle, three running poses with arms and legs in motion. Bottom row: curled into a spin ball, crouching low, skidding with dust particles at feet, pushing forward with arms extended. Side view, pixel art style with clean outlines.",
    },
    promptHistory: [
      {
        prompt:
          "A 4x2 sprite sheet of a cartoon blue hedgehog platformer character on a magenta background. Frames: idle, run1, run2, run3, jump, crouch, skid, push. Side view, pixel art style.",
      },
    ],
    outputFile: "/assets/sprites/player_spritesheet.jpg",
    width: 2752,
    height: 1536,
  },
  {
    name: "enemies_spritesheet",
    purpose: "character",
    prompt: {
      prompt:
        "A 3x2 sprite sheet of platformer enemies on a magenta background. Top row: three walking animation frames of a red crab enemy with large pincers, dark legs, and a glossy rounded shell. Bottom row: three flying animation frames of a chubby yellow-orange bee enemy with translucent white wings, black antennae, striped abdomen, and a cheerful face. Side view, pixel art style with clean outlines.",
    },
    promptHistory: [
      {
        prompt:
          "A 3x2 sprite sheet of platformer enemies on a magenta background. Top row: three frames of a walking crab enemy. Bottom row: three frames of a flying bee enemy. Side view, cartoon style.",
      },
    ],
    outputFile: "/assets/sprites/enemies_spritesheet.jpg",
    width: 1376,
    height: 768,
  },
  {
    name: "items_spritesheet",
    purpose: "character",
    prompt: {
      prompt:
        "A 4x2 sprite sheet of platformer collectible items on a magenta background. Top row: four rotation frames of a thick golden ring showing front, three-quarter, edge-on, and back views with shiny metallic shading. Bottom row: yellow coil spring compressed, yellow coil spring extended/stretched, red coil spring compressed, red coil spring extended/stretched. Pixel art style with clean outlines.",
    },
    promptHistory: [
      {
        prompt:
          "A 4x2 sprite sheet of platformer collectible items on a magenta background. Top row: four frames of a spinning golden ring. Bottom row: yellow compressed spring, yellow extended spring, red compressed spring, red extended spring. Cartoon style.",
      },
    ],
    outputFile: "/assets/sprites/items_spritesheet.jpg",
    width: 1376,
    height: 768,
  },
  {
    name: "bg_greenhill",
    purpose: "background",
    prompt: {
      prompt:
        "A vibrant three-layer parallax scrolling background for a Green Hill Zone style platformer level, divided into labeled horizontal bands. Top third: bright blue sky with large fluffy white cumulus clouds and distant birds. Middle third: rolling green hills receding into the distance with rows of dark green conifer/pine trees along the horizon. Bottom third: lush foreground with green bushes, tall grass, small white daisies, and orange wildflowers. Pixel art style, vivid saturated greens and blues.",
    },
    promptHistory: [
      {
        prompt:
          "A vibrant parallax scrolling background for a Green Hill Zone style platformer level. Lush green hills, blue sky, checkered brown earth, palm trees, flowers. Bright and colorful cartoon style.",
      },
    ],
    outputFile: "/assets/backgrounds/bg_greenhill.jpg",
    width: 2752,
    height: 1536,
  },
  {
    name: "bg_industrial",
    purpose: "background",
    prompt: {
      prompt:
        "A three-layer parallax scrolling background for a dark industrial zone platformer level. Top layer: stormy dark grey sky with billowing smoke and distant factory smokestacks and spires. Middle layer: dense network of interlocking metal pipes, large iron gears/cogs, and glowing orange furnace lights against dark steel walls. Bottom layer: a metal platform walkway with hanging chains, riveted steel beams, and white steam vents releasing puffs of vapor. Dark moody palette of charcoal grey, rust brown, and warm orange glow. Pixel art style.",
    },
    promptHistory: [
      {
        prompt:
          "A parallax scrolling background for an industrial zone platformer level. Metal pipes, gears, riveted steel walls, steam vents, dark moody atmosphere with orange and grey tones. Cartoon style.",
      },
    ],
    outputFile: "/assets/backgrounds/bg_industrial.jpg",
    width: 2752,
    height: 1536,
  },
  {
    name: "tileset_greenhill",
    purpose: "tilemap",
    prompt: {
      prompt:
        "A 5x3 tileset grid for a Green Hill Zone style platformer on a bright magenta (#FF00FF) background with 40px magenta border between tiles. CRITICAL: every tile must fill its cell edge-to-edge with NO internal margins. Solid blocks fill the entire cell. Slope tiles have earth reaching all the way to the cell edges where solid, with only the triangular empty area being magenta. ALL tiles use the EXACT SAME brown earth color. Flat tiles must be seamlessly tileable. ALL slope and platform tiles have bright green grass blades along their top/diagonal surface, matching the grass style on the flat grass tile. Top row left-to-right: solid brown earth block WITHOUT grass (underground dirt with horizontal sediment lines), solid brown earth block with bright green grass turf on top, brown earth right-slope triangle with green grass along the diagonal surface (earth fills from bottom-left corner to top-right corner touching all three edges, empty triangle is magenta), brown earth left-slope triangle with green grass along the diagonal surface (earth fills from top-left corner to bottom-right corner touching all three edges, empty triangle is magenta), half-height brown earth platform filling the BOTTOM HALF of the tile with grass on top edge and magenta above. Second row left-to-right: gentle right-slope low with grass on diagonal (earth triangle from bottom-left corner to half-height at right edge touching bottom and both sides), gentle right-slope high with grass on diagonal (earth from half-height at left edge rising to full height at right filling bottom), gentle left-slope high with grass on diagonal (earth from full height at left descending to half-height at right filling bottom), gentle left-slope low with grass on diagonal (earth triangle from half-height at left descending to bottom-right corner), empty magenta tile. Third row (VERY SUBTLE variants, nearly identical to row 1): three solid earth blocks without grass using EXACT same brown with only tiny shifts in sediment lines; two grass-topped earth blocks with SAME tall grass style and only slightly shifted blade positions. Pixel art style.",
    },
    promptHistory: [
      {
        prompt:
          "A 5x3 tileset grid for a Green Hill Zone style platformer on a bright magenta (#FF00FF) background with 40px magenta border between tiles. All empty space must be pure magenta. All tiles use the SAME brown earth color palette and must look cohesive when placed next to each other. Slope and platform tiles have smooth, clean diagonal edges against the magenta background with no jagged stair-stepping. Top row left-to-right: solid brown earth block WITHOUT grass (plain underground dirt with horizontal sediment lines), solid brown earth block with bright green grass turf on top and the same brown earth below, brown earth right-slope triangle with grass on the diagonal (solid fills from bottom-left corner to top-right corner with smooth diagonal edge), brown earth left-slope triangle with grass on the diagonal (solid fills from top-left corner to bottom-right corner with smooth diagonal edge), half-height brown earth platform block filling only the bottom half of the tile with grass on top. Second row left-to-right: brown earth gentle right-slope (triangle from nothing at left edge rising to half-height at right edge) with grass on diagonal, brown earth gentle right-slope high (solid from half-height at left rising to full height at right) with grass on diagonal, brown earth gentle left-slope high (solid from full height at left descending to half-height at right) with grass on diagonal, brown earth gentle left-slope low (triangle from half-height at left descending to nothing at right edge) with grass on diagonal, empty magenta tile. Third row (subtle variants for visual variety, MUST use identical colors and style as row 1): three solid brown earth blocks WITHOUT grass with the same base color but slightly shifted sediment line positions and minor small cracks; two solid brown earth blocks with grass turf on top with slightly different grass blade positions but same green color and same earth underneath. All tiles must seamlessly tile together. Pixel art style.",
      },
    ],
    outputFile: "/assets/tiles/tileset_greenhill.jpg",
    width: 1584,
    height: 1008,
  },
  {
    name: "tileset_industrial",
    purpose: "tilemap",
    prompt: {
      prompt:
        "A 5x3 tileset grid for an industrial zone platformer on a bright magenta (#FF00FF) background with 40px magenta border between tiles. CRITICAL: every tile must fill its cell edge-to-edge with NO internal margins. Solid blocks fill the entire cell. Slope tiles have steel reaching all the way to the cell edges where solid, with only the triangular empty area being magenta. All tiles use the SAME dark gunmetal grey palette. Flat tiles must be seamlessly tileable. Top row left-to-right: dark grey riveted steel block with rectangular panel insets (fills entire cell), grey metal grate tile with yellow-and-black hazard chevron stripes (fills entire cell), right-slope triangle of dark steel with hazard stripes on diagonal (steel fills from bottom-left to top-right corner touching all three edges, empty triangle is magenta), left-slope triangle of dark steel with hazard stripe on diagonal (steel fills from top-left to bottom-right corner touching all three edges), half-height dark metal platform filling the BOTTOM HALF of the tile with riveted top edge and magenta above. Second row left-to-right: gentle right-slope low (steel triangle from bottom-left to half-height at right, touching bottom and both sides), gentle right-slope high (steel from half-height at left rising to full height at right, filling bottom), gentle left-slope high (steel from full height at left descending to half-height at right, filling bottom), gentle left-slope low (steel triangle from half-height at left descending to bottom-right corner), empty magenta tile. Third row (VERY SUBTLE variants, must look nearly identical to row 1): three steel blocks with EXACT same grey palette with only tiny shifts in rivet positions; two grate tiles with SAME hazard stripe style with only slightly shifted stripe positions. Pixel art style, dark gunmetal grey and yellow-black accents.",
    },
    promptHistory: [
      {
        prompt:
          "A 5x3 tileset grid for an industrial zone platformer on a bright magenta (#FF00FF) background with 40px magenta border between tiles. All empty space must be pure magenta. All tiles use the SAME dark gunmetal grey color palette and must look cohesive when placed next to each other. Slope and platform tiles have smooth, clean diagonal edges against the magenta background with no jagged stair-stepping. Top row left-to-right: dark grey riveted steel block with rectangular panel insets, grey metal grate tile with yellow-and-black hazard chevron stripes, right-slope triangle of dark steel with yellow-black hazard stripes along the diagonal edge (solid fills from bottom-left to top-right with smooth diagonal edge), left-slope triangle of dark steel with hazard stripe on diagonal (solid fills from top-left to bottom-right with smooth diagonal edge), half-height dark metal platform filling only the bottom half of the tile with riveted top edge. Second row left-to-right: gentle right-slope low (triangle from nothing at left to half-height at right) with hazard stripes, gentle right-slope high (solid from half-height at left rising to full height at right) with hazard stripes, gentle left-slope high (solid from full height at left descending to half-height at right) with hazard stripes, gentle left-slope low (triangle from half-height at left descending to nothing at right) with hazard stripes, empty magenta tile. Third row (subtle variants for visual variety, MUST use identical colors and style as row 1): three dark grey riveted steel blocks with the same base color but slightly different rivet positions and minor surface scratches; two grey metal grate tiles with yellow-and-black hazard chevron stripes with slightly shifted stripe positions but same colors. All tiles must seamlessly tile together. Pixel art style, dark gunmetal grey and yellow-black caution stripe accents.",
      },
    ],
    outputFile: "/assets/tiles/tileset_industrial.jpg",
    width: 1584,
    height: 1008,
  },
]
