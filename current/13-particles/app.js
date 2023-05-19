import sSweepVert from "shdr-hatch/sweep-vert.glsl";
import sParticleRenderVert from "shdr-hatch/particle-render-vert.glsl";
import sParticleRenderFrag from "shdr-hatch/particle-render-frag.glsl";
import sParticleUpdateFrag from "shdr-hatch/particle-update-frag.glsl";
import sOutputDrawFrag from "shdr-hatch/output-draw-frag.glsl";

import {init} from "../../src/init.js";
import * as twgl from "twgl.js";
import GUI from 'lil-gui';

const nParticles = 8096;

let gui;
let status = () => {};
let renderTimes = [], frameIx = 0;
let webGLCanvas, gl, w, h;
let sweepArrays, sweepBufferInfo;         // Used to drive simple vertex shader behind fragment renderers
let particleArrays, particleBufferInfo;   // Used to drive paricle state compute shader, and particle renderer
let szParticleState;                      // Size of (square-shaped) particle state textures
let txParticleState0, txParticleState1;   // Texture holding state of particles. Pingpong.
let txScene;                              // Texture holding SDF scene and direction/darkness/depth
let txOutput0, txOutput1;                 // The rendered output: faded between frames, new particles drawn on top
let progiParticleUpdate;                  // Program to update particle states
let progiParticleRender;                  // Program to render particles
let progiOutputDraw;

const params = {
  animate: true,
}

// Textures
// [sqrtnumpart]  particle state
// [imgsize x 2]  scene render; direction/darkness/depth
// [imgsize]      particle render

init(setup, false);

function setup() {

  webGLCanvas = document.getElementById("canv3d");
  w = webGLCanvas.width;
  h = webGLCanvas.height;

  for (let i = 0; i < 60; ++i) renderTimes.push(0);
  frameIx = 0;
  setupStatus();

  // This sketch doesn't use 2D canvas
  document.getElementById("canv2d").style.display = "none";

  // LIL-GUI and mouse
  // setupControls();

  // 3D WebGL canvas, and twgl
  gl = webGLCanvas.getContext("webgl2");
  twgl.addExtensionsToContext(gl);

  // This is for driving image rendering shaders
  sweepArrays = {
    position: {numComponents: 2, data: [-1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1]},
  };
  sweepBufferInfo = twgl.createBufferInfoFromArrays(gl, sweepArrays);

  // This is for driving particle update and render shaders
  particleArrays = {
    index: {numComponents: 1, data: []},
  };
  for (let i = 0; i < nParticles; ++i)
    particleArrays.index.data.push(i);
  particleBufferInfo = twgl.createBufferInfoFromArrays(gl, particleArrays);

  // Particle state data textures
  szParticleState = Math.ceil(Math.sqrt(nParticles));
  const dtParticleState0 = new Float32Array(szParticleState * szParticleState * 4);
  for (let i = 0; i < nParticles; ++i) {
    const x = w * Math.random();
    const y = h * Math.random();
    dtParticleState0[i * 4] = x;
    dtParticleState0[i * 4 + 1] = y;
  }
  txParticleState0 = twgl.createTexture(gl, {
    internalFormat: gl.RGBA32F,
    format: gl.RGBA,
    type: gl.FLOAT,
    width: szParticleState,
    height: szParticleState,
    src: dtParticleState0,
  });
  const dtParticleState1 = new Float32Array(szParticleState * szParticleState * 4);
  dtParticleState1.fill(0);
  txParticleState1 = twgl.createTexture(gl, {
    internalFormat: gl.RGBA32F,
    format: gl.RGBA,
    type: gl.FLOAT,
    width: szParticleState,
    height: szParticleState,
    src: dtParticleState1,
  });

  const dtRender0 = new Uint8Array(w * h * 4);
  dtRender0.fill(0);
  txOutput0 = twgl.createTexture(gl, {
    internalFormat: gl.RGBA,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
    width: w,
    height: h,
    src: dtRender0,
  });

  const dtRender1 = new Uint8Array(w * h * 4);
  dtRender1.fill(0);
  txOutput1 = twgl.createTexture(gl, {
    internalFormat: gl.RGBA,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
    width: w,
    height: h,
    src: dtRender1,
  });

  // Program: update particles
  progiParticleUpdate = twgl.createProgramInfo(gl, [sSweepVert, sParticleUpdateFrag]);

  // Program: render particles
  progiParticleRender = twgl.createProgramInfo(gl, [sParticleRenderVert, sParticleRenderFrag]);

  // Program: draw output
  progiOutputDraw = twgl.createProgramInfo(gl, [sSweepVert, sOutputDrawFrag]);

  requestAnimationFrame(frame);
}


