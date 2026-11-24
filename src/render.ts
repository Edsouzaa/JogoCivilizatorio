// Um triângulo de tela cheia; o fragment shader descobre em qual hex cada pixel cai e lê a cor
// numa textura W×H (1 texel por hex). Custo por frame = pixels da tela, não número de hexágonos.
// Alfa da textura = id do bioma (255 = cor lisa). Com zoom, o hex mostra a imagem do bioma.
const VS = `#version 300 es
void main() { vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0, 1); }`;

const FS = `#version 300 es
precision highp float;
precision highp int;
precision mediump sampler2DArray;
uniform vec2 uCam; uniform float uZoom; uniform vec2 uRes; uniform ivec2 uSize; uniform ivec2 uHover;
uniform sampler2D uTex; uniform sampler2DArray uBiomes; uniform bool uHasBiomes;
out vec4 o;
const float S3 = 1.7320508;
void main() {
  vec2 p = (vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) - uRes * 0.5) / uZoom + uCam;
  float q = S3 / 3.0 * p.x - p.y / 3.0, r = 2.0 / 3.0 * p.y;
  vec3 c = vec3(q, r, -q - r), rc = round(c), d = abs(rc - c);
  if (d.x > d.y && d.x > d.z) rc.x = -rc.y - rc.z; else if (d.y > d.z) rc.y = -rc.x - rc.z;
  int row = int(rc.y), rawCol = int(rc.x) + (row - (row & 1)) / 2;
  if (row < 0 || row >= uSize.y) { o = vec4(0.05, 0.05, 0.08, 1); return; }
  int col = rawCol - uSize.x * int(floor(float(rawCol) / float(uSize.x))); // o mundo dá a volta na horizontal
  vec4 t = texelFetch(uTex, ivec2(col, row), 0);
  vec3 color = t.rgb;
  vec2 local = p - vec2(S3 * (float(rawCol) + 0.5 * float(row & 1)), 1.5 * float(row));
  int biome = int(t.a * 255.0 + 0.5);
  if (uHasBiomes && biome < 255) // imagem do bioma aparece aos poucos conforme o zoom aumenta
    color = mix(color, texture(uBiomes, vec3(local * 0.5 + 0.5, float(biome))).rgb, smoothstep(3.0, 8.0, uZoom));
  vec2 dd = abs(local);
  float edge = max(dd.x, dot(dd, vec2(0.5, S3 * 0.5)));        // borda em S3/2
  if (uZoom > 6.0 && edge > S3 * 0.5 - 1.0 / uZoom) color *= 0.65; // contorno só com zoom
  if (ivec2(col, row) == uHover) color = mix(color, vec3(1), 0.35);
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
  gl.uniform2i(u("uSize"), W, H);
  gl.uniform1i(u("uTex"), 0);
  gl.uniform1i(u("uBiomes"), 1);

  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  if (W > max || H > max) throw new Error(`Mapa ${W}×${H} maior que a textura máxima da GPU (${max})`);
  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, W, H);

  // Imagens de bioma: carregam em segundo plano; até lá o mapa usa a cor lisa.
  const S = 128, biomes = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, biomes);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 8, gl.RGBA8, S, S, biomeUrls.length);
  gl.activeTexture(gl.TEXTURE0);
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
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(uHasBiomes, 1);
  }).catch((err) => console.error(err)); // sem imagens o jogo continua com cores lisas

  return {
    upload(rgba: Uint8Array) { gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, rgba); },
    draw(camX: number, camY: number, zoom: number, hoverCol: number, hoverRow: number) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uCam, camX, camY); gl.uniform1f(uZoom, zoom);
      gl.uniform2f(uRes, canvas.width, canvas.height); gl.uniform2i(uHover, hoverCol, hoverRow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
