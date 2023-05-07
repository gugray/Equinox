import vs from "./shaders/vert.glsl";
import fs from "./shaders/frag_mix.glsl";

import {init} from "../../src/init.js";
import GUI from 'lil-gui';
import * as twgl from "twgl.js";
import {SimplexNoise} from "../../src/simplex-noise.js";
import {rand, setRandomGenerator, mulberry32} from "../../src/random.js";
import {FlowLineGenerator, Vec2} from "./density-hatch.js";
import {SVGGenerator} from "./svg.js";
import {Vector} from "./vector.js";
import {StreamlineGenerator} from "./adaptive-streamlines.js";

const wasmUrl = "flg.wasm";
const minCellSz = 6;
const maxCellSz = 24;

let gui;
let status = () => {};
let canvas2D, ctx2D;
let webGLCanvas, gl, w, h, progInfo;
let arrays, bufferInfo; // Used to drive simple vertex shader
let attachments, framebuf; // Used when rendering to texture
let instance1;
let wasmDataAddr, wasmTrgAddr, wasmData, wasmTrg;
let flowLines; // If generated in JS
let nGenerated = 0;

setRandomGenerator(mulberry32(42));
init(setup, false);

const params = {
  view: {
    fov: 45,
    azimuth: 0,
    altitude: 0,
    distance: 5,
  },
  lights: {
    l1_azimuth: 75,
    l1_altitude: 30,
    l1_strength: 0.2,
    l2_azimuth: -75,
    l2_altitude: 30,
    l2_strength: 0.2,
    amb_strength: 0.05,
  },
  curvature_light: false,
  animate: false,
  hatch_scene: false,
  rotate_field: true,
  noise_gain: 0.001,
  log_grid: true,
  use_wasm_hatcher: true,
  log_perf: false,
};

function setupControls() {

  const handler = {
    save: () => {
      const json = JSON.stringify(gui.save());
      localStorage.setItem("params", json);
    },
    load: () => {
      const json = localStorage.getItem("params");
      if (!json) return;
      gui.load(JSON.parse(json));
    },
    download_data: () => {
      prepareDataDownload();
    },
    download_svg: () => {
      prepareSVGDownload();
    },
  };

  gui = new GUI();
  const fView = gui.addFolder("View");
  fView.add(params.view, "fov", 15, 150).onChange(changing).onFinishChange(update);
  fView.add(params.view, "azimuth", -180, 180).onChange(changing).onFinishChange(update);
  fView.add(params.view, "altitude", -89.99, 89.99).onChange(changing).onFinishChange(update);
  fView.add(params.view, "distance", 0.1, 100).onChange(changing).onFinishChange(update);
  const fRender = gui.addFolder("Render");
  fRender.add(params.lights, "l1_azimuth", -180, 180).onChange(changing).onFinishChange(update);
  fRender.add(params.lights, "l1_altitude", -89.99, 89.99).onChange(changing).onFinishChange(update);
  fRender.add(params.lights, "l1_strength", 0, 1).onChange(changing).onFinishChange(update);
  fRender.add(params.lights, "l2_azimuth", -180, 180).onChange(changing).onFinishChange(update);
  fRender.add(params.lights, "l2_altitude", -89.99, 89.99).onChange(changing).onFinishChange(update);
  fRender.add(params.lights, "l2_strength", 0, 1).onChange(changing).onFinishChange(update);
  fRender.add(params.lights, "amb_strength", 0, 0.3).onChange(changing).onFinishChange(update);
  fRender.add(params, "curvature_light").onFinishChange(update);
  fRender.add(params, "animate").onFinishChange((newVal) => {
    // Hasn't been animating yet, so must start now
    if (newVal == true) requestAnimationFrame(render);
  });
  const fHatching = gui.addFolder("Hatching");
  fHatching.add(params, "hatch_scene").onFinishChange(update);
  fHatching.add(params, "rotate_field").onFinishChange(update);
  fHatching.add(params, "noise_gain", 0, 0.01).onFinishChange(update);
  fHatching.add(params, "log_grid").onFinishChange(update);
  fHatching.add(params, "use_wasm_hatcher").onFinishChange(update);
  const fMisc = gui.addFolder("Misc");
  fMisc.add(params, "log_perf").onFinishChange(update);
  fMisc.add(handler, "save");
  fMisc.add(handler, "load");
  fMisc.add(handler, "download_data").name("download data");
  fMisc.add(handler, "download_svg").name("generate svg");

  let moveStart = null;

  canvas2D.addEventListener("mousedown", (evt => {
    if (params.hatch_scene) return;
    moveStart = {
      x: evt.screenX,
      y: evt.screenY,
      startAzimuth: params.view.azimuth,
      startAltitude: params.view.altitude,
    };
  }));
  document.addEventListener("mousemove", (evt) => {
    if (!moveStart) return;
    const dx = evt.screenX - moveStart.x;
    const dy = evt.screenY - moveStart.y;
    const dAzimuth = -dx / w * 360 * 2;
    params.view.azimuth = toTwoDecimals(moveStart.startAzimuth + dAzimuth);
    while (params.view.azimuth > 180) params.view.azimuth -= 360;
    while (params.view.azimuth < -180) params.view.azimuth += 360;
    const dAltitude = dy / h * 180 * 2;
    params.view.altitude = toTwoDecimals(moveStart.startAltitude + dAltitude);
    while (params.view.altitude >= 90) params.view.altitude = 89.99;
    while (params.view.altitude <= -90) params.view.altitude = -89.99;
    gui.controllersRecursive().forEach(c => c.updateDisplay());
    changing();
  });
  document.addEventListener("mouseup", () => {
    moveStart = null;
  });
  canvas2D.addEventListener("wheel", (evt) => {
    if (params.hatch_scene) return;
    params.view.distance += evt.deltaY * 0.01;
    if (params.view.distance < 0.1) params.view.distance = 0.1;
    if (params.view.distance > 100) params.view.distance = 100;
    gui.controllersRecursive().forEach(c => c.updateDisplay());
    changing();
  });

  function toTwoDecimals(f) {
    return Math.round(f * 100) / 100;
  }

  function changing() {
    if (params.hatch_scene) return;
    update();
  }

  function update() {
    if (params.animate) return;
    requestAnimationFrame(render);
  }
}

