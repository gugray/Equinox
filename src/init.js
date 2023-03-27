const canvas = document.getElementById("c");
const devicePixelRatio = window.devicePixelRatio || 1;
let canvasWidth, canvasHeight, aspect;

function init(prog, fullScreen = true) {

  document.addEventListener('DOMContentLoaded', () => {
    if (fullScreen) initFullScreen();
    else initFixed();
    if (prog) prog();
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
