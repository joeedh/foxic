import { AppState } from '@gametest/vis-tester-base/core/app'
import { TexGenFile } from './model'
import { SettingsTemplate } from './settings'
import { TexGenContext } from './context'
import './meshtool'

export class TexGenApp extends AppState<
  typeof SettingsTemplate,
  TexGenFile,
  TexGenContext
> {
  readonly localStorageKey = 'TEST1'
  readonly version = [0, 0, 1] as const
  readonly saveStartupOnSettingsChange = true

  constructor() {
    super(TexGenContext, SettingsTemplate)
  }

  createModel() {
    return new TexGenFile()
  }

  getFileVersion() {
    return [0, 0, 1] as const
  }
}

declare global {
  interface Window {
    _appstate: TexGenApp
  }
  const _appstate: TexGenApp
}

export function start() {
  console.log('start app!')
  window._appstate = new TexGenApp()
  window._appstate.start()
}
