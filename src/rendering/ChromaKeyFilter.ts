import { Filter, GlProgram } from "pixi.js";

const vertex = `//glsl
  in vec2 aPosition;
  out vec2 vTextureCoord;

  uniform vec4 uInputSize;
  uniform vec4 uOutputFrame;
  uniform vec4 uOutputTexture;

  vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
  }

  vec2 filterTextureCoord(void) {
    return aPosition * uOutputFrame.zw * uInputSize.zw;
  }

  void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
  }
`;

const fragment = `
  in vec2 vTextureCoord;
  out vec4 finalColor;

  uniform sampler2D uTexture;
  uniform vec3 uKeyColor;
  uniform float uTolerance;

  void main(void) {
    vec4 color = texture(uTexture, vTextureCoord);
    float dist = distance(color.rgb, uKeyColor);
    
    // Smooth falloff: fully transparent inside tolerance, soft edge in the fringe zone
    float alpha = smoothstep(uTolerance * 0.6, uTolerance * 1.4, dist);
    // Also suppress the magenta tint in semi-transparent fringe pixels
    // by shifting color toward the non-key average
    vec3 corrected = mix(vec3(0.0), color.rgb, alpha);
    finalColor = vec4(corrected, color.a * alpha);
  }
`;

export class ChromaKeyFilter extends Filter {
  constructor(
    keyColor: [number, number, number] = [1.0, 0.0, 1.0],
    tolerance: number = 0.3,
  ) {
    const glProgram = GlProgram.from({ vertex, fragment });

    super({
      glProgram,
      resources: {
        chromaUniforms: {
          uKeyColor: { value: new Float32Array(keyColor), type: "vec3<f32>" },
          uTolerance: { value: tolerance, type: "f32" },
        },
      },
    });
  }
}
