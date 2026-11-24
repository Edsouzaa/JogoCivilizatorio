// Um triângulo de tela cheia; o fragment shader descobre em qual hex cada pixel cai e lê duas texturas W×H
// (1 texel por hex). Custo por frame = pixels da tela, não número de hexágonos.
//   uTex  (cor): RGB = cor do hex no modo de mapa; A = id do bioma (255 = cor lisa: cidade ou outro modo).
//                No modo terreno, RGB = cor do país dono (tingido por cima do bioma) ou do terreno.
//   uInfo (dados): R = névoa (bits 0–1: 0 inexplorado, 1 explorado, 2 visível) + bit 7 "tem dono";
//                  G = clima; B = bordas com rio (bits 0–5); A = bordas navegáveis (bits 0–5).
//   uBorder (fronteiras): R = bordas de fronteira de país (bits 0–5); G = bordas de fronteira de estado.
const VS = `#version 300 es
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0, 1); }`;

const FS = `#version 300 es
precision highp float;
precision highp int;
precision mediump sampler2DArray;
uniform vec2 uCam; uniform float uZoom; uniform vec2 uRes; uniform ivec2 uSize; uniform ivec2 uHover;
uniform sampler2D uTex; uniform sampler2D uInfo; uniform sampler2D uBorder; uniform sampler2DArray uBiomes; uniform bool uHasBiomes;
uniform float uWinter; // 1 = auge do inverno no hemisfério norte, −1 no sul
uniform bool uFog;
out vec4 o;
const float S3 = 1.7320508;

// distância a um hexágono de lados retos em y = ±r (Inigo Quilez); usamos com o hex girado (.yx)
float sdHex(vec2 q, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  q = abs(q); q -= 2.0 * min(dot(k.xy, q), 0.0) * k.xy; q -= vec2(clamp(q.x, -k.z * r, k.z * r), r);
  return length(q) * sign(q.y);
}
float segDist(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
vec2 corner(int k) { float a = radians(60.0 * float(k) - 90.0); return vec2(cos(a), sin(a)); }

void main() {
  vec2 p = (vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) - uRes * 0.5) / uZoom + uCam;
  float q = S3 / 3.0 * p.x - p.y / 3.0, r = 2.0 / 3.0 * p.y;
  vec3 c = vec3(q, r, -q - r), rc = round(c), d = abs(rc - c);
  if (d.x > d.y && d.x > d.z) rc.x = -rc.y - rc.z; else if (d.y > d.z) rc.y = -rc.x - rc.z;
  int row = int(rc.y), rawCol = int(rc.x) + (row - (row & 1)) / 2;
  if (row < 0 || row >= uSize.y) { o = vec4(0.05, 0.05, 0.08, 1); return; }
  int col = rawCol - uSize.x * int(floor(float(rawCol) / float(uSize.x))); // o mundo dá a volta na horizontal
  vec4 t = texelFetch(uTex, ivec2(col, row), 0);
  ivec4 inf = ivec4(texelFetch(uInfo, ivec2(col, row), 0) * 255.0 + 0.5);
  int fog = inf.r & 3; bool owned = (inf.r & 128) != 0;
  vec2 local = p - vec2(S3 * (float(rawCol) + 0.5 * float(row & 1)), 1.5 * float(row));
  int biome = int(t.a * 255.0 + 0.5);

  vec3 color = t.rgb;
  if (biome < 255 && uHasBiomes) {
    vec3 avg = textureLod(uBiomes, vec3(0.5, 0.5, float(biome)), 7.0).rgb; // cor média do bioma (último mip)
    vec3 img = texture(uBiomes, vec3(local * 0.5 + 0.5, float(biome))).rgb;
    color = mix(avg, img, smoothstep(3.0, 8.0, uZoom));
    if (owned) color = mix(color, t.rgb, 0.35); // cor do país por cima do terreno
    // neve pela estação: polar sempre, continental no inverno, temperado no auge do inverno
    float hemi = row < uSize.y / 2 ? uWinter : -uWinter;
    float snow = inf.g == 4 ? 1.0 : inf.g == 3 ? smoothstep(0.2, 0.5, hemi) : inf.g == 2 ? smoothstep(0.75, 0.95, hemi) : 0.0;
    if (biome != 0) color = mix(color, vec3(0.92, 0.94, 0.97), snow * 0.7);
  }

  // rios nas bordas: navegáveis mais grossos
  for (int k = 0; k < 6; k++) {
    if (((inf.b >> k) & 1) == 0) continue;
    bool nav = ((inf.a >> k) & 1) == 1;
    float w = max(nav ? 0.11 : 0.06, 1.2 / uZoom);
    float dd = segDist(local, corner(k), corner((k + 1) % 6));
    color = mix(color, nav ? vec3(0.16, 0.36, 0.75) : vec3(0.28, 0.52, 0.85), 1.0 - smoothstep(w * 0.7, w, dd));
  }

  // fronteiras: país = linha escura grossa; estado = tracejado claro. Somem quando o mapa está muito longe.
  ivec2 bd = ivec2(texelFetch(uBorder, ivec2(col, row), 0).rg * 255.0 + 0.5);
  float near = smoothstep(1.0, 3.0, uZoom);
  for (int k = 0; k < 6; k++) {
    vec2 a = corner(k), b = corner((k + 1) % 6);
    if (((bd.x >> k) & 1) == 1) {
      float wd = max(0.09, 1.6 / uZoom);
      color = mix(color, vec3(0.08, 0.07, 0.1), near * (1.0 - smoothstep(wd * 0.6, wd, segDist(local, a, b))));
    } else if (((bd.y >> k) & 1) == 1) {
      float wd = max(0.045, 1.0 / uZoom), t = dot(local - a, b - a); // posição ao longo da borda (0..1)
      float dash = step(0.5, fract(t * 4.0));
      color = mix(color, vec3(0.95), 0.8 * near * dash * (1.0 - smoothstep(wd * 0.6, wd, segDist(local, a, b))));
    }
  }

  // hexágono de cantos arredondados: linha e vão entre hexes aparecem com zoom
  float sd = sdHex(local.yx, S3 * 0.5 - 0.14) - 0.14;
  float px = 1.0 / uZoom, show = smoothstep(4.0, 9.0, uZoom);
  color *= 1.0 - show * (0.35 * smoothstep(-2.0 * px, -0.5 * px, sd) + 0.25 * step(0.0, sd));

  if (uFog) {
    if (fog == 0) color = vec3(0.07, 0.07, 0.09) + 0.02 * fract(sin(float(col * 31 + row * 17)) * 43758.5);
    else if (fog == 1) color = mix(color, vec3(dot(color, vec3(0.3, 0.59, 0.11))), 0.6) * 0.55;
  }
  if (ivec2(col, row) == uHover) color = mix(color, vec3(1), 0.3);
  o = vec4(color, 1);
}`;

