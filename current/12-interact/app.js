import vs from "./vert.glsl";
import fs from "./frag_mix.glsl";

import {init} from "../../src/init.js";
import * as dat from "../../src/dat.gui.module.js";
import * as twgl from "twgl.js";
import {SimplexNoise} from "../../src/simplex-noise.js";
import {rand, setRandomGenerator, mulberry32} from "../../src/random.js";
import {FlowLineGenerator, Vec2} from "./app-hatch.js";

const gui = new dat.GUI();
let canvas2D, ctx2D;
let webGLCanvas, gl, w, h, progInfo;
let arrays, bufferInfo; // Used to drive simple vertex shader
let attachments, framebuf, txdata; // Used when rendering to texture
let instance;

// Deniz: Optimization is the poison of creativity
// Sei kein Lachs

// Next up:
// -- put camera params into uniforms
// -- mouse control on canvas
// -- GUI controls

setRandomGenerator(mulberry32(42));
init(setup, false);
initZigModule();

const params = {
  hatch_scene: false,
  real_light: false,
}


function setupControls() {
  gui.remember(params);
  gui.add(params, "hatch_scene").onFinishChange(render);
  gui.add(params, "real_light").onFinishChange(render);
}


function setup() {

  // DAT.GUI
  setupControls();

  // 2D overlay canvas (where we render the hatching)
  canvas2D = document.getElementById("canv2d");
  ctx2D = canvas2D.getContext("2d");

  // 3D WebGL canvas, and twgl
  webGLCanvas = document.getElementById("canv3d");
  gl = webGLCanvas.getContext("webgl2");
  w = webGLCanvas.width;
  h = webGLCanvas.height;
  twgl.addExtensionsToContext(gl);

  arrays = {
    position: {numComponents: 2, data: [-1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1]},
  };
  bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
  attachments = [{internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT}];
  framebuf = twgl.createFramebufferInfo(gl, attachments, w * 2, h);
  txdata = new Float32Array(w * 2 * h * 4);

  progInfo = twgl.createProgramInfo(gl, [vs, fs]);
  gl.useProgram(progInfo.program);

  render();
}


function render() {

  let startTime = performance.now();

  const uniforms = {
    time: 8,
    resolution: [w, h],
  };

  // Rendering to canvas
  if (!params.hatch_scene) {
    twgl.bindFramebufferInfo(gl, null);
    gl.viewport(0, 0, w, h);
  }
  // Rendering to texture (2x the size!)
  else {
    twgl.bindFramebufferInfo(gl, framebuf);
    gl.viewport(0, 0, w * 2, h);
  }
  twgl.setBuffersAndAttributes(gl, progInfo, bufferInfo);
  twgl.setUniforms(progInfo, uniforms);
  twgl.drawBufferInfo(gl, bufferInfo);

  let endTime = performance.now();
  let elapsed = endTime - startTime;
  console.log("Shaders: " + elapsed + " msec");

  if (!params.hatch_scene) {
    // Clear 2D canvas so it doesn't occlude our render
    ctx2D.clearRect(0, 0, w, h);
  }
  else {
    // Fetch results, and hatch
    gl.readPixels(0, 0, w * 2, h, gl.RGBA, gl.FLOAT, txdata);

    // prepareDataDownload();
    genNoiseData(true);
    hatch();
    // zigHatch();
  }
}

function genNoiseData(rot) {
  const simplex = new SimplexNoise(8956);
  const mul = 0.001;
  const freq = 2;
  const gain = 0.001;
  for (let x = 0; x < w; ++x) {
    for (let y = 0; y < h; ++y) {
      // Diffuse light brightness
      // txdata[(y * 2 * w + w + x) * 4 + 0] = 0.5;
      // Distance ~ not used, any value
      // txdata[(y * 2 * w + w + x) * 4 + 1] = 42;
      // Field vector
      const angle = freq * 2 * Math.PI * simplex.noise2D(x * mul, y * mul);
      let valx = txdata[(y * 2 * w + w + x) * 4 + 2];
      let valy = txdata[(y * 2 * w + w + x) * 4 + 3];
      if (rot) [valx, valy] = [-valy, valx];
      const noisex = gain * Math.cos(angle);
      const noisey = gain * Math.sin(angle);
      let vx = valx + noisex;
      let vy = valy + noisey;
      const len = Math.sqrt(vx ** 2 + vy ** 2);
      txdata[(y * 2 * w + w + x) * 4 + 2] = vx / len;
      txdata[(y * 2 * w + w + x) * 4 + 3] = vy / len;
    }
  }
}

function prepareDataDownload() {
  let dataStr = txdata.length.toString();
  for (let i = 0; i < txdata.length; ++i) {
    if ((i % 4) == 0) dataStr += "\n";
    else dataStr += " ";
    dataStr += txdata[i].toString();
  }
  dataStr += "\n";
  let file;
  let data = [];
  data.push(dataStr);
  let properties = { type: 'text/plain' };
  try { file = new File(data, "data.txt", properties); }
  catch { file = new Blob(data, properties); }
  let url = URL.createObjectURL(file);
  const elmDownload = document.getElementById("dldata");
  elmDownload.href = url;
  elmDownload.download = "data.txt";
}

