import sSweepVert from "shdr-hatch/sweep-vert.glsl";
import sSceneFrag from "shdr-scene/scene-frag.glsl";
import sParticleRenderVert from "shdr-hatch/particle-render-vert.glsl";
import sParticleRenderFrag from "shdr-hatch/particle-render-frag.glsl";
import sParticleUpdateFrag from "shdr-hatch/particle-update-frag.glsl";
import sOutputDrawFrag from "shdr-hatch/output-draw-frag.glsl";
import sGist from "./gist.glsl";

import {init} from "../../src/init.js";
import * as twgl from "twgl.js";
import * as H from "./history.js";
import {Editor} from "./editor.js";

// TODO:
// OK Add initial gist to editor
// OK Recompile programs on Cmd+Enter; syntax flash
// OK Re-init on full screen mode
// OK Rename scene shaders
// OK Add fragment update to gist
// OK Save all non-erroring gist versions in localStorage; save
// -- Serve without watch
// -- Only one light
// -- Add light/cam params to gist


const nParticles = 8096 * 16;

let editor;
let webGLCanvas, gl, w, h;
let sdfW = 480, sdfH;
let seqId, newSeq, seqTimeStart;
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
    azimuth: 0.0001,
    altitude: 0,
    distance: 20,
  },
  lights: {
    l1_azimuth: -75,
    l1_altitude: 60,
    l1_strength: 0.3,
    l2_azimuth: 35,
    l2_altitude: 80,
    l2_strength: 0.1,
    amb_strength: 0.07,
  },
}

// Textures
// [sqrtnumpart]  particle state
// [imgsize]      scene render: dlum; dist; light; id
// [imgsize]      particle render

document.body.classList.add("full");
init(setup, true);