function setupStatus() {
  const elm = document.getElementById("update");
  if (!elm) return;
  status = txt => elm.innerText = txt;
}


function updateRenderTimes(elapsed) {
  renderTimes[frameIx] = elapsed;
  frameIx = (frameIx + 1) % renderTimes.length;
  if (frameIx == 0) {
    let avg = 0;
    renderTimes.forEach(x => avg += x);
    avg /= renderTimes.length;
    let avgStr = avg.toFixed(1);
    while (avgStr.length < 5) avgStr = "0" + avgStr;
    status("Per frame: " + avgStr);
  }
}


function frame(time) {

  const startTime = performance.now();

  // Copy faded version of previous output to current
  // txOutput0 => txOutput1
  const unisBlend = {
    txOutput: txOutput0,
    blendMul: 0.9999,
    blendSub: 0.1,
  }
  let atmsBlend = [{attachment: txOutput1}];
  let fbufBlend = twgl.createFramebufferInfo(gl, atmsBlend, w, h);
  twgl.bindFramebufferInfo(gl, fbufBlend);
  gl.viewport(0, 0, w, h);
  gl.useProgram(progiOutputDraw.program);
  twgl.setBuffersAndAttributes(gl, progiOutputDraw, sweepBufferInfo);
  twgl.setUniforms(progiOutputDraw, unisBlend);
  twgl.drawBufferInfo(gl, sweepBufferInfo);


  // Update particle states: always tx0 => tx1, then swap
  const unisParticleUpdate = {
    szParticleState: szParticleState,
    txPrev: txParticleState0,
    resolution: [w, h],
    time: time,
  };
  let atmsPU = [{attachment: txParticleState1}];
  let fbufPU = twgl.createFramebufferInfo(gl, atmsPU, szParticleState, szParticleState);
  twgl.bindFramebufferInfo(gl, fbufPU);
  gl.viewport(0, 0, szParticleState, szParticleState);
  gl.useProgram(progiParticleUpdate.program);
  twgl.setBuffersAndAttributes(gl, progiParticleUpdate, sweepBufferInfo);
  twgl.setUniforms(progiParticleUpdate, unisParticleUpdate);
  twgl.drawBufferInfo(gl, sweepBufferInfo);
  [txParticleState0, txParticleState1] = [txParticleState1, txParticleState0];


  // Render particles to texture
  // This goes on top of txOutput1, which now has faded previous image
  const unisParticleRender = {
    particles: txParticleState0,
    szParticleState: szParticleState,
    resolution: [w, h],
    pointSize: 1 * devicePixelRatio,
  };
  let atmsPR = [{attachment: txOutput1}];
  let fbufPR = twgl.createFramebufferInfo(gl, atmsPR, w, h);
  twgl.bindFramebufferInfo(gl, fbufPR);
  gl.viewport(0, 0, w, h);
  gl.useProgram(progiParticleRender.program);
  twgl.setBuffersAndAttributes(gl, progiParticleRender, particleBufferInfo);
  twgl.setUniforms(progiParticleRender, unisParticleRender);
  twgl.drawBufferInfo(gl, particleBufferInfo, gl.POINTS);


  // Draw texture to screen
  const unisDraw = {
    txOutput: txOutput1,
    blendMul: 1,
    blendSub: 0,
  };
  twgl.bindFramebufferInfo(gl, null);
  gl.viewport(0, 0, w, h);
  gl.useProgram(progiOutputDraw.program);
  twgl.setBuffersAndAttributes(gl, progiOutputDraw, sweepBufferInfo);
  twgl.setUniforms(progiOutputDraw, unisDraw);
  twgl.drawBufferInfo(gl, sweepBufferInfo);

  // Swap output textures: current image becomes fadable background for next
  [txOutput0, txOutput1] = [txOutput1, txOutput0];

  updateRenderTimes(performance.now() - startTime);

  if (params.animate) requestAnimationFrame(frame);
}
