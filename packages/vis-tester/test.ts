import { DataAPI, nstructjs } from 'path.ux'
import { AppState } from './core/app'
import { AppContext } from './core/context'
import { registerDataClass } from './core/register'

class MyModel {
  static STRUCT = nstructjs.inlineRegister(
    this,
    `
    MyModel {
      prop1 : string;
      prop2 : float;
    }`,
  )
  prop1 = ''
  prop2 = 0

  static defineAPI(api: DataAPI) {
    const st = api.mapStruct(this)
    st.string('prop1', 'prop1')
    st.float('prop2', 'prop2')
  }
}
registerDataClass(MyModel)

class MyContext extends AppContext {
  //
}

export class AppTest extends AppState<MyModel> {
  readonly localStorageKey = 'TEST1'
  readonly version = [0, 0, 1] as const

  constructor() {
    super(MyContext)
  }

  createModel() {
    return new MyModel()
  }

  getFileVersion() {
    return [0, 0, 1] as const
  }
}

declare global {
  interface Window {
    _appstate: AppTest
  }
  const _appstate: AppTest
}

export function start() {
  console.log('start app!')
  window._appstate = new AppTest()
  window._appstate.start()
}
