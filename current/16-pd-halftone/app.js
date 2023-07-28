import sSweepVert from "shdr-share/sweep-vert.glsl";
import sSceneFrag from "shdr-scene/scene-frag.glsl";
import sRenderFrag from "shdr-render/render-frag.glsl";
import sGist from "./gist.glsl";

import {init} from "../../src/init.js";
import * as twgl from "twgl.js";
import * as H from "./history.js";
import {Editor} from "./editor.js";
import {rand} from "../../src/random";

const imgUrl1= "imgs/01-taucher.jpg";
const imgUrl2= "imgs/02-kopfstand.jpg";

const wsPort = 2908;

let editor;
let webGLCanvas, gl, w, h;
let sdfW = 480, sdfH;
let seqId, newSeq, seqTimeStart;
let sweepArrays, sweepBufferInfo;         // Used to drive simple vertex shader behind fragment renderers
let txImg1, img1W, img1H;                 // Image to render
let txPrev;                               // Previous texture, to delete
let txScene;                              // Texture holding SDF scene and direction/darkness/depth
let progiScene;                           // Draws raytraced SDF scene
let progiRender;                          // Renders final image

const params = {
  animate: true,
  dotRad: 3,
};

const ctrl = {
  bpm: 125,
  note: 0,
  tick: 0,
  vala: 0,
  valb: 0,
  valc: 0,
  suma: 0,
  sumb: 0,
  sumc: 0,
  m1: 0,
  m2: 0,
  m3: 0,
  m4: 0,
  m5: 0,
  m6: 0,
  m7: 0,
  s1: 0,
};

document.body.classList.add("full");
init(setup, true);

async function setup() {

  initSocket();
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

  // Current canvas size
  w = webGLCanvas.width;
  h = webGLCanvas.height;

  // Image(s) to render
  await loadImageTextures();

  initSceneTexture();
  initGistSeq();
  initPrograms();

  window.addEventListener("resize", () => {
    resizeCanvas();
  });

  requestAnimationFrame(frame);
}

function initSceneTexture() {

  sdfW = Math.round(w / params.dotRad / 2);
  sdfH = Math.round(sdfW * h / w);

  const dtScene = new Float32Array(sdfW * sdfH * 4);
  dtScene.fill(0);
  if (txScene) gl.deleteTexture(txScene);
  txScene = twgl.createTexture(gl, {
    internalFormat: gl.RGBA16F,
    format: gl.RGBA,
    type: gl.FLOAT,
    width: sdfW,
    height: sdfH,
    src: dtScene,
    min: gl.LINEAR,
    max: gl.LINEAR,
  });
}

const clip1 = {
  prefi: "g",
  mini: 93,
  maxi: 108,
};

const clip2 = {
  prefi: "h",
  mini: 130,
  maxi: 328,
};

const clip3 = {
  prefi: "i",
  mini: 11,
  maxi: 645,
};

const clip4 = {
  prefi: "gt",
  mini: 1,
  maxi: 242,
};

const bgCtrl = {
  s1: -1,
  clip: null,
}

async function movieTick(count) {
  if (bgCtrl.clip == null) return;
  bgCtrl.curri += Math.round(count);
  const len = bgCtrl.clip.maxi - bgCtrl.clip.mini;
  while (bgCtrl.curri < bgCtrl.clip.mini) bgCtrl.curri += len;
  while (bgCtrl.curri > bgCtrl.clip.maxi) bgCtrl.curri -= len;
  await loadImageTextures();
}

async function loadImageTextures() {

  const needToLoad = bgCtrl.s1 != ctrl.s1 || bgCtrl.clip != null;
  if (!needToLoad) return;

  let url = imgUrl1;

  if (ctrl.s1 != bgCtrl.s1) {
    bgCtrl.s1 = ctrl.s1;
    if (bgCtrl.s1 == 1) bgCtrl.clip = clip1;
    else if (bgCtrl.s1 == 2) bgCtrl.clip = clip2;
    else if (bgCtrl.s1 == 3) bgCtrl.clip = clip3;
    else if (bgCtrl.s1 == 4) bgCtrl.clip = clip4;
    else bgCtrl.clip = null;
    if (bgCtrl.clip != null) bgCtrl.curri = bgCtrl.clip.mini;
    if (bgCtrl.s1 == 6) url = imgUrl2;
  }

  if (bgCtrl.clip != null) {
    let ix = bgCtrl.curri.toString().padStart(4, '0');
    url = "imgs/im" + bgCtrl.clip.prefi + "_" + ix + ".png";
  }

  return new Promise((resolve, reject) => {
    if (txPrev) {
      gl.deleteTexture(txPrev);
      txPrev = null;
    }
    if (txImg1) txPrev = txImg1;
    twgl.createTexture(gl, { src: url, mag: gl.NEAREST }, (err, texture, source) => {
      if (err) {
        reject(err);
      }
      else {
        txImg1 = texture;
        img1W = source.width;
        img1H = source.height;
        resolve();
      }
    });
  });
}

