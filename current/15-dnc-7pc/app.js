import sSweepVert from "shdr-hatch/sweep-vert.glsl";
import sSceneFrag from "shdr-scene/scene-frag.glsl";
import sParticleRenderVert from "shdr-hatch/particle-render-vert.glsl";
import sParticleRenderFrag from "shdr-hatch/particle-render-frag.glsl";
import sParticleUpdateFrag from "shdr-hatch/particle-update-frag.glsl";
import sOutputDrawFrag from "shdr-hatch/output-draw-frag.glsl";
import sGist from "./gist.glsl";

import {init} from "../../src/init.js";
import * as twgl from "twgl.js";
import {figurePtKeys, loadDanceData} from "./dance-data.js";
import * as H from "./history.js";
import {Editor} from "./editor.js";

// TODO:
// -- Only one light
// -- Add light/cam params to gist


const nParticles = 8096 * 10;

// let danceUrl = "dance/Tricky_MerakiCrew_Kye.json"; // !!
// let danceUrl = "dance/Roar_MerakiCrew_Lay.json"; // on the knee
// let danceUrl = "dance/Peaches_MerakiCrew_Vivi.json";
let danceUrl = "dance/Unforgiven_MerakiCrew_Amelie.json";
// let danceUrl = "dance/Advice_MerakiCrew_Ace.json";
// let danceUrl = "dance/LaDiDa_MerakiCrew_Kian.json";
// let danceUrl = "dance/Tango_Vals_by_Uwe_Bethke.json";
// let danceUrl = "dance/TheLover_Opening.json";
// let danceUrl = "dance/TheLoverChiarasSolo_frontal_by_Marco_Goecke.json";
// let danceUrl = "dance/WalkTheDemon_frontal_by_Marco_Goecke.json";
// let danceUrl = "dance/Tue_frontal_by_Marco_Goecke.json";
// let danceUrl = "dance/unAutreJour_frontal_by_Ken_Ossola.json"; // ballet
// let danceUrl = "dance/DerLiebhaber_frontal_by_Marco_Goecke.json"; // !!
// let danceUrl = "dance/Edge_Me_Away_by_Emrecan_Tanis.json";
// let danceUrl = "dance/Firebird_frontal_by_Marco_Goecke.json";
// let danceUrl = "dance/Impro_frontal_by_Chiara_Pareo.json"; // *!!
// let danceUrl = "dance/Milk_frontal_by_Guillaume_Hulot.json"; // *!!
// let danceUrl = "dance/Moonlight_frontal_by_Juliano_Nunes.json";
// let danceUrl = "dance/SometimesIwakeup_frontal_by_Chiara_Pareo.json";
// let danceUrl = "dance/sway_frontal_by_Medhi_Walerski.json";
// let danceUrl = "dance/Tagada_frontal_by_Sofia_Nappi.json";
// let danceUrl = "dance/.json";
// let danceUrl = "dance/.json";
// let danceUrl = "dance/.json";

let danceData1, nDncPtKeys1, nDncFrames1, nDncFramesPerRow1;
let danceData2, nDncPtKeys2, nDncFrames2, nDncFramesPerRow2;

let editor;
let webGLCanvas, gl, w, h;
let sdfW = 480, sdfH;
let seqId, newSeq, seqTimeStart;
let sweepArrays, sweepBufferInfo;         // Used to drive simple vertex shader behind fragment renderers
let particleArrays, particleBufferInfo;   // Used to drive paricle state compute shader, and particle renderer
let txDnc1, txDnc2;                       // Textures holding dance frames
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
}

// Textures
// [sqrtnumpart]  particle state
// [imgsize]      scene render: dlum; dist; light; id
// [imgsize]      particle render

document.body.classList.add("full");
init(setup, true);

async function setup() {

  danceData1 = await loadDanceData(danceUrl);
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

  initDanceTexture();

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

function initDanceTexture() {

  const doInit = data => {
    // A roughly square texture, where each row holds an X number of full frames
    const nDanceFrames = data.length;
    const nDancePtKeys = figurePtKeys.length;
    let sz = Math.ceil(Math.sqrt(nDanceFrames * nDancePtKeys));
    const nDanceFramesPerRow = Math.ceil(sz / nDancePtKeys);
    const txw = nDanceFramesPerRow * nDancePtKeys;
    const txh = Math.ceil(nDanceFrames * nDancePtKeys / txw);

    const dtDance = new Float32Array(txw * txh * 4);
    let i = 0;
    for (let iFrame = 0; iFrame < nDanceFrames; ++iFrame) {
      for (let iKey = 0; iKey < nDancePtKeys; ++iKey) {
        for (let n = 0; n < 4; ++n) {
          dtDance[i] = data[iFrame][iKey][n];
          ++i;
        }
      }
    }
    const txDance = twgl.createTexture(gl, {
      internalFormat: gl.RGBA32F,
      format: gl.RGBA,
      type: gl.FLOAT,
      width: txw,
      height: txh,
      src: dtDance,
    });
    return [nDanceFrames, nDancePtKeys, nDanceFramesPerRow, txDance];
  }

  [nDncFrames1, nDncPtKeys1, nDncFramesPerRow1, txDnc1] = doInit(danceData1);
  danceData1 = null;
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
  const elmCredits = document.getElementById("credits");
  const elmShaderEditorBox = document.getElementById("shaderEditorBox");
  elmShaderEditorBox.style.display = "block";
  editor = new Editor(elmShaderEditorBox);
  editor.onSubmit = () => initPrograms();
  editor.onFullScreen = () => document.documentElement.requestFullscreen();

  document.body.addEventListener("keydown", e => {
    let handled = false;
    if (e.metaKey && e.key == "e") {
      if (editor.cm.hasFocus()) editor.cm.display.input.blur();
      else {
        editor.cm.display.input.focus();
        elmCredits.classList.remove("visible");
      }
      handled = true;
    }
    if (e.metaKey && e.key == "s") {
      H.saveHistory(e.shiftKey);
      if (e.shiftKey) seqId = 0;
      handled = true;
    }
    if (e.metaKey && e.key == "d") {
      if (elmCredits.classList.contains("visible")) {
        elmCredits.classList.remove("visible");
      }
      else {
        editor.cm.display.input.blur();
        elmCredits.classList.add("visible");
      }
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
    curvatureLight: params.curvature_light,
    txDnc1, nDncPtKeys1, nDncFrames1, nDncFramesPerRow1,
    // txDnc2, nDncPtKeys2, nDncFrames2, nDncFramesPerRow2,
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
    // pointSize: 1 * devicePixelRatio,
  };
  // unisParticleRender.pointSize = 1;
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
