import sGist from "./gist.glsl";

import {init} from "../../src/init.js";
import {Editor} from "./editor.js";

const wsPort = 2909;

let editor;
let ws;

document.body.classList.add("full");
init(setup, true);

async function setup() {

  initSocket();
  setupEditor();
  editor.cm.setValue(sGist);

  // This sketch doesn't use footer, or 2D canvas, or 3D canvas
  document.getElementsByTagName("footer")[0].style.display = "none";
  document.getElementById("canv2d").style.display = "none";
  document.getElementById("canv3d").style.display = "none";

}

function initSocket() {
  ws = new WebSocket('ws://localhost:' + wsPort);
  ws.addEventListener('open', () => {
    console.log('WebSocket connection opened');
  });
  ws.addEventListener('close', () => {
    console.log('WebSocket connection closed');
  });
}


function setupEditor() {
  const elmCredits = document.getElementById("credits");
  const elmShaderEditorBox = document.getElementById("shaderEditorBox");
  elmShaderEditorBox.style.display = "block";
  editor = new Editor(elmShaderEditorBox);
  editor.onSubmit = () => {
    ws.send(editor.cm.doc.getValue());
    console.log("Sent new gist");
  }

  document.body.addEventListener("keydown", e => {
    let handled = false;
    if (e.metaKey && e.key == "e") {
      if (editor.cm.hasFocus()) editor.cm.display.input.blur();
      else {
        editor.cm.display.input.focus();
        elmCredits.classList.remove("visible");
      }
      handled = true;
    }
    if (handled) {
      e.preventDefault();
      return false;
    }
  });
}
