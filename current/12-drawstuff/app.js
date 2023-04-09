import vs from "./vert.glsl";
import fs_all from "./frag_all.glsl";
import fs_surface from "./frag_surface.glsl";
import fs_normals from "./frag_normals.glsl";
import fs_lights from "./frag_lights.glsl";
import fs_gradients from "./frag_gradients.glsl";

import {init} from "../../src/init.js";
import * as twgl from "twgl.js";
import {FlowLineGenerator, Vec2} from "./app-hatch.js";

init(doShit, false);

function doShit() {

  const canvas = document.getElementById("d");
  const ctx = canvas.getContext("2d");

  let startTime = performance.now();

  const canvasC = document.getElementById("c");
  const w = canvasC.width;
  const h = canvasC.height;
  const gl = document.querySelector("#c").getContext("webgl2");
  twgl.addExtensionsToContext(gl);

  const arrays = {
    position: {numComponents: 2, data: [-1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1]},
  };
  const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

  const attachments = [{internalFormat: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT}];
  const framebuf = twgl.createFramebufferInfo(gl, attachments, w * 2, h);

  const u_all = {
    time: 8,
    resolution: [w, h],
  };
  const p_all = twgl.createProgramInfo(gl, [vs, fs_all]);
  gl.useProgram(p_all.program);
  gl.viewport(0, 0, w * 2, h);
  twgl.setBuffersAndAttributes(gl, p_all, bufferInfo);
  twgl.setUniforms(p_all, u_all);
  twgl.bindFramebufferInfo(gl, framebuf);
  twgl.drawBufferInfo(gl, bufferInfo);

  let endTime = performance.now();
  let elapsed = endTime - startTime;
  console.log("Shaders: " + elapsed + " msec");

  // Fetch results
  const data_all = new Float32Array(w * 2 * h * 4);
  gl.readPixels(0, 0, w * 2, h, gl.RGBA, gl.FLOAT, data_all);

  // Draw to canvas
  const imgd = ctx.getImageData(0, 0, w * 2, h);
  const clr = [0, 0, 0];
  for (let x = 0; x < w; ++x) {
    for (let y = 0; y < h; ++y) {
      getVec4(data_all, w * 2, x, y, clr);
      const val = Math.sqrt(clr[0]**2 + clr[1]**2 + clr[2]**2);
      let r = Math.floor(clr[0] * 256);
      let g = Math.floor(clr[1] * 256);
      let b = Math.floor(clr[2] * 256);
      // r = g = b = Math.floor(val * 256);
      setPixel(imgd, x, y, r, g, b);
    }
  }
  ctx.putImageData(imgd, 0, 0);

  // return;

  const vAbove = [0, 0, 0, 0];
  const vBelow = [0, 0, 0, 0];
  const vLeft = [0, 0, 0, 0];
  const vRight = [0, 0, 0, 0];
  const flowFun = (pt) => {
    let x = Math.floor(pt.x);
    let y = Math.floor(pt.y);
    if (x == 0 || x >= w - 1 || y == 0 || y >= h - 1)
      return null;
    getVec4(data_all, w * 2, w + x, y - 1, vAbove);
    getVec4(data_all, w * 2, w + x, y + 1, vBelow);
    getVec4(data_all, w * 2, w + x - 1, y, vLeft);
    getVec4(data_all, w * 2, w + x + 1, y, vRight);
    if (vAbove[1] == 0 || vBelow[1] == 0 || vLeft[1] == 0 || vRight == [0])
      return null;
    let res = new Vec2(vRight[0] - vLeft[0], vBelow[0] - vAbove[0]);
    if (res.length() < 0.00001) return null;
    res.normalize();
    return res;
  }

  const realLight = true;

  const vec = [0, 0, 0, 0];
  const densityFun = (pt) => {

    let x = Math.floor(pt.x);
    let y = Math.floor(pt.y);

    // Phong lighting
    if (realLight) {
      getVec4(data_all, w * 2, x, y, vec);
      let val = Math.sqrt(vec[0] ** 2 + vec[1] ** 2 + vec[2] ** 2);
      if (val > 1) val = 1;
      val = val ** 1.2;
      return val;
    }

    // Diffuse lighting from viewpoint
    getVec4(data_all, w * 2, w + x, y, vec);
    return vec[0];
  }

  const flopt = {
    width: w, height: h, fun: flowFun, stepSize: 1, maxLength: 0,
    densityFun: densityFun,
    minCellSize: 3, maxCellSize: 24, nShades: 12, logGrid: true
  }
  const flowLines = [];
  const flgen = new FlowLineGenerator(flopt);
  while (true) {
    const [flPoints, flLength] = flgen.genFlowLine();
    if (!flPoints) break;
    if (flPoints.length < 2 || flLength < flopt.minCellSize) continue;
    flowLines.push(flPoints);
  }

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  for (const pts of flowLines) {
    ctx.moveTo(pts[0].x, h - pts[0].y);
    for (let i = 1; i < pts.length; ++i) {
      ctx.lineTo(pts[i].x, h - pts[i].y);
    }
  }
  ctx.stroke();

  endTime = performance.now();
  elapsed = endTime - startTime;
  console.log("Hatching: " + elapsed + " msec");
  console.log("# flowlines: " + flowLines.length);
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
