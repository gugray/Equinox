import {init} from "../../src/init.js";
import * as twgl from "twgl.js";
import fs from "./frag.glsl";
import vs from "./vert.glsl";

init();
const canvas = document.getElementById("c");

const gl = document.querySelector("#c").getContext("webgl2");
const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

const arrays = {
  position: { numComponents: 2, data: [-1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1] },
};
const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

function render(time) {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  const uniforms = {
    time: time * 0.001,
    resolution: [gl.canvas.width, gl.canvas.height],
  };

  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
  twgl.setUniforms(programInfo, uniforms);
  twgl.drawBufferInfo(gl, bufferInfo);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);

