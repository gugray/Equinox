import {Vector} from "./app-vector.js";


const STATE_INIT = 0;
const STATE_STREAMLINE = 1;
const STATE_PROCESS_QUEUE = 2;
const STATE_DONE = 3;
const STATE_SEED_STREAMLINE = 4;

class StreamlineGenerator {

  constructor(options) {

    this.options = options;

    const bbox = options.boundingBox;
    if (!options.seed) {
      options.seed = new Vector(
        Math.random() * bbox.width + bbox.left,
        Math.random() * bbox.height + bbox.top
      );
    }

    // Lookup grid helps to quickly tell if there are points nearby
    this.startMask = new Mask(bbox, options.timeStep);
    this.stopMask = new Mask(bbox, options.timeStep);

    if (!options.stepsPerIteration)
      options.stepsPerIteration = 10;

    if (!options.maxTimePerIteration)
      options.maxTimePerIteration = 1000;

    this.resolve = null;
    this.state = STATE_INIT;
    this.finishedStreamlineIntegrators = [];
    this.integrator = newIntegrator(options.seed, this.startMask, this.stopMask, options);
    this.running = false;
  }

  run() {
    if (this.running) return;
    this.running = true;
    setTimeout(() => this.nextStep(), 0);
    return new Promise(resolve => this.resolve = resolve);
  }

  nextStep() {
    let maxTimePerIteration = this.options.maxTimePerIteration;
    let start = window.performance.now();

    for (let i = 0; i < this.options.stepsPerIteration; ++i) {
      if (this.state === STATE_INIT) this.initProcessing();
      if (this.state === STATE_STREAMLINE) this.continueStreamline();
      if (this.state === STATE_PROCESS_QUEUE) this.processQueue();
      if (this.state === STATE_SEED_STREAMLINE) this.seedStreamline();
      if (window.performance.now() - start > maxTimePerIteration) break;

      if (this.state === STATE_DONE) {
        this.resolve(this.options);
        this.running = false;
        return;
      }
    }
    setTimeout(() => this.nextStep(), 0);
  }

  initProcessing() {
    if (!this.integrator.next())
      return;
    this.addStreamLineToQueue();
    this.state = STATE_PROCESS_QUEUE;
  }

  seedStreamline() {
    let currentStreamLine = this.finishedStreamlineIntegrators[0];
    let validCandidate = currentStreamLine.getNextValidSeed();
    if (validCandidate) {
      this.integrator = newIntegrator(validCandidate, this.startMask, this.stopMask, this.options);
      this.state = STATE_STREAMLINE;
    } else {
      this.finishedStreamlineIntegrators.shift();
      this.state = STATE_PROCESS_QUEUE;
    }
  }

  processQueue() {
    if (this.finishedStreamlineIntegrators.length == 0) {
      this.state = STATE_DONE;
    } else {
      this.state = STATE_SEED_STREAMLINE;
    }
  }

  continueStreamline() {
    if (this.integrator.next()) {
      this.addStreamLineToQueue();
      this.state = STATE_SEED_STREAMLINE;
    }
  }

  addStreamLineToQueue() {
    let streamLinePoints = this.integrator.getStreamline();
    if (streamLinePoints.length > 1) {
      this.finishedStreamlineIntegrators.push(this.integrator);
      if (this.options.onStreamlineAdded)
        this.options.onStreamlineAdded(streamLinePoints, this.options);
    }
  }
}


class Mask {
  constructor(bbox, timeStep, id) {

    this.bbox = bbox;
    this.timeStep = timeStep;

    const dpr = window.devicePixelRatio;

    this.elm = document.createElement("canvas");
    this.elm.width = bbox.width;
    this.elm.height = bbox.height;

    if (id) {
      this.elm.id = id;
      this.elm.style.width = (bbox.width / dpr) + "px";
      this.elm.style.height = (bbox.height / dpr) + "px";
      this.elm.style.display = "block";
      document.body.appendChild(this.elm);
    }

    this.ctx = this.elm.getContext("2d");
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, bbox.width, bbox.height);
    this.ctx.fill();
    this.ctx.fillStyle = "red";
    this.ctx.strokeStyle = "red";
    this.ctx.lineWidth = 0;
  }

  fill(pt1, sep1, pt2, sep2) {
    const x1 = pt1.x - this.bbox.left;
    const y1 = pt1.y - this.bbox.top;
    const x2 = pt2.x - this.bbox.left;
    const y2 = pt2.y - this.bbox.top;
    let dx = pt2.x - pt1.x;
    let dy = pt2.y - pt1.y;
    dx /= this.timeStep;
    dy /= this.timeStep;
    const region = new Path2D();
    region.moveTo(x1 + dy * sep1, y1 - dx * sep1);
    region.lineTo(x2 + dy * sep2, y2 - dx * sep2);
    region.lineTo(x2 - dy * sep2, y2 + dx * sep2);
    region.lineTo(x1 - dy * sep1, y1 + dx * sep1);
    region.closePath();
    this.ctx.fill(region);
  }

  circle(pt, rad) {
    this.ctx.beginPath();
    this.ctx.arc(pt.x - this.bbox.left, pt.y - this.bbox.top, rad, 0, 2 * Math.PI);
    this.ctx.fill();
  }
  
  isUsable(x, y) {
    if (x < this.bbox.left || x >= this.bbox.left + this.bbox.width) return false;
    if (y < this.bbox.top || y >= this.bbox.top + this.bbox.height) return false;
    const data = this.ctx.getImageData(x - this.bbox.left, y - this.bbox.top, 1, 1).data;
    return data[0] < 128;
  }
}


