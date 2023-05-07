import {Vector} from "./vector.js";

class Cell {
  constructor() {
    this.children = null;
  }

  occupy(point) {
    if (!this.children) this.children = [];
    this.children.push(point);
  }

  isTaken(x, y, checkCallback) {
    if (!this.children) return false;
    for (let i = 0; i < this.children.length; ++i) {
      const p = this.children[i];
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (checkCallback(dist, p)) return true;
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

function createLookupGrid(bbox, dSep) {
  const bboxSize = Math.max(bbox.width, bbox.height);
  const cellsCount = Math.ceil(bboxSize / dSep);
  const cells = new Map();
  const api = {
    occupyCoordinates: occupyCoordinates,
    isTaken: isTaken,
    isOutside: isOutside,
    findNearest: findNearest
  };
  return api;

  function findNearest(x, y) {
    const cx = gridX(x);
    const cy = gridY(y);
    let minDistance = Infinity;
    for (let col = -1; col < 2; ++col) {
      const currentCellX = cx + col;
      if (currentCellX < 0 || currentCellX >= cellsCount) continue;
      const cellRow = cells.get(currentCellX);
      if (!cellRow) continue;
      for (let row = -1; row < 2; ++row) {
        const currentCellY = cy + row;
        if (currentCellY < 0 || currentCellY >= cellsCount) continue;
        const cellCol = cellRow.get(currentCellY);
        if (!cellCol) continue;
        let d = cellCol.getMinDistance(x, y);
        if (d < minDistance) minDistance = d;
      }
    }
    return minDistance;
  }

  function isOutside(x, y) {
    return x < bbox.left || x > bbox.left + bbox.width ||
      y < bbox.top || y > bbox.top + bbox.height;
  }

  function occupyCoordinates(point) {
    const x = point.x, y = point.y;
    getCellByCoordinates(x, y).occupy(point);
  }

  function isTaken(x, y, checkCallback) {
    if (!cells) return false;
    const cx = gridX(x);
    const cy = gridY(y);
    for (let col = -1; col < 2; ++col) {
      const currentCellX = cx + col;
      if (currentCellX < 0 || currentCellX >= cellsCount) continue;
      const cellRow = cells.get(currentCellX);
      if (!cellRow) continue;
      for (let row = -1; row < 2; ++row) {
        const currentCellY = cy + row;
        if (currentCellY < 0 || currentCellY >= cellsCount) continue;
        const cellCol = cellRow.get(currentCellY);
        if (!cellCol) continue;
        if (cellCol.isTaken(x, y, checkCallback)) return true;
      }
    }
    return false;
  }

  function getCellByCoordinates(x, y) {
    assertInBounds(x, y);
    const rowCoordinate = gridX(x);
    let row = cells.get(rowCoordinate);
    if (!row) {
      row = new Map();
      cells.set(rowCoordinate, row);
    }
    const colCoordinate = gridY(y);
    let cell = row.get(colCoordinate);
    if (!cell) {
      cell = new Cell();
      row.set(colCoordinate, cell)
    }
    return cell;
  }

  function gridX(x) {
    return Math.floor(cellsCount * (x - bbox.left) / bboxSize);
  }

  function gridY(y) {
    return Math.floor(cellsCount * (y - bbox.top) / bboxSize);
  }

  function assertInBounds(x, y) {
    if (bbox.left > x || bbox.left + bboxSize < x) {
      throw new Error('x is out of bounds');
    }
    if (bbox.top > y || bbox.top + bboxSize < y) {
      throw new Error('y is out of bounds');
    }
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

function createStreamlineIntegrator(start, grid, config) {
  let points = [start];
  let pos = start;
  let state = FORWARD;
  let candidate = null;
  let lastCheckedSeed = -1;
  let ownGrid = createLookupGrid(config.boundingBox, config.timeStep * 0.9);

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
      // Check one normal. We just set c = p + n, where n is orthogonal to v.
      // Since v is unit vector we can multiply it by scaler (config.dSep) to get to the
      // right point. It is also easy to find normal in 2d: normal to (x, y) is just (-y, x).
      // You can get it by applying 2d rotation matrix.)
      let cx = p.x - v.y * config.dSep;
      let cy = p.y + v.x * config.dSep;

      if (Array.isArray(config.seedArray) && config.seedArray.length > 0) {
        let seed = config.seedArray.shift();
        cx = seed.x;
        cy = seed.y;
      }

      if (!grid.isOutside(cx, cy) && !grid.isTaken(cx, cy, checkDSep)) {
        // this will let us check the other side. When we get back
        // into this method, the point `cx, cy` will be taken (by construction of another streamline)
        // And we will throw through to the next orthogonal check.
        lastCheckedSeed -= 1;
        return new Vector(cx, cy);
      }

      // Check orthogonal coordinates on the other side (o = p - n).
      let ox = p.x + v.y * config.dSep;
      let oy = p.y - v.x * config.dSep;
      if (!grid.isOutside(ox, oy) && !grid.isTaken(ox, oy, checkDSep)) return new Vector(ox, oy);
    }
  }

  function checkDTest(distanceToCandidate) {
    if (isSame(distanceToCandidate, config.dTest)) return false;
    return distanceToCandidate < config.dTest;
  }

  function checkDSep(distanceToCandidate) {
    if (isSame(distanceToCandidate, config.dSep)) return false;

    return distanceToCandidate < config.dSep;
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
          let shouldPause = notifyPointAdded(point);
          if (shouldPause) return;
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

          let shouldPause = notifyPointAdded(point);
          if (shouldPause) return;
        } else {
          state = DONE;
        }
      }

      if (state === DONE) {
        points.forEach(occupyPointInGrid);
        return true;
      }
    }
  }

