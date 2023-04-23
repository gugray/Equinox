const strokeW = 2;

class SVGGenerator {
  constructor(w, h, pw, ph) {
    this.strokeW = strokeW;
    this.w = w;
    this.h = h;
    if (pw) this.pw = pw;
    else this.pw = w;
    if (ph) this.ph = ph;
    else this.ph = h;

    this.layers = [];
    this.prologue = this.getPrologue();
  }

  addWASMPath(layerIx, buf, startIx, endIx) {
    let i = startIx;
    const x0 = Math.round(buf[i]).toString();
    const y0 = Math.round(this.h - buf[i+1]).toString();
    let pathStr = `M${x0},${y0}`;
    for (i += 2; i < endIx; i += 2) {
      const x = Math.round(buf[i]).toString();
      const y = Math.round(this.h - buf[i+1]).toString();
      pathStr += `L${x},${y}`;
    }
    this.layers[layerIx].paths.push(pathStr);
  }

  getPrologue() {
    const wmm = Math.round(this.pw / 10).toString() + "mm";
    const hmm = Math.round(this.ph / 10).toString() + "mm";
    const left = -Math.round((this.pw - this.w) / 2).toString();
    const top = -Math.round((this.ph - this.h) / 2).toString();
    return `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${wmm}"
      height="${hmm}" viewBox="${left},${top},${this.pw},${this.ph}" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
      xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape">`;
  }

  getLayer(name, color) {
    return `<g id="${name}" inkscape:groupmode='layer' inkscape:label='${name}' fill="none" fill-rule="nonzero" stroke="${color}"
       stroke-width="${this.strokeW}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray=""
       stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal">`;
  }

  getPath(pathStr) {
    return `<path d="${pathStr}"></path>`;
  }

  addLayer(name, color) {
    this.layers.push({name, color, paths: []});
  }

  generate() {
    let res = this.prologue + "\n";
    for (const layer of this.layers) {
      res += this.getLayer(layer.name, layer.color) + "\n";
      for (const pathStr of layer.paths) {
        res += this.getPath(pathStr) + "\n";
      }
      res += "</g>\n";
    }
    res += "</svg>\n";
    return res;
  }
}

export {SVGGenerator}
