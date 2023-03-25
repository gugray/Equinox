const canvas = document.getElementById("c");
const devicePixelRatio = window.devicePixelRatio || 1;
let canvasWidth, canvasHeight, aspect;

function init() {
  document.addEventListener('DOMContentLoaded', () => {
    // Size, position and show canvas element
    let elmHeight = window.innerHeight;
    let elmWidth = window.innerWidth;
    aspect = elmWidth / elmHeight;
    canvas.style.width = elmWidth + "px";
    canvas.style.height = elmHeight + "px";
    canvas.style.left = 0;
    canvas.style.top = 0;
    canvas.style.display = "block";

    canvasWidth = elmWidth * devicePixelRatio;
    canvasHeight = elmHeight * devicePixelRatio;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
  });
}

export {init}