class LookupGrid {

  constructor(bbox, sep) {
    this.bbox = bbox;
    this.sep = sep;
    this.bboxSize = Math.max(bbox.width, bbox.height);
    this.cellsCount = Math.ceil(this.bboxSize / sep);
    this.cells = new Map();
  }

  getCellByCoordinates(x, y) {
    this.assertInBounds(x, y);
    const rowCoordinate = this.gridX(x);
    let row = this.cells.get(rowCoordinate);
    if (!row) {
      row = new Map();
      this.cells.set(rowCoordinate, row);
    }
    const colCoordinate = this.gridY(y);
    let cell = row.get(colCoordinate);
    if (!cell) {
      cell = new Cell();
      row.set(colCoordinate, cell)
    }
    return cell;
  }

  gridX(x) {
    return Math.floor(this.cellsCount * (x - this.bbox.left) / this.bboxSize);
  }

  gridY(y) {
    return Math.floor(this.cellsCount * (y - this.bbox.top) / this.bboxSize);
  }

  assertInBounds(x, y) {
    if (this.bbox.left > x || this.bbox.left + this.bboxSize < x) {
      throw new Error('x is out of bounds');
    }
    if (this.bbox.top > y || this.bbox.top + this.bboxSize < y) {
      throw new Error('y is out of bounds');
    }
  }

  findNearest(x, y) {
    const cx = this.gridX(x);
    const cy = this.gridY(y);
    let minDistance = Infinity;
    for (let col = -1; col < 2; ++col) {
      const currentCellX = cx + col;
      if (currentCellX < 0 || currentCellX >= this.cellsCount) continue;
      const cellRow = this.cells.get(currentCellX);
      if (!cellRow) continue;
      for (let row = -1; row < 2; ++row) {
        const currentCellY = cy + row;
        if (currentCellY < 0 || currentCellY >= this.cellsCount) continue;
        const cellCol = cellRow.get(currentCellY);
        if (!cellCol) continue;
        let d = cellCol.getMinDistance(x, y);
        if (d < minDistance) minDistance = d;
      }
    }
    return minDistance;
  }

  isOutside(x, y) {
    return x < this.bbox.left || x > this.bbox.left + this.bbox.width ||
      y < this.bbox.top || y > this.bbox.top + this.bbox.height;
  }

  occupyCoordinates(point) {
    const x = point.x, y = point.y;
    this.getCellByCoordinates(x, y).occupy(point);
  }

  hasCloserThan(x, y, limit) {
    if (!this.cells) return false;
    const cx = this.gridX(x);
    const cy = this.gridY(y);
    for (let col = -1; col < 2; ++col) {
      const currentCellX = cx + col;
      if (currentCellX < 0 || currentCellX >= this.cellsCount) continue;
      const cellRow = this.cells.get(currentCellX);
      if (!cellRow) continue;
      for (let row = -1; row < 2; ++row) {
        const currentCellY = cy + row;
        if (currentCellY < 0 || currentCellY >= this.cellsCount) continue;
        const cellCol = cellRow.get(currentCellY);
        if (!cellCol) continue;
        if (cellCol.hasCloserThan(x, y, limit)) return true;
      }
    }
    return false;
  }
}

class Cell {
  constructor() {
    this.children = null;
  }

  occupy(point) {
    if (!this.children) this.children = [];
    this.children.push(point);
  }

  hasCloserThan(x, y, limit) {
    if (!this.children) return false;
    for (let i = 0; i < this.children.length; ++i) {
      const p = this.children[i];
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < limit) return true;
    }
    return false;
  }

  getMinDistance(x, y) {
    let minDistance = Infinity;
    if (!this.children) return minDistance;
    for (let i = 0; i < this.children.length; ++i) {
      const p = this.children[i];
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) minDistance = dist;
    }
    return minDistance;
  }
}