function handleVal(name, val) {
}

function handleCtrlMessage(msg) {
  const parts = msg.split(" ");
  if (parts.length < 2) return;
  const name = parts[0];
  if (!ctrl.hasOwnProperty(name)) return;
  const val = parseFloat(parts[1]);
  if (name.startsWith("val")) {
    ctrl[name] = val;
    const n2 = name.replace("val", "sum");
    ctrl[n2] += val;
    handleVal(name, val);
  }
  else if (name.startsWith("m")) {
    ctrl[name] = 2 * val + parseFloat(parts[2]);
  }
  else if (name == "tick") {
    ctrl[name] = val;
    movieTick(1);
  }
  else if (name == "s1") {
    ctrl[name] = val;
    loadImageTextures();
  }
  else ctrl[name] = val;

}

function initSocket() {
  const socket = new WebSocket("ws://localhost:" + wsPort);
  socket.addEventListener("open", () => {
    console.log("WebSocket connection opened");
  });
  socket.addEventListener("message", (event) => {
    const msg = event.data;
    if (msg.startsWith("//GIST")) {
      console.log("Received gist (" + msg.length + " bytes)");
      editor.cm.doc.setValue(msg);
      initPrograms();
    }
    else {
      const items = msg.split("\n").map(line => line.trim().replace(/;+$/, ""));
      // console.log(msg); // DBG
      for (const itm of items) {
        handleCtrlMessage(itm);
      }
    }
  });
  socket.addEventListener("close", () => {
    console.log("WebSocket connection closed");
  });
}

function resizeCanvas() {
  let elmWidth = window.innerWidth;
  let elmHeight = window.innerHeight;
  webGLCanvas.style.width = elmWidth + "px";
  webGLCanvas.style.height = elmHeight + "px";
  w = webGLCanvas.width = elmWidth * devicePixelRatio;
  h = webGLCanvas.height = elmHeight * devicePixelRatio;

  initSceneTexture();
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

  // Render output
  const npRender = recreate(sSweepVert, sRenderFrag);

  const elmBg = document.getElementById("editorBg");
  if (!npScene || !npRender) {
    elmBg.classList.add("error");
    setTimeout(() => elmBg.classList.remove("error"), 200);
    return;
  }

  del(progiScene);
  progiScene = npScene;
  del(progiRender);
  progiRender = npRender;

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

function frame(time) {

  if (newSeq) {
    seqTimeStart = time;
    newSeq = false;
  }
  const seqTime = time - seqTimeStart;

  const addCtrl = unis => {
    for (const key in ctrl)
      unis["c_"+key] = ctrl[key];
  }

  // Render SDF scene
  const unisSDF = {
    time: time,
    resolution: [sdfW, sdfH],
  };
  addCtrl(unisSDF);
  let atmsScene = [{attachment: txScene}];
  let fbufScene = twgl.createFramebufferInfo(gl, atmsScene, sdfW, sdfH);
  twgl.bindFramebufferInfo(gl, fbufScene);
  // twgl.bindFramebufferInfo(gl, null);
  gl.viewport(0, 0, sdfW, sdfH);
  gl.useProgram(progiScene.program);
  twgl.setBuffersAndAttributes(gl, progiScene, sweepBufferInfo);
  twgl.setUniforms(progiScene, unisSDF);
  twgl.drawBufferInfo(gl, sweepBufferInfo);

  // Render scene texture to screen
  const unisDraw = {
    time: time,
    dotRad: params.dotRad,
    txImg1: txImg1,
    img1Res: [img1W, img1H],
    txScene: txScene,
    sceneRes: [sdfW, sdfH],
    trgRes: [w, h],
  };
  addCtrl(unisDraw);
  twgl.bindFramebufferInfo(gl, null);
  gl.viewport(0, 0, w, h);
  gl.useProgram(progiRender.program);
  twgl.setBuffersAndAttributes(gl, progiRender, sweepBufferInfo);
  twgl.setUniforms(progiRender, unisDraw);
  twgl.drawBufferInfo(gl, sweepBufferInfo);

  if (params.animate) requestAnimationFrame(frame);
}
