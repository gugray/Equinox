import vs from "./vert.glsl";
import fs from "./frag.glsl";
import fs_surface from "./frag_surface.glsl";
import fs_normals from "./frag_normals.glsl";
import fs_lights from "./frag_lights.glsl";

import {init} from "../../src/init.js";
import * as twgl from "twgl.js";

init(doShit, false);

function doShit() {

  const startTime = performance.now();

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

  const attachments = [{internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT}];
  const framebuf = twgl.createFramebufferInfo(gl, attachments, w, h);


  // Calculate surface coordinates
  const u_surface = {
    time: 0,
    resolution: [w, h],
  };
  const p_surface = twgl.createProgramInfo(gl, [vs, fs_surface]);
  gl.useProgram(p_surface.program);
  twgl.setBuffersAndAttributes(gl, p_surface, bufferInfo);
  twgl.setUniforms(p_surface, u_surface);
  twgl.bindFramebufferInfo(gl, framebuf);
  twgl.drawBufferInfo(gl, bufferInfo);
  // Fetch results
  const data_surface = new Float32Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, data_surface);
  const tx_surface = twgl.createTexture(gl, {
    internalFormat: gl.RGBA32F,
    format: gl.RGBA,
    type: gl.FLOAT,
    width: w,
    height: h,
    src: data_surface,
  });

  // Calculate surface normals
  const u_normals = {
    time: 0,
    resolution: [w, h],
    surface: tx_surface,
  };
  const p_normals = twgl.createProgramInfo(gl, [vs, fs_normals]);
  gl.useProgram(p_normals.program);
  twgl.setBuffersAndAttributes(gl, p_normals, bufferInfo);
  twgl.setUniforms(p_normals, u_normals);
  twgl.bindFramebufferInfo(gl, framebuf);
  twgl.drawBufferInfo(gl, bufferInfo);
  // Fetch results
  const data_normals = new Float32Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, data_normals);
  const tx_normals = twgl.createTexture(gl, {
    internalFormat: gl.RGBA32F,
    format: gl.RGBA,
    type: gl.FLOAT,
    width: w,
    height: h,
    src: data_normals,
  });

  // Calculate (and render) lighting
  const u_lights = {
    time: 0,
    resolution: [gl.canvas.width, gl.canvas.height],
    normals: tx_normals,
    surface: tx_surface,
  };
  const p_lights = twgl.createProgramInfo(gl, [vs, fs_lights]);
  gl.useProgram(p_lights.program);
  twgl.setBuffersAndAttributes(gl, p_lights, bufferInfo);
  twgl.setUniforms(p_lights, u_lights);
  twgl.bindFramebufferInfo(gl, null);
  twgl.drawBufferInfo(gl, bufferInfo);

  // const canvasD = document.getElementById("d");
  // const ctx = canvasD.getContext("2d");
  // const imgd = ctx.getImageData(0, 0, w, h);
  // const clr = [0, 0, 0];
  // for (let x = 0; x < w; ++x) {
  //   for (let y = 0; y < h; ++y) {
  //     const r = txNormals[(y * w + x) * 4] * 255;
  //     const g = txNormals[(y * w + x) * 4 + 1] * 255;
  //     const b = txNormals[(y * w + x) * 4 + 2] * 255;
  //     setPixel(imgd, x, h - y, r, g, b);
  //   }
  // }
  // ctx.putImageData(imgd, 0, 0);

  const endTime = performance.now();
  const elapsed = endTime - startTime;
  console.log(elapsed);

}


function setPixel(imgd, x, y, r, g, b) {
  const w = imgd.width;
  imgd.data[(y * w + x) * 4] = Math.round(r);
  imgd.data[(y * w + x) * 4 + 1] = Math.round(g);
  imgd.data[(y * w + x) * 4 + 2] = Math.round(b);
  imgd.data[(y * w + x) * 4 + 3] = 255;
}
