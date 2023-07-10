
import {
  Vector2,
  Vector3
} from "../../node_modules/three/build/three.module.js";

var VolumeRenderShaderPerspective = {
  uniforms: {
    "u_size": {value: new Vector3(1, 1, 1)},
    "u_renderstyle": {value: 0},
    "u_renderthreshold": {value: 0.5},
    "u_opacity": {value: 0.5},
    "u_clim": {value: new Vector2(0.2, 0.8)},
    "u_data": {value: null},
    "volumeTex": {value: null},
    "u_cmdata": {value: null},
    "near": {value: 0.1},
    "far": {value: 10000},
    "alphaScale": {value: 0},
    "dtScale": {value: 1},
    "finalGamma": {value: 0},
    "boxSize": {value: new Vector3(1,1,1)},
    "useVolumeMirrorX": { value: false },
  },
  vertexShader: [
    "varying vec3 rayDirUnnorm;",

    "void main()",
    "{",
      "rayDirUnnorm = position - cameraPosition;",
      "gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
    "}"
  ].join("\n"),
  fragmentShader: [
    "precision highp float;",
   " precision mediump sampler3D;",
    "varying vec3 rayDirUnnorm;",

    // " uniform sampler2D transferTex;",
    "uniform sampler3D volumeTex;",
    "uniform sampler2D u_cmdata;",
    "uniform float alphaScale;",
    "uniform float dtScale;",
    "uniform float finalGamma;",
    "uniform highp vec3 boxSize;",
    "uniform bool useVolumeMirrorX;",
    "uniform vec2 u_clim;",

    // "uniform bool useSurface;",
    "uniform float near;",
    "uniform float far;",
    // "uniform sampler2D surfaceColorTex;",
    // "uniform sampler2D surfaceDepthTex;",
    "		vec4 apply_colormap(float val);",

    "vec2 intersectBox(vec3 orig, vec3 dir) {",
    "  vec3 boxMin = vec3(-0.5) * boxSize;",
    "  vec3 boxMax = vec3( 0.5) * boxSize;",
    "  vec3 invDir = 1.0 / dir;",
    "  vec3 tmin0 = (boxMin - orig) * invDir;",
    "  vec3 tmax0 = (boxMax - orig) * invDir;",
    "  vec3 tmin = min(tmin0, tmax0);",
    "  vec3 tmax = max(tmin0, tmax0);",
    "  float t0 = max(tmin.x, max(tmin.y, tmin.z));",
    "  float t1 = min(tmax.x, min(tmax.y, tmax.z));",
    "  return vec2(t0, t1);",
    "}",


    "		vec4 apply_colormap(float val) {",
    "				val = (val - u_clim[0]) / (u_clim[1] - u_clim[0]);",
    "				vec3 color = texture2D(u_cmdata, vec2(val, 0.5)).rgb;",
    "               return vec4(color, 0.5);",
    "		}",

    "float cameraDistanceFromDepth(float depth) {",
    "  float zN = 2.0 * depth - 1.0;",
    "  float z = 2.0 * near * far / (far + near - zN * (far - near));",
    "  return near + z;",
    "}",

    "void main(void) {",
    "  vec3 rayDir = normalize(rayDirUnnorm);",

    "  rayDir.x = useVolumeMirrorX ? -rayDir.x : rayDir.x;",
    "  vec3 cameraPositionAdjusted = cameraPosition;",
    "  cameraPositionAdjusted.x = useVolumeMirrorX ? -cameraPositionAdjusted.x : cameraPositionAdjusted.x;",

    "  // Find the part of the ray that intersects the box, where this part is",
    "  // expressed as a range of t values (with t being the traditional",
    "  // parameter for a how far a point is along a ray).",
    "  vec2 tBox = intersectBox(cameraPositionAdjusted, rayDir);",

    "  ivec2 surfaceTexSize = ivec2(0);",
    "  vec2 surfaceTexCoord = vec2(0);",

    "  if (tBox.x >= tBox.y) {",
    "    discard;",
    "  }",

    "  tBox.x = max(tBox.x, 0.0);",

    "  ivec3 volumeTexSize = textureSize(volumeTex, 0);",
    "  vec3 dt0 = 1.0 / (vec3(volumeTexSize) * abs(rayDir));",
    "  float dt = min(dt0.x, min(dt0.y, dt0.z));",

    "  dt *= dtScale;",

      // Prevents a lost WebGL context.
    "  if (dt < 0.00001) {",
    "    gl_FragColor = vec4(0.0);",
    "    return;",
    "  }",

    "  // Ray starting point, in the real space where the box may not be a cube.",
    " vec3 p = cameraPositionAdjusted + tBox.x * rayDir;",

    "  // Dither to reduce banding (aliasing).",
    "  // https://www.marcusbannerman.co.uk/articles/VolumeRendering.html",
    "  float random = fract(sin(gl_FragCoord.x * 12.9898 + gl_FragCoord.y * 78.233) * 43758.5453);",
    "  random *= 5.0;",
    "  p += random * dt * rayDir;",

    "  // Ray starting point, and change in ray point with each step, for the space where",
    "  // the box has been warped to a cube, for accessing the cubical data texture.",
    "  // The vec3(0.5) is necessary because rays are defined in the space where the box is",
    "  // centered at the origin, but texture look-ups have the origin at a box corner.",
    "  vec3 pSized = p / boxSize + vec3(0.5);",
    "  vec3 dPSized = (rayDir * dt) / boxSize;",

    "  // This renderer matches VVD_Viewer when looking along the smallest axis of the volume,",
    "  // but looks too bright on the other axes.  So normalize alpha to reduce it on these",
    "  // other axes.",
    "  float l = length(rayDir * boxSize);",
    "  float lMin = min(boxSize.x, min(boxSize.y, boxSize.z));",
    "  float alphaNormalization = lMin / l;",
    "  alphaNormalization *= alphaScale;",

    "  // A step of one voxel, for computing the gradient by a central difference.",
    "  vec3 dg = vec3(1) / vec3(volumeTexSize);",

    "  // Most browsers do not need this initialization, but add it to be safe.",
    "  gl_FragColor = vec4(0.0);",
    "	 float max_val = -1e6;",
    "  int max_i = 300;",
    "  int i = 0;",
    "  for (float t = tBox.x; t < tBox.y; t += dt) {",
    "    float val = texture(volumeTex, pSized.xyz).r;",
    // "    // vec4 vColor = texture(transferTex, vec2(v, 0.5));",
    // "    vec4 vColor = vec4(0,0,0,0.5);  ",
    // "    if(v > 0) {",
    // "        vColor = vec4(v,v,v,0.5);  ",
    // "    }",
    // "    vColor.a *= alphaNormalization;",
    "    if (val > max_val) {",
    "			  max_val = val;",
    "       i++;",
    "		 }",
    "    if(i > max_i || max_val > 0.95){",
    "      break;",
    "    }",
    // "    // Compute simple lighting when the color is not fully transparent.",
    // "    // Adding this point's color is the compositing operation A over B, where",
    // "    // A is gl_FragColor (the samples in front of this one on the ray) and ",
    // "        // B is vColor (this sample), using premultiplied alpha for the B color",
    // "   // (i.e., vColor.a * vColor.rgb).",
    // "    // https://en.wikipedia.org/wiki/Alpha_compositing#Straight_versus_premultiplied",
    // "    gl_FragColor.rgb += (1.0 - gl_FragColor.a) * vColor.a * vColor.rgb;",
    // "    gl_FragColor.a += (1.0 - gl_FragColor.a) * vColor.a;",

    // "    if (gl_FragColor.a >= 0.95) {",
    // "      break;",
    // "    }",

    // "   // Move to the next point along the ray.",
    "    pSized += dPSized;",
    "  }",
    "		if(max_val < 0.05){",
    "       gl_FragColor = vec4(0,0,0,0.5);",
    "   }else{",
    "	  			gl_FragColor = apply_colormap(max_val);",
    "   }",
    // "  float g = 1.0 / finalGamma;",
    // "  gl_FragColor = pow(gl_FragColor, vec4(g, g, g, 1));",

    "  // A few browsers show some artifacts if the final alpha value is not 1.0,",
    "  // probably a version of the issues discussed here:",
    "  // https://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html",
    // "  gl_FragColor.a = 1.0;",
    "}   ",
    ].join("\n")
};

export {VolumeRenderShaderPerspective};
