import { WebGLRenderer } from "./rendering/WebGLRenderer"
import { SCREEN_WIDTH, SCREEN_HEIGHT } from "./constants"
import { initInput, pollInput } from "./input"
import { GameLoop } from "./core/GameLoop"
import { SceneManager } from "./scenes/SceneManager"
import { TitleScene } from "./scenes/TitleScene"
import { GameScene } from "./scenes/GameScene"
import { createLevel1, createLevel2 } from "./level/LevelData"
import { loadAllAssets } from "./rendering/AssetLoader"

async function init() {
  const renderer = new WebGLRenderer(SCREEN_WIDTH, SCREEN_HEIGHT, [
    0x20 / 255,
    0x80 / 255,
    0xff / 255,
  ])
  document.body.appendChild(renderer.canvas)

  await loadAllAssets(renderer)

  initInput()

  const sceneManager = new SceneManager(renderer)

  const levels = [createLevel1(), createLevel2()]
  let currentLevel = 0

  function startLevel(index: number) {
    currentLevel = index
    const scene = new GameScene(
      levels[index],
      () => {
        if (currentLevel + 1 < levels.length) {
          startLevel(currentLevel + 1)
        } else {
          showTitle()
        }
      },
      renderer,
    )
    sceneManager.switchTo(scene)
  }

  function showTitle() {
    const title = new TitleScene(() => {
      startLevel(0)
    }, renderer)
    sceneManager.switchTo(title)
  }

  showTitle()

  const loop = new GameLoop(
    (dt) => {
      pollInput()
      sceneManager.update(dt)
    },
    (interpolation) => {
      renderer.begin()
      sceneManager.render(interpolation)
      renderer.end()
    },
  )

  loop.start()
}

init()
