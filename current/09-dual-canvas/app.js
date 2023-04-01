import {init} from "../../src/init.js";
import * as twgl from "twgl.js";
import vs from "./vert.glsl";
import fs from "./frag.glsl";
import fs_normals from "./frag_normals.glsl";

init(doShit, false);

function doShit() {
  const canvasC = document.getElementById("c");
  const w = canvasC.width;
  const h = canvasC.height;
  const gl = document.querySelector("#c").getContext("webgl2");
  twgl.addExtensionsToContext(gl);

  const arrays = {
    position: {numComponents: 2, data: [-1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1]},
  };
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  const uniforms = {
    time: 0,
    resolution: [gl.canvas.width, gl.canvas.height],
  };

  // const prog1 = twgl.createProgramInfo(gl, [vs, fs]);
  // gl.useProgram(prog1.program);
  // twgl.setBuffersAndAttributes(gl, prog1, bufferInfo);
  // twgl.setUniforms(prog1, uniforms);
  // twgl.drawBufferInfo(gl, bufferInfo);

  const progNormals = twgl.createProgramInfo(gl, [vs, fs_normals]);
  gl.useProgram(progNormals.program);
  twgl.setBuffersAndAttributes(gl, progNormals, bufferInfo);
  twgl.setUniforms(progNormals, uniforms);
  const attachments = [{internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT}];
  const frameBufferInfo = twgl.createFramebufferInfo(gl, attachments, w, h);
  twgl.bindFramebufferInfo(gl, frameBufferInfo);
  twgl.drawBufferInfo(gl, bufferInfo);

  let txData = new Float32Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, txData);

  const canvasD = document.getElementById("d");
  const ctx = canvasD.getContext("2d");
  const imgd = ctx.getImageData(0, 0, w, h);
  const clr = [0, 0, 0];
  for (let x = 0; x < w; ++x) {
    for (let y = 0; y < h; ++y) {
      const r = txData[(y * w + x) * 4] * 255;
      const g = txData[(y * w + x) * 4 + 1] * 255;
      const b = txData[(y * w + x) * 4 + 2] * 255;
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
