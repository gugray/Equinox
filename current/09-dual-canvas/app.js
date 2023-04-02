import vs from "./vert.glsl";
import fs from "./frag.glsl";
import fs_surface from "./frag_surface.glsl";
import fs_normals from "./frag_normals.glsl";
import fs_lights from "./frag_lights.glsl";
import fs_gradients from "./frag_gradients.glsl";

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
    resolution: [w, h],
    normals: tx_normals,
    surface: tx_surface,
  };
  const p_lights = twgl.createProgramInfo(gl, [vs, fs_lights]);
  gl.useProgram(p_lights.program);
  twgl.setBuffersAndAttributes(gl, p_lights, bufferInfo);
  twgl.setUniforms(p_lights, u_lights);
  twgl.bindFramebufferInfo(gl, null);
  twgl.drawBufferInfo(gl, bufferInfo);

  // Render again, fetch as data
  twgl.bindFramebufferInfo(gl, framebuf);
  twgl.drawBufferInfo(gl, bufferInfo);
  // Fetch results
  const data_difflight = new Float32Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, data_difflight);
  const tx_difflight = twgl.createTexture(gl, {
    internalFormat: gl.RGBA32F,
    format: gl.RGBA,
    type: gl.FLOAT,
    width: w,
    height: h,
    src: data_difflight,
  });

  // Calculate brightness gradients
  const u_gradients = {
    time: 0,
    resolution: [w, h],
    difflight: tx_difflight,
  };
  const p_gradients = twgl.createProgramInfo(gl, [vs, fs_gradients]);
  gl.useProgram(p_gradients.program);
  twgl.setBuffersAndAttributes(gl, p_gradients, bufferInfo);
  twgl.setUniforms(p_gradients, u_gradients);
  twgl.bindFramebufferInfo(gl, framebuf);
  twgl.drawBufferInfo(gl, bufferInfo);
  // Fetch results
  const data_gradients = new Float32Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, data_gradients);


  drawFieldGrid(15, (x, y, vec) => {
    getVec4(data_gradients, w, x, y, vec);
    const len = Math.sqrt(vec[0]**2 + vec[1]**2);
    vec[0] *= 10 / len;
    vec[1] *= 10 / len;
  });

  const endTime = performance.now();
  const elapsed = endTime - startTime;
  console.log(elapsed);

}

function drawFieldGrid(idealGridStep, getData) {
  const canvas = document.getElementById("d");
  const w = canvas.width;
  const h = canvas.height;
  const nx = Math.round((w-1) / idealGridStep);
  const xStep = (w-1)/nx;
  const ny = Math.round((h-1) / idealGridStep);
  const yStep = (h-1)/ny;

  const ctx = canvas.getContext("2d");
  const vec = [0, 0, 0, 0];
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  for (let ix = 0; ix <= nx; ++ix) {
    for (let iy = 0; iy <= ny - 1; ++iy) {
      const x = Math.round(ix * xStep);
      const y = Math.round(iy * yStep);
      getData(x, y, vec);
      const dx = Math.round(vec[0]);
      const dy = Math.round(vec[1]);
      ctx.moveTo(x, h - y - 1);
      ctx.lineTo(x + dx, h - y - dy - 1);
    }
  }
  ctx.stroke();
}

function getVec4(data, w, x, y, vec) {
  for (let i = 0; i < 4; ++i)
    vec[i] = data[(y * w + x) * 4 + i];
}

function setPixel(imgd, x, y, r, g, b) {
  const w = imgd.width;
  const h = imgd.height;
  y = h - y - 1;
  imgd.data[(y * w + x) * 4] = Math.round(r);
  imgd.data[(y * w + x) * 4 + 1] = Math.round(g);
  imgd.data[(y * w + x) * 4 + 2] = Math.round(b);
  imgd.data[(y * w + x) * 4 + 3] = 255;
}