function zigHatch() {

  const flg = instance.exports;

  const initRes = flg.initFlowlineGenerator(w, h, 3, 24, 12, true, 4, 0);
  console.log("initFlowlineGenerator: " + initRes);
  if (initRes != 1) return;

  const dataAddr = flg.getDataAddr();
  const trgAddr = flg.getTrgAddr();
  const zigData = new Float32Array(flg.memory.buffer, dataAddr, w * h * 2 * 4);
  for (let i = 0; i < zigData.length; ++i)
    zigData[i] = txdata[i];
  let zigTrg = new Uint32Array(flg.memory.buffer, trgAddr, 10_000_000);

  let startTime = performance.now();
  flg.seedPRNG(BigInt(Math.floor(rand() * Math.pow(2, 32))));
  flg.reset();
  const nGenerated = flg.genFlowlines(zigData, zigData.length, zigTrg, zigTrg.length);
  let endTime = performance.now();
  zigTrg = new Uint32Array(flg.memory.buffer, trgAddr, 10_000_000);
  console.log("genFlowlines: " + nGenerated);
  let elapsed = endTime - startTime;
  console.log("Elapsed: " + elapsed + " msec");

  ctx2D.fillStyle = "white";
  ctx2D.fillRect(0, 0, w, h);
  ctx2D.fill();
  ctx2D.strokeStyle = "black";
  ctx2D.lineWidth = 2;
  ctx2D.beginPath();
  let trgIx = 0;
  let lnCount = 0;
  let newPath = true;
  while (lnCount < nGenerated && trgIx < zigTrg.length) {
    const x = zigTrg[trgIx++];
    const y = zigTrg[trgIx++];
    if (x == 0xffffffff) {
      newPath = true;
      ++lnCount;
      continue;
    }
    if (newPath) {
      ctx2D.moveTo(x, h - y);
      newPath = false;
    }
    else ctx2D.lineTo(x, h - y);
  }
  ctx2D.stroke();

}

function hatch() {


  const vec = [0, 0, 0, 0];

  const flowFun = (pt) => {

    let x = Math.floor(pt.x);
    let y = Math.floor(pt.y);
    if (x <= 0 || x >= w - 1 || y <= 0 || y >= h - 1)
      return null;

    getVec4(txdata, w * 2, w + x, y, vec);
    // distance = 0 means no object
    if (vec[1] == 0)
      return null;
    let res = new Vec2(vec[2], vec[3]);

    if (res.length() < 0.00001) return null;
    res.normalize();
    return res;
  }

  const densityFun = (pt) => {

    let x = Math.floor(pt.x);
    let y = Math.floor(pt.y);

    // Phong lighting
    if (params.real_light) {
      getVec4(txdata, w * 2, x, y, vec);
      let val = Math.sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2);
      if (val > 1) val = 1;
      val = val ** 1.2;
      return val;
    }

    // Diffuse lighting from viewpoint
    getVec4(txdata, w * 2, w + x, y, vec);
    return vec[0];
  }

  let startTime = performance.now();
  const flopt = {
    width: w, height: h, field: flowFun, stepSize: 4, maxLength: 0,
    density: densityFun,
    minCellSize: 3, maxCellSize: 24, nShades: 12, logGrid: true
  }
  const flowLines = [];
  const flgen = new FlowLineGenerator(flopt);
  while (true) {
    const [flPoints, flLength] = flgen.genFlowLine();
    if (!flPoints) break;
    if (flPoints.length < 2 || flLength < flopt.minCellSize) continue;
    flowLines.push(flPoints);
  }
  let endTime = performance.now();

  ctx2D.fillStyle = "white";
  ctx2D.fillRect(0, 0, w, h);
  ctx2D.fill();
  ctx2D.strokeStyle = "black";
  ctx2D.lineWidth = 2;
  ctx2D.beginPath();
  for (const pts of flowLines) {
    ctx2D.moveTo(pts[0].x, h - pts[0].y);
    for (let i = 1; i < pts.length; ++i) {
      ctx2D.lineTo(pts[i].x, h - pts[i].y);
    }
  }
  ctx2D.stroke();

  let elapsed = endTime - startTime;
  console.log("Hatching: " + elapsed + " msec");
  console.log("# flowlines: " + flowLines.length);
}

function getVec4(data, w, x, y, vec) {
  for (let i = 0; i < 4; ++i)
    vec[i] = data[(y * w + x) * 4 + i];
}

function setPixel(imgd, x, y, r, g, b) {
  const w = imgd.width;
  const h = imgd.height;
  y = h - y - 1;
  imgd.data[(y * w + x) * 4] = Math.round(r);
  imgd.data[(y * w + x) * 4 + 1] = Math.round(g);
  imgd.data[(y * w + x) * 4 + 2] = Math.round(b);
  imgd.data[(y * w + x) * 4 + 3] = 255;
}

function initZigModule() {

  const req = new XMLHttpRequest();
  req.open('GET', 'flg.wasm');
  req.responseType = 'arraybuffer';
  req.send();

  req.onload = function () {
    const bytes = req.response;
    WebAssembly.instantiate(bytes, {
      env: {}
    }).then(result => {
      instance = result.instance;
    });
  };

}
