import { GenerativeAsset } from "./GenerativeAsset"

// data for all generative assets live here (for now)
export const GenerativeAssets: GenerativeAsset[] = [
  {
    name: "player_spritesheet",
    purpose: "character",
    prompt: "A 4x2 sprite sheet of a cartoon blue fox character with white-tipped tail, orange eyes, green belt buckle, and black boots on a magenta background. Top row: standing idle, three running poses with arms and legs in motion. Bottom row: curled into a spin ball, crouching low, skidding with dust particles at feet, pushing forward with arms extended. Side view, pixel art style with clean outlines.",
    promptHistory: [
      "A 4x2 sprite sheet of a cartoon blue hedgehog platformer character on a magenta background. Frames: idle, run1, run2, run3, jump, crouch, skid, push. Side view, pixel art style."
    ],
    outputFile: "/assets/sprites/player_spritesheet.jpg",
    width: 2752,
    height: 1536,
  },
  {
    name: "enemies_spritesheet",
    purpose: "character",
    prompt: "A 3x2 sprite sheet of platformer enemies on a magenta background. Top row: three walking animation frames of a red crab enemy with large pincers, dark legs, and a glossy rounded shell. Bottom row: three flying animation frames of a chubby yellow-orange bee enemy with translucent white wings, black antennae, striped abdomen, and a cheerful face. Side view, pixel art style with clean outlines.",
    promptHistory: [
      "A 3x2 sprite sheet of platformer enemies on a magenta background. Top row: three frames of a walking crab enemy. Bottom row: three frames of a flying bee enemy. Side view, cartoon style."
    ],
    outputFile: "/assets/sprites/enemies_spritesheet.jpg",
    width: 1376,
    height: 768,
  },
  {
    name: "items_spritesheet",
    purpose: "character",
    prompt: "A 4x2 sprite sheet of platformer collectible items on a magenta background. Top row: four rotation frames of a thick golden ring showing front, three-quarter, edge-on, and back views with shiny metallic shading. Bottom row: yellow coil spring compressed, yellow coil spring extended/stretched, red coil spring compressed, red coil spring extended/stretched. Pixel art style with clean outlines.",
    promptHistory: [
      "A 4x2 sprite sheet of platformer collectible items on a magenta background. Top row: four frames of a spinning golden ring. Bottom row: yellow compressed spring, yellow extended spring, red compressed spring, red extended spring. Cartoon style."
    ],
    outputFile: "/assets/sprites/items_spritesheet.jpg",
    width: 1376,
    height: 768,
  },
  {
    name: "bg_greenhill",
    purpose: "background",
    prompt: "A vibrant three-layer parallax scrolling background for a Green Hill Zone style platformer level, divided into labeled horizontal bands. Top third: bright blue sky with large fluffy white cumulus clouds and distant birds. Middle third: rolling green hills receding into the distance with rows of dark green conifer/pine trees along the horizon. Bottom third: lush foreground with green bushes, tall grass, small white daisies, and orange wildflowers. Pixel art style, vivid saturated greens and blues.",
    promptHistory: [
      "A vibrant parallax scrolling background for a Green Hill Zone style platformer level. Lush green hills, blue sky, checkered brown earth, palm trees, flowers. Bright and colorful cartoon style."
    ],
    outputFile: "/assets/backgrounds/bg_greenhill.jpg",
    width: 2752,
    height: 1536,
  },
  {
    name: "bg_industrial",
    purpose: "background",
    prompt: "A three-layer parallax scrolling background for a dark industrial zone platformer level. Top layer: stormy dark grey sky with billowing smoke and distant factory smokestacks and spires. Middle layer: dense network of interlocking metal pipes, large iron gears/cogs, and glowing orange furnace lights against dark steel walls. Bottom layer: a metal platform walkway with hanging chains, riveted steel beams, and white steam vents releasing puffs of vapor. Dark moody palette of charcoal grey, rust brown, and warm orange glow. Pixel art style.",
    promptHistory: [
      "A parallax scrolling background for an industrial zone platformer level. Metal pipes, gears, riveted steel walls, steam vents, dark moody atmosphere with orange and grey tones. Cartoon style."
    ],
    outputFile: "/assets/backgrounds/bg_industrial.jpg",
    width: 2752,
    height: 1536,
  },
  {
    name: "tileset_greenhill",
    purpose: "tilemap",
    prompt: "A 5x2 tileset grid for a Green Hill Zone style platformer on a black background with 40px border between tiles. Top row left-to-right: solid brown earth block with grass turf on top, solid brown earth block with grass on top, brown earth right-slope with grass on the diagonal surface, tan/beige stone brick block, empty black tile. Bottom row left-to-right: brown earth left-slope with grass on the diagonal, brown earth gentle-right-slope with grass, brown earth steep-left-slope with grass, empty black tile, empty black tile. Earth has layered sediment lines in varying brown tones. Pixel art style.",
    promptHistory: [
      "A 5x2 tileset grid for a Green Hill Zone style platformer. Grass-topped earth tiles, underground dirt tiles, slope tiles, and an empty tile. Lush green and brown earth tones, cartoon style. 40px border between tiles."
    ],
    outputFile: "/assets/tiles/tileset_greenhill.jpg",
    width: 1584,
    height: 672,
  },
  {
    name: "tileset_industrial",
    purpose: "tilemap",
    prompt: "A 5x2 tileset grid for an industrial zone platformer on a black background with 40px border between tiles. Top row left-to-right: dark grey riveted steel block with rectangular panel insets, grey metal grate tile with yellow-and-black hazard chevron stripes, right-slope triangle of dark steel with yellow-black hazard stripes along the diagonal edge, left-slope with hazard stripe on diagonal, dark metal ventilation grate with riveted border. Bottom row left-to-right: gentle right-slope with yellow-black hazard stripes, steep left-slope dark steel with hazard stripes, gentle left-slope with hazard stripes, empty black tile, empty black tile. Pixel art style, dark gunmetal grey and yellow-black caution stripe accents.",
    promptHistory: [
      "A 5x2 tileset grid for an industrial zone platformer. Metal platform tiles, riveted steel tiles, pipe tiles, and an empty tile. Grey and orange metallic tones, cartoon style. 40px border between tiles."
    ],
    outputFile: "/assets/tiles/tileset_industrial.jpg",
    width: 1584,
    height: 672,
  },
]
