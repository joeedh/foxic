
export enum MeshTypes {
  VERTEX  = 1,
  EDGE    = 2,
  HANDLE  = 4,
  LOOP    = 8,
  LOOPLIST= 16,
  FACE    = 32
}

export enum MeshFlags {
  NONE = 0,
  SELECT= 1<<0,
  HIDE  = 1<<1
}

export enum MeshFeatures {
  NONE = 0,
  HANDLES = 1<<0
}