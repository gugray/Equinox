import sSweepVert from "shaders/sweep-vert.glsl";
import sFrag0 from "shaders/frag0.glsl";
import sFrag1 from "shaders/frag1.glsl";
import sGist from "./gist.glsl";

import {init} from "../../src/init.js";
import * as twgl from "twgl.js";
import * as H from "./history.js";
import {Editor} from "./editor.js";

let editor;
let webGLCanvas, gl, w, h;
let seqId, newSeq, seqTimeStart;
let sweepArrays, sweepBufferInfo;         // Used to drive simple vertex shader behind fragment renderers
let txOutput0;                            // Interim rendered output
let txNoise;                              // Noise texture
let progi0, progi1;                       // Programs for interim and final output

let animating;
const hiRes = false;

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

  loadNoiseTexture(() => {
    initAnimating();
    initRenderTextures();
    initGistSeq();
    initPrograms();
  });

  window.addEventListener("resize", () => {
    resizeCanvas();
    initRenderTextures()
  });
}

function loadNoiseTexture(ready) {
  txNoise = twgl.createTexture(gl, {
    src: "rgba64.png",
  }, ready);
}

function resizeCanvas() {
  let elmWidth = window.innerWidth;
  let elmHeight = window.innerHeight;
  webGLCanvas.style.width = elmWidth + "px";
  webGLCanvas.style.height = elmHeight + "px";
  if (hiRes) {
    w = webGLCanvas.width = elmWidth * devicePixelRatio;
    h = webGLCanvas.height = elmHeight * devicePixelRatio;
  }
  else {
    w = webGLCanvas.width = elmWidth;
    h = webGLCanvas.height = elmHeight;
  }
}

function initAnimating() {
  animating = true;
  try {
    const json = localStorage.getItem("animating");
    if (json) animating = JSON.parse(json);
  }
  catch {}
}

function setAnimating(val) {
  animating = val;
  localStorage.setItem("animating", JSON.stringify(animating));
}

function initRenderTextures() {

  // Current canvas size
  w = webGLCanvas.width;
  h = webGLCanvas.height;

  // Interim output texture
  const dtOutput0 = new Uint8Array(w * h * 4);
  dtOutput0.fill(0);
  txOutput0 = twgl.createTexture(gl, {
    internalFormat: gl.RGBA,
    format: gl.RGBA,
    type: gl.UNSIGNED_BYTE,
    width: w,
    height: h,
    src: dtOutput0,
  });
}

function initPrograms() {

  const firstInit = progi0 ? false : true;

  // The "gist" of the shader programs that's live-edited
  let gist = sGist;
  if (editor) gist = editor.cm.doc.getValue();
  const ph = "// GIST.GLSL"; // Placeholder text

  const del = pi => { if (pi && pi.program) gl.deleteProgram(pi.program); }
  const recreate = (v, f) => twgl.createProgramInfo(gl, [v.replace(ph, gist), f.replace(ph, gist)]);

  const np0 = recreate(sSweepVert, sFrag0);
  const np1 = recreate(sSweepVert, sFrag1);

  const elmBg = document.getElementById("editorBg");
  if (!np0 || !np0) {
    elmBg.classList.add("error");
    setTimeout(() => elmBg.classList.remove("error"), 200);
    return;
  }

  del(progi0);
  progi0 = np0;
  del(progi1);
  progi1 = np1;

  if (!firstInit) {
    // Flash
    elmBg.classList.add("apply");
    setTimeout(() => elmBg.classList.remove("apply"), 200);
    // Store this revision
    if (H.storeGist(editor.cm.getValue(), seqId))
      ++seqId;
  }

  newSeq = true;

  requestAnimationFrame(frame);

}

function setupEditor() {
  const elmShaderEditorBox = document.getElementById("shaderEditorBox");
  elmShaderEditorBox.style.display = "block";
  editor = new Editor(elmShaderEditorBox);
  editor.onSubmit = () => initPrograms();
  editor.onFullScreen = () => document.documentElement.requestFullscreen();

  document.body.addEventListener("keydown", e => {
    let handled = false;
    if (e.metaKey && e.key == "m") {
      setAnimating(!animating);
      if (animating) requestAnimationFrame(frame);
      handled = true;
    }
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

function frame(time) {

  if (newSeq) {
    seqTimeStart = time;
    newSeq = false;
  }
  const seqTime = time - seqTimeStart;

  // Render first pass to texture
  const unis0 = {
    time: time,
    res: [w, h],
    txNoise: txNoise,
  };
  let atms0 = [{attachment: txOutput0}];
  let fbuf0 = twgl.createFramebufferInfo(gl, atms0, w, h);
  twgl.bindFramebufferInfo(gl, fbuf0);
  gl.viewport(0, 0, w, h);
  gl.useProgram(progi0.program);
  twgl.setBuffersAndAttributes(gl, progi0, sweepBufferInfo);
  twgl.setUniforms(progi0, unis0);
  twgl.drawBufferInfo(gl, sweepBufferInfo);

  // Render second pass to screen
  const unis1 = {
    time: time,
    res: [w, h],
    txNoise: txNoise,
    tx0: txOutput0,
  };
  twgl.bindFramebufferInfo(gl, null);
  gl.viewport(0, 0, w, h);
  gl.useProgram(progi1.program);
  twgl.setBuffersAndAttributes(gl, progi1, sweepBufferInfo);
  twgl.setUniforms(progi1, unis1);
  twgl.drawBufferInfo(gl, sweepBufferInfo);

  if (animating) requestAnimationFrame(frame);
}