  function occupyPointInGrid(p) {
    grid.occupyCoordinates(p);
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
    if (grid.isOutside(candidate.x, candidate.y)) return;
    if (grid.isTaken(candidate.x, candidate.y, checkDTest)) return;

    // did we hit any of our points?
    if (ownGrid.isTaken(candidate.x, candidate.y, timeStepCheck)) return;
    // for (let i = 0; i < points.length; ++i) {
    //   if (points[i].distanceTo(candidate) < config.timeStep * 0.9) return;
    // }

    return candidate;
  }

  function timeStepCheck(distanceToCandidate) {
    return distanceToCandidate < config.timeStep * 0.9;
  }

  function notifyPointAdded(point) {
    let shouldPause = false;
    if (config.onPointAdded) {
      shouldPause = config.onPointAdded(point, points[state === FORWARD ? points.length - 2 : 1], config, points);
    }

    return shouldPause;
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

function isSame(a, b) {
  // to avoid floating point error
  return Math.abs(a - b) < 1e-4;
}

const STATE_INIT = 0;
const STATE_STREAMLINE = 1;
const STATE_PROCESS_QUEUE = 2;
const STATE_DONE = 3;
const STATE_SEED_STREAMLINE = 4;

function createStreamlineComputer(protoOptions) {
  let options = Object.create(null);
  if (!protoOptions)
    throw new Error('Configuration is required to compute streamlines');
  if (!protoOptions.boundingBox) {
    console.warn('No bounding box passed to streamline. Creating default one');
    options.boundingBox = { left: -5, top: -5, width: 10, height: 10 };
  } else {
    options.boundingBox = {};
    Object.assign(options.boundingBox, protoOptions.boundingBox);
  }

  normalizeBoundingBox(options.boundingBox);

  let boundingBox = options.boundingBox;
  options.vectorField = protoOptions.vectorField;
  options.onStreamlineAdded = protoOptions.onStreamlineAdded;
  options.onPointAdded = protoOptions.onPointAdded;
  options.forwardOnly = protoOptions.forwardOnly;

  if (!protoOptions.seed) {
    options.seed = new Vector(
      Math.random() * boundingBox.width + boundingBox.left,
      Math.random() * boundingBox.height + boundingBox.top
    );
  } else if (Array.isArray(protoOptions.seed)) {
    let seed = protoOptions.seed.shift();
    options.seed = new Vector(seed.x, seed.y);
    options.seedArray = protoOptions.seed;
  } else {
    options.seed = new Vector(protoOptions.seed.x, protoOptions.seed.y);
  }

  // Separation between streamlines. Naming according to the paper.
  options.dSep =
    protoOptions.dSep > 0
      ? protoOptions.dSep
      : 1 / Math.max(boundingBox.width, boundingBox.height);

  // When should we stop integrating a streamline.
  options.dTest =
    protoOptions.dTest > 0 ? protoOptions.dTest : options.dSep * 0.5;

  // Lookup grid helps to quickly tell if there are points nearby
  let grid = createLookupGrid(boundingBox, options.dSep);

  // Integration time step.
  options.timeStep = protoOptions.timeStep > 0 ? protoOptions.timeStep : 0.01;
  options.stepsPerIteration =
    protoOptions.stepsPerIteration > 0 ? protoOptions.stepsPerIteration : 10;
  options.maxTimePerIteration =
    protoOptions.maxTimePerIteration > 0
      ? protoOptions.maxTimePerIteration
      : 1000;

  let stepsPerIteration = options.stepsPerIteration;
  let resolve;
  let state = STATE_INIT;
  let finishedStreamlineIntegrators = [];
  let streamlineIntegrator = createStreamlineIntegrator(
    options.seed,
    grid,
    options
  );
  let disposed = false;
  let running = false;
  let nextTimeout;
  // It is asynchronous. If this is used in a browser we don't want to freeze the UI thread.
  // On the other hand, if you need this to be sync - we can extend the API. Just let me know.

  return {
    run: run,
    getGrid: getGrid,
    dispose: dispose,
    running: () => running,
  };

  function getGrid() {
    return grid;
  }

  function run() {
    if (running) return;
    running = true;
    nextTimeout = setTimeout(nextStep, 0);

    return new Promise(assignResolve);
  }

  function assignResolve(pResolve) {
    resolve = pResolve;
  }

  function dispose() {
    disposed = true;
    clearTimeout(nextTimeout);
  }

  function nextStep() {
    if (disposed) return;
    let maxTimePerIteration = options.maxTimePerIteration;
    let start = window.performance.now();

    for (let i = 0; i < stepsPerIteration; ++i) {
      if (state === STATE_INIT) initProcessing();
      if (state === STATE_STREAMLINE) continueStreamline();
      if (state === STATE_PROCESS_QUEUE) processQueue();
      if (state === STATE_SEED_STREAMLINE) seedStreamline();
      if (window.performance.now() - start > maxTimePerIteration) break;

      if (state === STATE_DONE) {
        resolve(options);
        running = false;
        return;
      }
    }

    nextTimeout = setTimeout(nextStep, 0);
  }

  function initProcessing() {
    let streamLineCompleted = streamlineIntegrator.next();
    if (streamLineCompleted) {
      addStreamLineToQueue();
      state = STATE_PROCESS_QUEUE;
    }
  }

  function seedStreamline() {
    let currentStreamLine = finishedStreamlineIntegrators[0];

    let validCandidate = currentStreamLine.getNextValidSeed();
    if (validCandidate) {
      streamlineIntegrator = createStreamlineIntegrator(
        validCandidate,
        grid,
        options
      );
      state = STATE_STREAMLINE;
    } else {
      finishedStreamlineIntegrators.shift();
      state = STATE_PROCESS_QUEUE;
    }
  }

  function processQueue() {
    if (finishedStreamlineIntegrators.length === 0) {
      state = STATE_DONE;
    } else {
      state = STATE_SEED_STREAMLINE;
    }
  }

  function continueStreamline() {
    let isDone = streamlineIntegrator.next();
    if (isDone) {
      addStreamLineToQueue();
      state = STATE_SEED_STREAMLINE;
    }
  }

  function addStreamLineToQueue() {
    let streamLinePoints = streamlineIntegrator.getStreamline();
    if (streamLinePoints.length > 1) {
      finishedStreamlineIntegrators.push(streamlineIntegrator);
      if (options.onStreamlineAdded)
        options.onStreamlineAdded(streamLinePoints, options);
    }
  }
}

function normalizeBoundingBox(bbox) {
  let requiredBoxMessage =
    'Bounding box {left, top, width, height} is required';
  if (!bbox) throw new Error(requiredBoxMessage);

  assertNumber(bbox.left, requiredBoxMessage);
  assertNumber(bbox.top, requiredBoxMessage);
  if (typeof bbox.size === 'number') {
    bbox.width = bbox.size;
    bbox.height = bbox.size;
  }
  assertNumber(bbox.width, requiredBoxMessage);
  assertNumber(bbox.height, requiredBoxMessage);

  if (bbox.width <= 0 || bbox.height <= 0)
    throw new Error('Bounding box cannot be empty');
}

function assertNumber(x, msg) {
  if (typeof x !== 'number' || Number.isNaN(x)) throw new Error(msg);
}

export {createStreamlineComputer}