export function createRenderer(canvas: HTMLCanvasElement, W: number, H: number, biomeUrls: string[]) {
  const gl = canvas.getContext("webgl2", { antialias: false });
  if (!gl) throw new Error("WebGL2 não suportado neste navegador");
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
  gl.useProgram(prog);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uCam = u("uCam"), uZoom = u("uZoom"), uRes = u("uRes"), uHover = u("uHover"), uHasBiomes = u("uHasBiomes");
  const uWinter = u("uWinter"), uFog = u("uFog");
  gl.uniform2i(u("uSize"), W, H);
  gl.uniform1i(u("uTex"), 0);
  gl.uniform1i(u("uBiomes"), 1);
  gl.uniform1i(u("uInfo"), 2);
  gl.uniform1i(u("uBorder"), 3);

  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  if (W > max || H > max) throw new Error(`Mapa ${W}×${H} maior que a textura máxima da GPU (${max})`);
  const dataTexture = (unit: number) => {
    const tex = gl.createTexture();
    gl.activeTexture(unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, W, H);
    return tex;
  };
  dataTexture(gl.TEXTURE0);
  dataTexture(gl.TEXTURE2);
  dataTexture(gl.TEXTURE3);

  // Imagens de bioma: carregam em segundo plano; até lá o mapa usa a cor lisa.
  const S = 128, biomes = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, biomes);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 8, gl.RGBA8, S, S, biomeUrls.length);
  Promise.all(biomeUrls.map((url) => new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img); img.onerror = () => fail(new Error(`bioma não carregou: ${url}`));
    img.src = url;
  }))).then((imgs) => {
    const cv = document.createElement("canvas"); cv.width = cv.height = S;
    const g = cv.getContext("2d")!;
    gl.activeTexture(gl.TEXTURE1);
    imgs.forEach((img, k) => { // qualquer tamanho de imagem é reduzido para S×S
      g.clearRect(0, 0, S, S); g.drawImage(img, 0, 0, S, S);
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, k, S, S, 1, gl.RGBA, gl.UNSIGNED_BYTE, g.getImageData(0, 0, S, S));
    });
    gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    gl.uniform1i(uHasBiomes, 1);
  }).catch((err) => console.error(err)); // sem imagens o jogo continua com cores lisas

  const upload = (unit: number, rgba: Uint8Array) => { gl.activeTexture(unit); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, rgba); };
  return {
    upload(rgba: Uint8Array) { upload(gl.TEXTURE0, rgba); },
    uploadInfo(rgba: Uint8Array) { upload(gl.TEXTURE2, rgba); },
    uploadBorders(rgba: Uint8Array) { upload(gl.TEXTURE3, rgba); },
    draw(camX: number, camY: number, zoom: number, hoverCol: number, hoverRow: number, winter: number, fog: boolean) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uCam, camX, camY); gl.uniform1f(uZoom, zoom);
      gl.uniform2f(uRes, canvas.width, canvas.height); gl.uniform2i(uHover, hoverCol, hoverRow);
      gl.uniform1f(uWinter, winter); gl.uniform1i(uFog, fog ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