function setup() {

  setupEditor();

  // This sketch doesn't use footer, or 2D canvas
  document.getElementsByTagName("footer")[0].style.display = "none";
  document.getElementById("canv2d").style.display = "none";

  // 3D WebGL canvas, and twgl
  webGLCanvas = document.getElementById("canv3d");
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

  // Particle state data textures
  szParticleState = Math.ceil(Math.sqrt(nParticles));
  const dtParticleState0 = new Float32Array(szParticleState * szParticleState * 4);
  for (let i = 0; i < nParticles; ++i) {
    const x = webGLCanvas.width * Math.random();
    const y = webGLCanvas.height * Math.random();
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

  initRenderRextures();
  initGistSeq();
  initPrograms();

  window.addEventListener("resize", () => {
    resizeCanvas();
    initRenderRextures()
  });

  requestAnimationFrame(frame);
}

function resizeCanvas() {
  let elmWidth = window.innerWidth;
  let elmHeight = window.innerHeight;
  webGLCanvas.style.width = elmWidth + "px";
  webGLCanvas.style.height = elmHeight + "px";
  w = webGLCanvas.width = elmWidth * devicePixelRatio;
  h = webGLCanvas.height = elmHeight * devicePixelRatio;
}

function initRenderRextures() {

  // Current canvas size
  w = webGLCanvas.width;
  h = webGLCanvas.height;
  sdfH = Math.round(sdfW * h / w);

  // SDF scene renderer's output texture
  const dtScene = new Float32Array(sdfW * sdfH * 4);
  dtScene.fill(0);
  if (txScene) gl.deleteTexture(txScene);
  txScene = twgl.createTexture(gl, {
    internalFormat: gl.RGBA32F,
    format: gl.RGBA,
    type: gl.FLOAT,
    width: sdfW,
    height: sdfH,
    src: dtScene,
  });

  // First pingpong output texture
  const dtRender0 = new Uint8Array(w * h * 4);
  dtRender0.fill(0);
  if (txOutput0) gl.deleteTexture(txOutput0);
  txOutput0 = twgl.createTexture(gl, {
    internalFormat: gl.RGBA,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
    width: w,
    height: h,
    src: dtRender0,
  });

  // Other pingpong output texture
  const dtRender1 = new Uint8Array(w * h * 4);
  dtRender1.fill(0);
  if (txOutput1) gl.deleteTexture(txOutput1);
  txOutput1 = twgl.createTexture(gl, {
    internalFormat: gl.RGBA,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
    width: w,
    height: h,
    src: dtRender1,
  });
}

function initPrograms() {

  const firstInit = progiScene ? false : true;

  // The "gist" of the shader programs that's live-edited
  let gist = sGist;
  if (editor) gist = editor.cm.doc.getValue();
  const ph = "// GIST.GLSL"; // Placeholder text

  const del = pi => { if (pi && pi.program) gl.deleteProgram(pi.program); }
  const recreate = (v, f) => twgl.createProgramInfo(gl, [v.replace(ph, gist), f.replace(ph, gist)]);

  // Renders SDF scene
  const npScene = recreate(sSweepVert, sSceneFrag);

  // Updates particles
  const npParticleUpdate = recreate(sSweepVert, sParticleUpdateFrag);

  // Renders particles
  const npParticleRender = recreate(sParticleRenderVert, sParticleRenderFrag);

  // Draw to an output texture
  const npOutputDraw = recreate(sSweepVert, sOutputDrawFrag);

  const elmBg = document.getElementById("editorBg");
  if (!npScene || !npParticleUpdate || !npParticleRender || !npOutputDraw) {
    elmBg.classList.add("error");
    setTimeout(() => elmBg.classList.remove("error"), 200);
    return;
  }

  del(progiScene);
  progiScene = npScene;
  del(progiParticleUpdate);
  progiParticleUpdate = npParticleUpdate;
  del(progiParticleRender);
  progiParticleRender = npParticleRender;
  del(progiOutputDraw);
  progiOutputDraw = npOutputDraw;

  if (!firstInit) {
    // Flash
    elmBg.classList.add("apply");
    setTimeout(() => elmBg.classList.remove("apply"), 200);
    // Store this revision
    if (H.storeGist(editor.cm.getValue(), seqId))
      ++seqId;
  }

  newSeq = true;
}

function setupEditor() {
  const elmShaderEditorBox = document.getElementById("shaderEditorBox");
  elmShaderEditorBox.style.display = "block";
  editor = new Editor(elmShaderEditorBox);
  editor.onSubmit = () => initPrograms();
  editor.onFullScreen = () => document.documentElement.requestFullscreen();

  document.body.addEventListener("keydown", e => {
    let handled = false;
    if (e.metaKey && e.key == "e") {
      if (editor.cm.hasFocus()) editor.cm.display.input.blur();
      else editor.cm.display.input.focus();
      handled = true;
    }
    if (e.metaKey && e.key == "s") {
      H.saveHistory(e.shiftKey);
      if (e.shiftKey) seqId = 0;
      handled = true;
    }
    if (handled) {
      e.preventDefault();
      return false;
    }
  });
}

function initGistSeq() {
  let lastGist;
  [seqId, lastGist] = H.getLatestGist();
  if (lastGist) editor.cm.setValue(lastGist);
  else editor.cm.setValue(sGist);
}

const angleToVec = (azimuth, altitude) => {
  return [
    Math.cos(Math.PI * altitude / 180) * Math.sin(Math.PI * azimuth / 180),
    Math.sin(Math.PI * altitude / 180),
    Math.cos(Math.PI * altitude / 180) * Math.cos(Math.PI * altitude / 180)]
};

function frame(time) {

  if (newSeq) {
    seqTimeStart = time;
    newSeq = false;
  }
  const seqTime = time - seqTimeStart;

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
    txPrev: txParticleState0,
    txScene: txScene,
    sceneRes: [sdfW, sdfH],
    trgRes: [w, h],
    time: time,
    xrnd: Math.random(),
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

  if (params.animate) requestAnimationFrame(frame);
}
