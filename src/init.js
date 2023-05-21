const canvas3D = document.getElementById("canv3d");
const canvas2D = document.getElementById("canv2d");
const devicePixelRatio = window.devicePixelRatio || 1;
let canvasWidth, canvasHeight;

function init(prog, fullScreen = true) {

  document.addEventListener('DOMContentLoaded', () => {
    if (fullScreen) {
      initFullScreen(canvas3D);
      initFullScreen(canvas2D);
    }
    else {
      initFixed(canvas3D);
      initFixed(canvas2D);
    }
    moveCanvasD();
    if (prog) prog();
  });
}

function moveCanvasD() {
  canvas2D.style.position = "absolute";
}

function initFixed(canvas) {
  let elmWidth = 740;
  let elmHeight = 525;
  canvas.style.width = elmWidth + "px";
  canvas.style.height = elmHeight + "px";
  canvas.style.display = "block";

  canvasWidth = elmWidth * devicePixelRatio;
  canvasHeight = elmHeight * devicePixelRatio;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

}

function initFullScreen(canvas) {
  // Size, position and show canvas element
  let elmWidth = window.innerWidth;
  let elmHeight = window.innerHeight;
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

export {init}
