import { DataAPI, DataStruct, nstructjs } from 'path.ux'

export interface IDataClass {
  defineAPI(api: DataAPI): DataStruct | void
  STRUCT?: string
}

export const DataModelClasses: IDataClass[] = []
export function registerDataClass(cls: IDataClass, needsSTRUCT = true) {
  DataModelClasses.push(cls)
  if (needsSTRUCT && !nstructjs.isRegistered(cls)) {
    throw new Error("Class not registered with nstructjs: " + (cls as any).name)
  }
}

export function buildAPI() {
  const api = new DataAPI()
  for (const cls of DataModelClasses) {
    cls.defineAPI(api)
  }
  return api
}
