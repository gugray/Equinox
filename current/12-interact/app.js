import vs from "./vert.glsl";
import fs from "./frag_mix.glsl";

import {init} from "../../src/init.js";
import * as dat from "../../src/dat.gui.module.js";
import * as twgl from "twgl.js";
import {FlowLineGenerator, Vec2} from "./app-hatch.js";
import {doZiggy} from "./app-zig.js";

const gui = new dat.GUI();
let canvas2D, ctx2D;
let webGLCanvas, gl, w, h, progInfo;
let arrays, bufferInfo; // Used to drive simple vertex shader
let attachments, framebuf, txdata; // Used when rendering to texture

// Deniz: Optimization is the poison of creativity
// Sei kein Lachs

// Next up:
// -- put camera params into uniforms
// -- mouse control on canvas
// -- GUI controls

init(setup, false);
doZiggy();

const params = {
  hatch_scene: false,
  real_light: true,
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
    hatch();
  }
}


function hatch() {

  let startTime = performance.now();

  const vec = [0, 0, 0, 0];

  const flowFun = (pt) => {

    let x = Math.floor(pt.x);
    let y = Math.floor(pt.y);
    if (x == 0 || x >= w - 1 || y == 0 || y >= h - 1)
      return null;

    getVec4(txdata, w * 2, w + x, y, vec);
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

  const flopt = {
    width: w, height: h, fun: flowFun, stepSize: 1, maxLength: 0,
    densityFun: densityFun,
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

  let endTime = performance.now();
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
