import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants'
import { justPressed, Action } from '../input'
import type { Scene } from './SceneManager'
import { TextRenderer, type TextStyleDef } from '../rendering/TextRenderer'
import type { WebGLRenderer } from '../rendering/WebGLRenderer'

const titleStyle: TextStyleDef = {
  fontFamily : 'monospace',
  fontSize   : 36,
  fill       : '#0060ff',
  fontWeight : 'bold',
  stroke     : '#ffffff',
  strokeWidth: 4,
}

const pressStyle: TextStyleDef = {
  fontFamily: 'monospace',
  fontSize  : 18,
  fill      : '#ffffff',
}

const controlsStyle: TextStyleDef = {
  fontFamily: 'monospace',
  fontSize  : 12,
  fill      : '#cccccc',
}

export class TitleScene implements Scene {
  private onStart: () => void
  private blinkTimer = 0
  private textRenderer: TextRenderer

  constructor(onStart: () => void, renderer: WebGLRenderer) {
    this.onStart = onStart
    this.textRenderer = new TextRenderer(renderer)
  }

  enter() {}
  exit() {}

  update(_dt: number) {
    this.blinkTimer++
    if (justPressed(Action.Jump)) {
      this.onStart()
    }
  }

  render(_interpolation: number, _renderer: WebGLRenderer) {
    this.textRenderer.drawText(
      'SONIC PLATFORMER',
      titleStyle,
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 3,
      0.5,
      0.5,
    )

    if (Math.floor(this.blinkTimer / 30) % 2 === 0) {
      this.textRenderer.drawText(
        'PRESS SPACE TO START',
        pressStyle,
        SCREEN_WIDTH / 2,
        SCREEN_HEIGHT * 0.6,
        0.5,
        0.5,
      )
    }

    this.textRenderer.drawText(
      'ARROWS / WASD: Move    SPACE / Z: Jump    DOWN + JUMP: Spin Dash',
      controlsStyle,
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT * 0.8,
      0.5,
      0.5,
    )
  }
}
