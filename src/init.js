const canvasC = document.getElementById("c");
const canvasD = document.getElementById("d");
const devicePixelRatio = window.devicePixelRatio || 1;
let canvasWidth, canvasHeight, aspect;

function init(prog, fullScreen = true) {

  document.addEventListener('DOMContentLoaded', () => {
    if (fullScreen) {
      initFullScreen(canvasC);
      initFullScreen(canvasD);
    }
    else {
      initFixed(canvasC);
      initFixed(canvasD);
    }
    moveCanvasD();
    if (prog) prog();
  });
}

function moveCanvasD() {
  canvasD.style.position = "absolute";
  canvasD.style.top = canvasC.clientTop + "px";
  canvasD.style.left = canvasC.offsetLeft + "px";
  // canvasD.style.backgroundColor = "magenta";
}

function initFixed(canvas) {
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

function initFullScreen(canvas) {
  // Size, position and show canvas element
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

export {init}
