import {init} from "../../src/init.js";
import * as twgl from "twgl.js";
import fs from "./frag.glsl";
import vs from "./vert.glsl";

init(doShit, false);

function doShit() {
  const canvasC = document.getElementById("c");
  const w = canvasC.width;
  const h = canvasC.height;
  const gl = document.querySelector("#c").getContext("webgl2");
  twgl.addExtensionsToContext(gl);
  const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

  const arrays = {
    position: {numComponents: 2, data: [-1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1]},
  };
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  const uniforms = {
    time: 0,
    resolution: [gl.canvas.width, gl.canvas.height],
  };
  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.setUniforms(programInfo, uniforms);

  const attachments = [
    { format: gl.RGBA },
  ];

  twgl.drawBufferInfo(gl, bufferInfo);

  const frameBufferInfo = twgl.createFramebufferInfo(gl, attachments, w, h);
  twgl.bindFramebufferInfo(gl, frameBufferInfo);
  twgl.drawBufferInfo(gl, bufferInfo);

  let txData = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, txData);

  const canvasD = document.getElementById("d");
  const ctx = canvasD.getContext("2d");
  const imgd = ctx.getImageData(0, 0, w, h);
  const clr = [0, 0, 0];
  for (let x = 0; x < w; ++x) {
    for (let y = 0; y < h; ++y) {
      const r = txData[(y * w + x) * 4];
      const g = txData[(y * w + x) * 4 + 1];
      const b = txData[(y * w + x) * 4 + 2];
      setPixel(imgd, x, h - y, r, g, b);
    }
  }
  ctx.putImageData(imgd, 0, 0);
}


function setPixel(imgd, x, y, r, g, b) {
  const w = imgd.width;
  imgd.data[(y * w + x) * 4] = Math.round(r);
  imgd.data[(y * w + x) * 4 + 1] = Math.round(g);
  imgd.data[(y * w + x) * 4 + 2] = Math.round(b);
  imgd.data[(y * w + x) * 4 + 3] = 255;
}