function setupStatus() {
  const elm = document.getElementById("update");
  if (!elm) return;
  status = txt => elm.innerText = txt;
}

function setup() {

  canvas2D = document.getElementById("canv2d");
  webGLCanvas = document.getElementById("canv3d");
  w = webGLCanvas.width;
  h = webGLCanvas.height;

  // LIL-GUI and mouse
  setupControls();

  // Log updates to status bar
  setupStatus();

  // 2D overlay canvas (where we render the hatching)
  ctx2D = canvas2D.getContext("2d");

  // 3D WebGL canvas, and twgl
  gl = webGLCanvas.getContext("webgl2");
  twgl.addExtensionsToContext(gl);

  arrays = {
    position: {numComponents: 2, data: [-1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1]},
  };
  bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
  attachments = [{internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT}];
  framebuf = twgl.createFramebufferInfo(gl, attachments, w * 2, h);

  progInfo = twgl.createProgramInfo(gl, [vs, fs]);
  gl.useProgram(progInfo.program);

  initZigModule(w, h, () => {
    requestAnimationFrame(render);
  });
}


function render(time) {

  if (!params.animate) status("~/~");
  let startTime = performance.now();

  nGenerated = 0;

  const angleToVec = (azimuth, altitude) => {
    return [
      Math.cos(Math.PI * altitude / 180) * Math.sin(Math.PI * azimuth / 180),
      Math.sin(Math.PI * altitude / 180),
      Math.cos(Math.PI * altitude / 180) * Math.cos(Math.PI * altitude / 180)]
  }

  const uniforms = {
    time: params.animate ? time : 0,
    resolution: [w, h],
    eyeFOV: Math.PI * params.view.fov / 180,
    eyeAzimuth: Math.PI * params.view.azimuth / 180,
    eyeAltitude: Math.PI * params.view.altitude / 180,
    eyeDistance: params.view.distance,
    curvatureLight: params.curvature_light,
    light1Vec: angleToVec(params.lights.l1_azimuth, params.lights.l1_altitude),
    light1Strength: params.lights.l1_strength,
    light2Vec: angleToVec(params.lights.l2_azimuth, params.lights.l2_altitude),
    light2Strength: params.lights.l2_strength,
    ambientLightStrength: params.lights.amb_strength,
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
  if (params.log_perf)
    console.log("Shaders: " + elapsed + " msec");

  if (!params.hatch_scene) {
    // Clear 2D canvas so it doesn't occlude our render
    ctx2D.clearRect(0, 0, w, h);
  } else {
    // Fetch results, and hatch
    gl.readPixels(0, 0, w * 2, h, gl.RGBA, gl.FLOAT, wasmData);

    postprocessFlowfield(params.noise_gain, params.rotate_field);
    if (params.use_wasm_hatcher) zigHatch();
    // else hatch();
    else jobardHatch();
  }
  if (params.animate) requestAnimationFrame(render);
}

function postprocessFlowfield(noiseGain, rot) {
  const simplex = new SimplexNoise(8956);
  const mul = 0.001;
  const freq = 2;
  for (let x = 0; x < w; ++x) {
    for (let y = 0; y < h; ++y) {
      // Field vector
      const angle = freq * 2 * Math.PI * simplex.noise2D(x * mul, y * mul);
      let valx = wasmData[(y * 2 * w + w + x) * 4 + 2];
      let valy = wasmData[(y * 2 * w + w + x) * 4 + 3];
      if (rot) [valx, valy] = [-valy, valx];
      const noisex = noiseGain * Math.cos(angle);
      const noisey = noiseGain * Math.sin(angle);
      let vx = valx + noisex;
      let vy = valy + noisey;
      const len = Math.sqrt(vx ** 2 + vy ** 2);
      wasmData[(y * 2 * w + w + x) * 4 + 2] = vx / len;
      wasmData[(y * 2 * w + w + x) * 4 + 3] = vy / len;
    }
  }
}

function prepareSVGDownload() {

  const gen = new SVGGenerator(w, h, 2 * h, w);
  gen.addLayer("0-black", "#000000");

  if (params.use_wasm_hatcher) {
    const flg = instance1.exports;
    wasmTrg = new Uint32Array(flg.memory.buffer, wasmTrgAddr, 10_000_000);
    let nAdded = 0;
    let i = 0;
    while (nAdded < nGenerated) {
      const startIx = i;
      while (wasmTrg[i] != 0xffffffff) i += 2;
      gen.addWASMPath(0, wasmTrg, startIx, i);
      i += 2;
      ++nAdded;
    }
  }
  else {
    for (const fl of flowLines)
      gen.addPointsPath(0, fl);
  }

  const d = new Date();
  const dateStr = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
    ("0" + d.getDate()).slice(-2) + "!" +
    ("0" + d.getHours()).slice(-2) + "-" + ("0" + d.getMinutes()).slice(-2);
  const fname = "eq-" + dateStr + ".svg";

  let file;
  let data = [];
  data.push(gen.generate());
  let properties = {type: 'image/svg+xml'};
  try {
    file = new File(data, fname, properties);
  } catch {
    file = new Blob(data, properties);
  }
  let url = URL.createObjectURL(file);
  const elmDownload = document.getElementById("download");
  elmDownload.href = url;
  elmDownload.download = fname;
  elmDownload.style.display = "block";

}

function prepareDataDownload() {
  let dataStr = wasmData.length.toString();
  for (let i = 0; i < wasmData.length; ++i) {
    if ((i % 4) == 0) dataStr += "\n";
    else dataStr += " ";
    dataStr += wasmData[i].toString();
  }
  dataStr += "\n";
  let file;
  let data = [];
  data.push(dataStr);
  let properties = {type: 'text/plain'};
  try {
    file = new File(data, "data.txt", properties);
  } catch {
    file = new Blob(data, properties);
  }
  let url = URL.createObjectURL(file);
  const elmDownload = document.getElementById("download");
  elmDownload.href = url;
  elmDownload.download = "data.txt";
  elmDownload.style.display = "block";
}

function zigHatch() {

  const flg = instance1.exports;
  wasmData = new Float32Array(flg.memory.buffer, wasmDataAddr, w * h * 2 * 4);
  wasmTrg = new Uint32Array(flg.memory.buffer, wasmTrgAddr, 10_000_000);

  let startTime = performance.now();
  if (!params.animate) {
    flg.seedPRNG(BigInt(Math.floor(rand() * Math.pow(2, 32))));
    flg.reset(true);
  }
  nGenerated = flg.genFlowlines(!params.animate, params.log_grid);
  wasmData = new Float32Array(flg.memory.buffer, wasmDataAddr, w * h * 2 * 4);
  wasmTrg = new Uint32Array(flg.memory.buffer, wasmTrgAddr, 10_000_000);
  let endTime = performance.now();

  if (params.log_perf) {
    console.log("genFlowlines: " + nGenerated);
    let elapsed = endTime - startTime;
    console.log("Elapsed: " + elapsed + " msec");
  }
  status(nGenerated);

  ctx2D.fillStyle = "white";
  ctx2D.fillRect(0, 0, w, h);
  ctx2D.fill();
  ctx2D.strokeStyle = "black";
  ctx2D.lineWidth = 2;
  ctx2D.beginPath();
  let trgIx = 0;
  let lnCount = 0;
  let newPath = true;
  while (lnCount < nGenerated && trgIx < wasmTrg.length) {
    const x = wasmTrg[trgIx++];
    const y = wasmTrg[trgIx++];
    if (x == 0xffffffff) {
      newPath = true;
      ++lnCount;
      continue;
    }
    if (newPath) {
      ctx2D.moveTo(x, h - y);
      newPath = false;
    } else ctx2D.lineTo(x, h - y);
  }
  ctx2D.stroke();

}

function jobardHatch() {

  const vec = [0, 0, 0, 0];

  const flowFun = (pt) => {
    let x = Math.floor(pt.x);
    let y = Math.floor(pt.y);
    if (x <= 0 || x >= w - 1 || y <= 0 || y >= h - 1) return null;
    getVec4(wasmData, w * 2, w + x, y, vec);
    if (vec[1] == 0) return null; // Distance
    let res = new Vector(vec[2], vec[3]);
    if (res.length() < 0.00001) return null;
    res.depth = vec[1];
    return res;
  };

  const densityFun = (pt) => {
    let x = Math.floor(pt.x);
    let y = Math.floor(pt.y);
    let val;
    // Phong lighting
    if (params.real_light) {
      getVec4(wasmData, w * 2, x, y, vec);
      val = Math.sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2);
      if (val > 1) val = 1;
      if (val < 0) val = 0;
    }
    // Diffuse lighting from viewpoint
    else {
      getVec4(wasmData, w * 2, w + x, y, vec);
      val = vec[0];
      if (val < 0) val = 0;
      if (val > 1) val = 1;
    }
    val = Math.pow(val, 0.5);
    return val;
  }


  flowLines = [];
  let jstream = new StreamlineGenerator({
    field: flowFun,
    density: densityFun,
    width: w,
    height: h,
    minStartDist: 8,
    maxStartDist: 36,
    endRatio: 0.4,
    minPointsPerLine: 5,
    timeStep: 2,
    forwardOnly: false,
    onStreamlineAdded: points => flowLines.push(points),
  });
  jstream.run();
  waitForJobard();

  function waitForJobard() {
    if (jstream.running) {
      setTimeout(waitForJobard, 50);
    }
    else {
      status(flowLines.length);
      if (params.log_perf) {
        let elapsed = endTime - startTime;
        console.log("Hatching: " + elapsed + " msec");
        console.log("# flowlines: " + flowLines.length);
      }
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

  }
}

function hatch() {

  const vec = [0, 0, 0, 0];

  const flowFun = (pt) => {

    let x = Math.floor(pt.x);
    let y = Math.floor(pt.y);
    if (x <= 0 || x >= w - 1 || y <= 0 || y >= h - 1)
      return null;

    getVec4(wasmData, w * 2, w + x, y, vec);
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
      getVec4(wasmData, w * 2, x, y, vec);
      let val = Math.sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2);
      if (val > 1) val = 1;
      val = val ** 1.2;
      return val;
    }

    // Diffuse lighting from viewpoint
    getVec4(wasmData, w * 2, w + x, y, vec);
    return vec[0];
  }

  let startTime = performance.now();
  const flopt = {
    width: w, height: h, field: flowFun, stepSize: 4, maxLength: 0,
    density: densityFun,
    minCellSize: minCellSz, maxCellSize: maxCellSz, nShades: 12, logGrid: params.log_grid,
  };
  flowLines = [];
  const flgen = new FlowLineGenerator(flopt);
  while (true) {
    const [flPoints, flLength] = flgen.genFlowLine();
    if (!flPoints) break;
    if (flPoints.length < 3 || flLength < flopt.minCellSize) continue;
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

  status(flowLines.length);
  if (params.log_perf) {
    let elapsed = endTime - startTime;
    console.log("Hatching: " + elapsed + " msec");
    console.log("# flowlines: " + flowLines.length);
  }
}

function getVec4(data, w, x, y, vec) {
  for (let i = 0; i < 4; ++i)
    vec[i] = data[(y * w + x) * 4 + i];
}

function initZigModule(w, h, ready) {

  const req = new XMLHttpRequest();
  req.open('GET', wasmUrl);
  req.responseType = 'arraybuffer';
  req.send();

  req.onload = function () {
    const bytes = req.response;
    WebAssembly.instantiate(bytes, {env: {}}).then(result => {
      instance1 = result.instance;
      const flg = instance1.exports;

      const initRes = flg.initFlowlineGenerator(w, h, minCellSz, maxCellSz, 12, true, 4, 0);
      if (initRes != 1) {
        console.error("WASM error: initFlowlineGenerator");
        ready();
        return;
      }

      wasmDataAddr = flg.getDataAddr();
      wasmTrgAddr = flg.getTrgAddr();
      wasmData = new Float32Array(flg.memory.buffer, wasmDataAddr, w * h * 2 * 4);
      wasmTrg = new Uint32Array(flg.memory.buffer, wasmTrgAddr, 10_000_000);
      ready();
    });
  };

}