function rk4(point, timeStep, getVelocity) {
  const k1 = getVelocity(point);
  if (!k1) return;
  const k2 = getVelocity(point.add(k1.mulScalar(timeStep * 0.5)));
  if (!k2) return;
  const k3 = getVelocity(point.add(k2.mulScalar(timeStep * 0.5)));
  if (!k3) return;
  const k4 = getVelocity(point.add(k3.mulScalar(timeStep)));
  if (!k4) return;
  const res = k1.mulScalar(timeStep / 6).add(k2.mulScalar(timeStep / 3)).add(k3.mulScalar(timeStep / 3)).add(k4.mulScalar(timeStep / 6));
  return res;
}

const FORWARD = 1;
const BACKWARD = 2;
const DONE = 3;

function newIntegrator(start, startMask, stopMask, config) {
  let points = [start];
  let pos = start;
  let state = FORWARD;
  let candidate = null;
  let lastCheckedSeed = -1;
  let ownGrid = new LookupGrid(config.boundingBox, config.timeStep * 0.9);

  return {
    start: start,
    next: next,
    getStreamline: getStreamline,
    getNextValidSeed: getNextValidSeed
  }

  function getStreamline() {
    return points;
  }

  function getNextValidSeed() {
    while (lastCheckedSeed < points.length - 1) {
      lastCheckedSeed += 1;

      let p = points[lastCheckedSeed];
      let v = normalizedVectorField(p);
      if (!v) continue;

      // const dist = config.dStart;
      const dist = config.density(p);

      // Check one normal. We just set c = p + n, where n is orthogonal to v.
      // Since v is unit vector we can multiply it by scaler to get to the
      // right point. It is also easy to find normal in 2d: normal to (x, y) is just (-y, x).
      // You can get it by applying 2d rotation matrix.)
      let cx = p.x - v.y * dist;
      let cy = p.y + v.x * dist;

      if (Array.isArray(config.seedArray) && config.seedArray.length > 0) {
        let seed = config.seedArray.shift();
        cx = seed.x;
        cy = seed.y;
      }

      if (startMask.isUsable(cx, cy)) {
        // this will let us check the other side. When we get back
        // into this method, the point `cx, cy` will be taken (by construction of another streamline)
        // And we will throw through to the next orthogonal check.
        lastCheckedSeed -= 1;
        return new Vector(cx, cy);
      }

      // Check orthogonal coordinates on the other side (o = p - n).
      let ox = p.x + v.y * dist;
      let oy = p.y - v.x * dist;
      if (startMask.isUsable(ox, oy)) {
        return new Vector(ox, oy);
      }
    }
  }

  function next() {
    while (true) {
      candidate = null;
      if (state === FORWARD) {
        let point = growForward();
        if (point) {
          points.push(point);
          ownGrid.occupyCoordinates(point);
          pos = point;
        } else {
          // Reset position to start, and grow backwards:
          if (config.forwardOnly) {
            state = DONE;
          } else {
            pos = start;
            state = BACKWARD;
          }
        }
      }
      if (state === BACKWARD) {
        let point = growBackward();
        if (point) {
          points.unshift(point);
          pos = point;
          ownGrid.occupyCoordinates(point);
        } else {
          state = DONE;
        }
      }

      if (state === DONE) {
        for (const pt of points) {
          // const dist = config.dStart;
          const dist = config.density(pt);
          startMask.circle(pt, dist - 1);
          stopMask.circle(pt, dist * 0.3); // TODO param
        }
        return true;
      }
    }
  }

  function growForward() {
    let velocity = rk4(pos, config.timeStep, normalizedVectorField);
    if (!velocity) return; // Hit the singularity.
    return growByVelocity(pos, velocity);
  }

  function growBackward() {
    let velocity = rk4(pos, config.timeStep, normalizedVectorField);
    if (!velocity) return; // Singularity
    velocity = velocity.mulScalar(-1);
    return growByVelocity(pos, velocity);
  }

  function growByVelocity(pos, velocity) {
    candidate = pos.add(velocity);
    if (!stopMask.isUsable(candidate.x, candidate.y)) return;
    // if (grid.isOutside(candidate.x, candidate.y)) return;
    // if (grid.hasCloserThan(candidate.x, candidate.y, config.dStop - 1e-4)) return;

    // did we hit any of our own points?
    if (ownGrid.hasCloserThan(candidate.x, candidate.y, config.timeStep * 0.9)) return;

    return candidate;
  }

  function normalizedVectorField(pt) {
    let p = config.vectorField(pt, points, state === DONE);
    if (!p) return; // Assume singularity
    if (Number.isNaN(p.x) || Number.isNaN(p.y)) return; // Not defined. e.g. Math.log(-1);

    let l = p.x * p.x + p.y * p.y;

    if (l === 0) return; // the same, singularity
    l = Math.sqrt(l);

    // We need normalized field.
    return new Vector(p.x / l, p.y / l);
  }
}

export {StreamlineGenerator}
