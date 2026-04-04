import { GLType, AttrType } from "./WebGL/shaderprogram"
import { VertexArrayTarget } from "./WebGL/vertexArray"

export const SPRITE_VERT = `#version 300 es
in vec2 aPosition;
in vec2 aTexCoord;
in vec4 aColor;

uniform vec2 uResolution;
uniform vec2 uOffset;

out vec2 vTexCoord;
out vec4 vColor;

void main() {
  vec2 pos = aPosition + uOffset;
  vec2 clip = (pos / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  vTexCoord = aTexCoord;
  vColor = aColor;
}
`

export const SPRITE_FRAG = `#version 300 es
precision mediump float;

in vec2 vTexCoord;
in vec4 vColor;

uniform sampler2D uTexture;

out vec4 fragColor;

void main() {
  fragColor = texture(uTexture, vTexCoord) * vColor;
}
`

export const CK_VERT = `#version 300 es
in vec2 aPosition;
in vec2 aTexCoord;

uniform vec2 uResolution;

out vec2 vTexCoord;

void main() {
  vec2 clip = (aPosition / uResolution) * 2.0 - 1.0;
  clip.y = -clip.y;
  gl_Position = vec4(clip, 0.0, 1.0);
  vTexCoord = aTexCoord;
}
`

export const CK_FRAG = `#version 300 es
precision mediump float;

in vec2 vTexCoord;

uniform sampler2D uTexture;

out vec4 fragColor;

void main() {
  vec4 tex = texture(uTexture, vTexCoord);
  float dist = distance(tex.rgb, vec3(1.0, 0.0, 1.0));
  float alpha = smoothstep(0.0, 0.3, dist*dist);
  fragColor = vec4(tex.rgb, alpha);
}
`

export const spriteDef = {
  vertexSource: SPRITE_VERT,
  fragmentSource: SPRITE_FRAG,
  uniforms: {
    uResolution: {
      type: GLType.Vec2,
      default: [0, 0] as [number, number],
    },
    uOffset: {
      type: GLType.Vec2,
      default: [0, 0] as [number, number],
    },
    uTexture: { type: GLType.Sampler2D, default: 0 },
  },
  attrs: {
    aPosition: { type: AttrType.Vec2, size: 2 as const },
    aTexCoord: { type: AttrType.Vec2, size: 2 as const },
    aColor: { type: AttrType.Vec4, size: 4 as const },
    aIndices: {
      type: AttrType.UShort,
      size: 1 as const,
      target: VertexArrayTarget.ElementArrayBuffer,
    },
  },
}

export const chromakeyDef = {
  vertexSource: CK_VERT,
  fragmentSource: CK_FRAG,
  uniforms: {
    uResolution: {
      type: GLType.Vec2,
      default: [0, 0] as [number, number],
    },
    uTexture: { type: GLType.Sampler2D, default: 0 },
  },
  attrs: {
    aPosition: { type: AttrType.Vec2, size: 2 as const },
    aTexCoord: { type: AttrType.Vec2, size: 2 as const },
    aIndices: {
      type: AttrType.UShort,
      size: 1 as const,
      target: VertexArrayTarget.ElementArrayBuffer,
    },
  },
}
