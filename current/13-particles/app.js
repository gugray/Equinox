import sSweepVert from "shdr-hatch/sweep-vert.glsl";
import sSceneFrag from "shdr-scene/frag_mix.glsl";
import sParticleRenderVert from "shdr-hatch/particle-render-vert.glsl";
import sParticleRenderFrag from "shdr-hatch/particle-render-frag.glsl";
import sParticleUpdateFrag from "shdr-hatch/particle-update-frag.glsl";
import sOutputDrawFrag from "shdr-hatch/output-draw-frag.glsl";

import {init} from "../../src/init.js";
import * as twgl from "twgl.js";
import GUI from 'lil-gui';

const nParticles = 8096 * 4;

let gui;
let status = () => {};
let renderTimes = [], frameIx = 0;
let webGLCanvas, gl, w, h;
let sdfW = 480, sdfH;
let sweepArrays, sweepBufferInfo;         // Used to drive simple vertex shader behind fragment renderers
let particleArrays, particleBufferInfo;   // Used to drive paricle state compute shader, and particle renderer
let szParticleState;                      // Size of (square-shaped) particle state textures
let txParticleState0, txParticleState1;   // Texture holding state of particles. Pingpong.
let txScene;                              // Texture holding SDF scene and direction/darkness/depth
let txOutput0, txOutput1;                 // The rendered output: faded between frames, new particles drawn on top
let progiScene;                           // Renders SDF scene
let progiParticleUpdate;                  // Updates particle states
let progiParticleRender;                  // Render particles
let progiOutputDraw;                      // Copies/blends texture to other texture, or to screen

const params = {
  animate: true,
  rotate: true,
  raw_scene: false,
  curvature_light: false,
  view: {
    fov: 45,
    azimuth: 0,
    altitude: 30,
    distance: 7,
  },
  lights: {
    l1_azimuth: -75,
    l1_altitude: 60,
    l1_strength: 0.3,
    l2_azimuth: -75,
    l2_altitude: 30,
    l2_strength: 0,
    amb_strength: 0.05,
  },
}

// Textures
// [sqrtnumpart]  particle state
// [imgsize x 2]  scene render; direction/darkness/depth
// [imgsize]      particle render

document.body.classList.add("full");
init(setup, true);

function setup() {

  webGLCanvas = document.getElementById("canv3d");
  w = webGLCanvas.width;
  h = webGLCanvas.height;
  sdfH = Math.round(sdfW * h / w);

  for (let i = 0; i < 60; ++i) renderTimes.push(0);
  frameIx = 0;
  // setupStatus();
  document.getElementsByTagName("footer")[0].style.display = "none";

  // This sketch doesn't use 2D canvas
  document.getElementById("canv2d").style.display = "none";

  // LIL-GUI and mouse
  // setupControls();

  // 3D WebGL canvas, and twgl
  gl = webGLCanvas.getContext("webgl2");
  twgl.addExtensionsToContext(gl);

  // This is for sweeping output range for pure fragment shaders
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

  // SDF scene renderer's output texture
  const dtScene = new Float32Array(sdfW * sdfH * 4);
  dtScene.fill(0);
  txScene = twgl.createTexture(gl, {
    internalFormat: gl.RGBA32F,
    format: gl.RGBA,
    type: gl.FLOAT,
    width: sdfW,
    height: sdfH,
    src: dtScene,
  });

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

  // Program: render scene
  progiScene = twgl.createProgramInfo(gl, [sSweepVert, sSceneFrag]);

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

let lastMsec = -1;
function updateRenderTimes(msecNow, msecRender) {
  if (lastMsec != -1) {
    renderTimes[frameIx] = msecNow - lastMsec;
    frameIx = (frameIx + 1) % renderTimes.length;
    if (frameIx == 0) {
      let val = 0;
      renderTimes.forEach(x => val += x);
      val /= renderTimes.length;
      val = 1000 / val;
      status("FPS: " + val.toFixed(1));
    }
  }
  lastMsec = msecNow;
}

const angleToVec = (azimuth, altitude) => {
  return [
    Math.cos(Math.PI * altitude / 180) * Math.sin(Math.PI * azimuth / 180),
    Math.sin(Math.PI * altitude / 180),
    Math.cos(Math.PI * altitude / 180) * Math.cos(Math.PI * altitude / 180)]
};

function frame(time) {

  const startTime = performance.now();

  // Render SDF scene
  const unisSDF = {
    time: params.rotate ? time : 0,
    resolution: [sdfW, sdfH],
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
  let atmsScene = [{attachment: txScene}];
  let fbufScene = twgl.createFramebufferInfo(gl, atmsScene, sdfW, sdfH);
  twgl.bindFramebufferInfo(gl, fbufScene);
  gl.viewport(0, 0, sdfW, sdfH);
  gl.useProgram(progiScene.program);
  twgl.setBuffersAndAttributes(gl, progiScene, sweepBufferInfo);
  twgl.setUniforms(progiScene, unisSDF);
  twgl.drawBufferInfo(gl, sweepBufferInfo);


  // Copy faded version of previous output to current
  // txOutput0 => txOutput1
  const unisBlend = {
    txSource: txOutput0,
    srcRes: [w, h],
    trgRes: [w, h],
    blendMul: 0.9999,
    blendSub: 0.01,
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
    txScene: txScene,
    sceneRes: [sdfW, sdfH],
    trgRes: [w, h],
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


  const unisDraw = {
    txSource: params.raw_scene ? txScene : txOutput1,
    srcRes: params.raw_scene ? [sdfW, sdfH] : [w, h],
    rawScene: params.raw_scene,
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

  updateRenderTimes(time, performance.now() - startTime);

  if (params.animate) requestAnimationFrame(frame);
}
