import { Application } from "pixi.js"
import { SCREEN_WIDTH, SCREEN_HEIGHT } from "./constants"
import { initInput, pollInput } from "./input"
import { GameLoop } from "./core/GameLoop"
import { SceneManager } from "./scenes/SceneManager"
import { TitleScene } from "./scenes/TitleScene"
import { GameScene } from "./scenes/GameScene"
import { createLevel1, createLevel2 } from "./level/LevelData"
import { loadAllAssets } from "./rendering/SpriteManager"

async function init() {
  const app = new Application()
  await app.init({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    background: 0x2080ff,
    antialias: false,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  })
  document.body.appendChild(app.canvas)

  // Load all sprite and background assets before starting
  await loadAllAssets()

  initInput()

  const sceneManager = new SceneManager(app)

  const levels = [createLevel1(), createLevel2()]
  let currentLevel = 0

  function startLevel(index: number) {
    currentLevel = index
    const scene = new GameScene(levels[index], () => {
      // Level complete
      if (currentLevel + 1 < levels.length) {
        startLevel(currentLevel + 1)
      } else {
        // All levels done, back to title
        showTitle()
      }
    })
    sceneManager.switchTo(scene)
  }

  function showTitle() {
    const title = new TitleScene(() => {
      startLevel(0)
    })
    sceneManager.switchTo(title)
  }

  showTitle()

  const loop = new GameLoop(
    (dt) => {
      pollInput()
      sceneManager.update(dt)
    },
    (interpolation) => sceneManager.render(interpolation),
  )

  loop.start()
}

init()
