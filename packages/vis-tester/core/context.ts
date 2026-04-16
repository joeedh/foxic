import {
  buildToolSysAPI,
  Context,
  contextWrangler,
  DataAPI,
  ILockableCtx,
  PropertySaver,
  SavedToolDefaults,
  toLockedImpl,
  ToolPropertyCache,
} from 'path.ux'
import type { AppState } from './app'
import { CanvasEditor, Editor } from '../editors'
import { registerDataClass } from './register'
import { ITemplateDef, PropertiesBag } from './props'

function savePropertyForLocked(
  ctx: AppContext,
  name: string | symbol | number,
  value: unknown,
) {
  if (name === 'model' || value instanceof Editor) {
    return '$notlocked$'
  }
  return value
}

function loadPropertyForLocked(
  ctx: AppContext,
  name: string | symbol | number,
  value: unknown,
) {
  if (typeof value === 'string' && value === '$notlocked$') {
    return (ctx as any)[name]
  }
  return value
}

export class AppContext<
  DataModelRoot = unknown,
  SettingsTempl extends ITemplateDef = {},
> implements ILockableCtx {
  declare state: AppState<SettingsTempl, DataModelRoot>

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    st.dynamicStruct('last_tool', 'last_tool', 'Last Tool')
    st.struct(
      'propCache',
      'toolDefaults',
      'Tool Defaults',
      api.mapStruct(ToolPropertyCache),
    )
    st.dynamicStruct('model', 'model', 'Model')
    st.struct('canvas', 'canvas', 'Canvas', api.mapStruct(CanvasEditor))
    st.dynamicStruct('_settings', '_settings', 'Settings')

    PropertiesBag.defineAPI(api)
    
    buildToolSysAPI(api, true)
    return st
  }

  constructor(state: AppState<SettingsTempl, DataModelRoot>) {
    this.state = state
  }

  toLocked = toLockedImpl
  saveProperty = savePropertyForLocked
  loadProperty = loadPropertyForLocked

  get editor() {
    return Editor.getActiveArea()
  }

  get toolstack() {
    return this.state.toolstack
  }
  get screen() {
    return this.state.screen
  }
  get api() {
    return this.state.api
  }

  get toolDefaults() {
    return SavedToolDefaults.accessors
  }

  toolDefaults_save() {
    return SavedToolDefaults.accessors
  }

  toolDefaults_load() {
    return SavedToolDefaults.accessors
  }

  get propCache() {
    //used by datapath api
    return SavedToolDefaults
  }

  propCache_save() {
    return SavedToolDefaults
  }

  propCache_load(ctx: this, data: any) {
    return SavedToolDefaults
  }

  //used by UI code
  //refers to last executed *ToolOp*, don't confused with tool *modes*
  get last_tool() {
    return this.state.toolstack.head
  }

  public get model(): DataModelRoot {
    return this.state.model as unknown as DataModelRoot
  }

  public get canvas() {
    return contextWrangler.getLastArea(CanvasEditor)
  }

  get settings() {
    return this.state.settings.asFullyTypedBag
  }

  get _settings() {
    return this.state.settings
  }

  redraw_all() {
    //
  }
}

Context.register(AppContext)
registerDataClass(AppContext, false)
