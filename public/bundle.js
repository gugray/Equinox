(() => {
  // src/init.js
  var canvas = document.getElementById("c");
  var devicePixelRatio = window.devicePixelRatio || 1;
  var canvasWidth;
  var canvasHeight;
  var aspect;
  function init(prog, fullScreen = true) {
    document.addEventListener("DOMContentLoaded", () => {
      if (fullScreen)
        initFullScreen();
      else
        initFixed();
      if (prog)
        prog();
    });
  }
  function initFixed() {
    let elmWidth = 740;
    let elmHeight = 525;
    aspect = elmWidth / elmHeight;
    canvas.style.width = elmWidth + "px";
    canvas.style.height = elmHeight + "px";
    canvas.style.margin = "50px auto 0 auto";
    canvas.style.display = "block";
    canvas.style.border = "border: 1px solid hsl(67, 0%, 40%)";
    canvasWidth = elmWidth * devicePixelRatio;
    canvasHeight = elmHeight * devicePixelRatio;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  }
  function initFullScreen() {
    let elmWidth = window.innerWidth;
    let elmHeight = window.innerHeight;
    aspect = elmWidth / elmHeight;
    canvas.style.width = elmWidth + "px";
    canvas.style.height = elmHeight + "px";
    canvas.style.left = 0;
    canvas.style.top = 0;
    canvas.style.display = "block";
    canvas.style.position = "fixed";
    canvasWidth = elmWidth * devicePixelRatio;
    canvasHeight = elmHeight * devicePixelRatio;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  }

  // current/07-raymarch-cpu/sketch.js
  init(doCPU, false);
  var MAX_MARCHING_STEPS = 255;
  var MIN_DIST = 0;
  var MAX_DIST = 100;
  var EPSILON = 1e-4;
  function doCPU() {
    const elmCanvas = document.getElementById("c");
    const w = elmCanvas.width;
    const h = elmCanvas.height;
    const ctx = elmCanvas.getContext("2d");
    const imgd = ctx.getImageData(0, 0, w, h);
    const frag_viewDir = [0, 0, 0, 0];
    const frag_eye = [0, 0, 5];
    const frag_center = [0, 0, 0];
    const frag_up = [0, 1, 0];
    const frag_mat4 = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    const frag_worldDir = [0, 0, 0, 0];
    const march_pt = [0, 0, 0];
    const viewMatrix_f = [0, 0, 0];
    const viewMatrix_s = [0, 0, 0];
    const viewMatrix_u = [0, 0, 0];
    const tsStart = new Date().getTime();
    const clr = [0, 0, 0];
    for (let x = 0; x < w; ++x) {
      for (let y = 0; y < h; ++y) {
        frag(x, y, clr);
        setPixel(imgd, x, h - y, ...clr);
      }
    }
    const tsEnd = new Date().getTime();
    console.log(Math.round(tsEnd - tsStart) + " msec");
    ctx.putImageData(imgd, 0, 0);
    function length3(vec) {
      return Math.sqrt(vec[0] * vec[0] + vec[1] * vec[1] + vec[2] * vec[2]);
    }
    function normalize3(vec) {
      let len = length3(vec);
      vec[0] /= len;
      vec[1] /= len;
      vec[2] /= len;
    }
    function add3(a, b, res) {
      res[0] = a[0] + b[0];
      res[1] = a[1] + b[1];
      res[2] = a[2] + b[2];
    }
    function sub3(a, b, res) {
      res[0] = a[0] - b[0];
      res[1] = a[1] - b[1];
      res[2] = a[2] - b[2];
    }
    function cross3(a, b, res) {
      res[0] = a[1] * b[2] - a[2] * b[1];
      res[1] = a[2] * b[0] - a[0] * b[2];
      res[2] = a[0] * b[1] - a[1] * b[0];
    }
    function viewMatrix(eye, center, up, mat4) {
      sub3(center, eye, viewMatrix_f);
      normalize3(viewMatrix_f);
      cross3(viewMatrix_f, up, viewMatrix_s);
      normalize3(viewMatrix_s);
      cross3(viewMatrix_s, viewMatrix_f, viewMatrix_u);
      mat4[0][0] = viewMatrix_s[0];
      mat4[0][1] = viewMatrix_s[1];
      mat4[0][2] = viewMatrix_s[2];
      mat4[0][3] = 0;
      mat4[1][0] = viewMatrix_u[0];
      mat4[1][1] = viewMatrix_u[1];
      mat4[1][2] = viewMatrix_u[2];
      mat4[1][3] = 0;
      mat4[2][0] = -viewMatrix_f[0];
      mat4[2][1] = -viewMatrix_f[1];
      mat4[2][2] = -viewMatrix_f[2];
      mat4[2][3] = 0;
      mat4[3][0] = 0;
      mat4[3][1] = 0;
      mat4[3][2] = 0;
      mat4[3][3] = 1;
    }
    function mul(mat, vec, res) {
      res[0] = mat[0][0] * vec[0] + mat[0][1] * vec[1] + mat[0][2] * vec[2] + mat[0][3] * vec[3];
      res[1] = mat[1][0] * vec[0] + mat[1][1] * vec[1] + mat[1][2] * vec[2] + mat[1][3] * vec[3];
      res[2] = mat[2][0] * vec[0] + mat[2][1] * vec[1] + mat[2][2] * vec[2] + mat[2][3] * vec[3];
      res[3] = mat[3][0] * vec[0] + mat[3][1] * vec[1] + mat[3][2] * vec[2] + mat[3][3] * vec[3];
    }
    function sphereSDF(pt) {
      return length3(pt) - 1;
    }
    function sceneSDF(pt) {
      return sphereSDF(pt);
    }
    function march(eye, dir, start, end) {
      let depth = start;
      for (let i = 0; i < MAX_MARCHING_STEPS; i++) {
        march_pt[0] = eye[0] + depth * dir[0];
        march_pt[1] = eye[1] + depth * dir[1];
        march_pt[2] = eye[2] + depth * dir[2];
        let dist = sceneSDF(march_pt);
        if (dist < EPSILON)
          return depth;
        depth += dist;
        if (depth >= end)
          return end;
      }
      return end;
    }
    function rayDirection(fieldOfView, x, y, dir) {
      x = x - w / 2;
      y = y - h / 2;
      let z = h / Math.tan(fieldOfView / 180 * Math.PI) / 2;
      dir[0] = x;
      dir[1] = y;
      dir[2] = -z;
      normalize3(dir);
    }
    function frag(x, y, clr2) {
      rayDirection(45, x, y, frag_viewDir);
      viewMatrix(frag_eye, frag_center, frag_up, frag_mat4);
      mul(frag_mat4, frag_viewDir, frag_worldDir);
      let dist = march(frag_eye, frag_worldDir, MIN_DIST, MAX_DIST);
      if (dist > MAX_DIST - EPSILON) {
        clr2[0] = clr2[1] = clr2[2] = 0;
        return;
      }
      clr2[0] = 255;
      clr2[1] = clr2[2] = 0;
    }
  }
  function setPixel(imgd, x, y, r, g, b) {
    const w = imgd.width;
    imgd.data[(y * w + x) * 4] = Math.round(r);
    imgd.data[(y * w + x) * 4 + 1] = Math.round(g);
    imgd.data[(y * w + x) * 4 + 2] = Math.round(b);
    imgd.data[(y * w + x) * 4 + 3] = 255;
  }
})();
//# sourceMappingURL=sketch.js.map
