class Vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.len = null;
  }

  length() {
    if (this.len != null) return this.len;
    this.len = Math.sqrt(this.x**2 + this.y **2);
    return this.len;
  }

  normalize() {
    let len = this.length();
    if (len == 0) return;
    this.x /= len;
    this.y /= len;
    this.len = 1;
  }

  multiply(val) {
    this.x *= val;
    this.y *= val;
    this.len = null;
  }

  add(pt) {
    this.x += pt.x;
    this.y += pt.y;
    this.len = null;
  }

  subtract(pt) {
    this.x -= pt.x;
    this.y -= pt.y;
    this.len = null;
  }

  set(pt) {
    this.x = pt.x;
    this.y = pt.y;
    this.len = null;
  }

  clone() {
    return new Vec2(this.x, this.y);
  }
}

function shuffle(arr) {
  let currIx = arr.length;
  while (currIx != 0) {
    let randIx = Math.floor(Math.random() * currIx);
    currIx--;
    [arr[currIx], arr[randIx]] = [arr[randIx], arr[currIx]];
  }
  return arr;
}


class FlowLineGenerator {

  constructor({
                width, height, fun, stepSize, maxLength,
                densityFun,
                minCellSize, maxCellSize, nShades, logGrid
              }) {
    this.width = width;
    this.height = height;
    this.fun = fun;
    this.densityFun = densityFun;
    this.maxLength = maxLength;
    this.stepSize = stepSize;
    this.grid = new OccupancyGrid(width, height, minCellSize, maxCellSize, nShades, logGrid);

    // Random grid positions at finest resolution
    this.ixs = new Uint32Array(this.grid.nxArr[0] * this.grid.nyArr[0]);
    this.reset();

    // All vertices of all flowlines
    this.verts = new Float32Array(2_000_000);
    this.vertIx = 0;

    // Current forward and backward points
    this.fwpts = new Float32Array(20_000);
    this.bkpts = new Float32Array(20_000);

    // Interim vars
    this.change = new Vec2(0, 0);
    this.funHere = new Vec2(0, 0);
    this.endPt = new Vec2(0, 0);
  }

  reset() {
    this.grid.reset();
    for (let i = 0; i < this.ixs.length; ++i) this.ixs[i] = i;
    shuffle(this.ixs);
    this.nextIx = 0;
    this.vertIx = 0;
  }

  getNextPt() {
    while (true) {
      if (this.nextIx == this.ixs.length)
        return null;
      const ix = this.ixs[this.nextIx];
      const ny = Math.floor(ix / this.grid.nxArr[0]);
      const nx = ix % this.grid.nxArr[0];
      ++this.nextIx;
      const x = Math.floor((nx + Math.random()) * this.grid.cellWArr[0]);
      const y = Math.floor((ny + Math.random()) * this.grid.cellHArr[0]);
      if (!this.grid.isOccupied(x, y, 0))
        return new Vec2(x, y);
    }
  }

  genFlowLine() {

    let startPt = this.getNextPt();
    if (startPt == null)
      return -1;

    let flLength = 0;
    if (!this.fun(startPt, this.funHere))
      return 0;
    let level = this.densityFun ? Math.round((this.grid.nyArr.length - 1) * this.densityFun(startPt)) : 0;
    if (this.grid.isOccupied(startPt.x, startPt.y, level))
      return 0;

    let gridPoss = [], newGridPoss = [];
    for (let i = 0; i < this.grid.nxArr.length; ++i) {
      gridPoss.push(-1);
      newGridPoss.push(-1);
    }

    const tryAddPoint = (pt, forward, arr, ix) => {
      if (pt == null)
        return false;
      if (!this.fun(pt, this.funHere) || this.funHere.length() == 0)
        return false;
      if (!rk4(pt, this.fun, this.stepSize, this.change))
        return false;
      if (forward) pt.add(this.change);
      else pt.subtract(this.change);
      if (pt.x < 0 || pt.x >= this.width || pt.y < 0 || pt.y >= this.height)
        return false;
      let level = this.densityFun ? Math.round((this.grid.nyArr.length - 1) * this.densityFun(pt)) : 0;
      this.grid.getPoss(pt.x, pt.y, newGridPoss);
      if (ix > 2 && newGridPoss[level] != gridPoss[level] && this.grid.isOccupied(pt.x, pt.y, level))
        return false;
      this.grid.fill(pt.x, pt.y);
      [gridPoss, newGridPoss] = [newGridPoss, gridPoss];

      this.endPt.x = arr[ix-2];
      this.endPt.y = arr[ix-1];
      this.endPt.subtract(pt);
      flLength += this.endPt.length();
      arr[ix] = pt.x;
      arr[ix+1] = pt.y;
      return true;
    };

    let pt = startPt.clone();
    this.fwpts[0] = startPt.x;
    this.fwpts[1] = startPt.y;
    this.bkpts[0] = startPt.x;
    this.bkpts[1] = startPt.y;
    let fwIx = 2;
    let bkIx = 2;
    while (this.maxLength <= 0 || flLength <= this.maxLength) {
      if (!tryAddPoint(pt, true, this.fwpts, fwIx))
        break;
      fwIx += 2;
    }
    pt = startPt.clone();
    while (this.maxLength <= 0 || flLength <= this.maxLength) {
      if (!tryAddPoint(pt, false, this.bkpts, bkIx))
        break;
      bkIx += 2;
    }

    if (fwIx + bkIx < 6)
      return 0;

    for (let ix = bkIx - 2; ix >= 2; ix -=2) {
      this.verts[this.vertIx++] = this.bkpts[ix];
      this.verts[this.vertIx++] = this.bkpts[ix + 1];
    }

    for (let ix = 0; ix < fwIx; ix += 2) {
      this.verts[this.vertIx++] = this.fwpts[ix];
      this.verts[this.vertIx++] = this.fwpts[ix + 1];
    }
    this.verts[this.vertIx++] = NaN;
    this.verts[this.vertIx++] = NaN;

    return flLength;
  }
}

const k1 = new Vec2(0, 0);
const k2 = new Vec2(0, 0);
const k3 = new Vec2(0, 0);
const k4 = new Vec2(0, 0);
const kk = new Vec2(0, 0);

function rk4(pt, fun, step, change) {
  if (!fun(pt, k1))
    return false;
  kk.x = pt.x + k1.x * step * 0.5;
  kk.y = pt.y + k1.y * step * 0.5;
  if (!fun(kk, k2))
    return false;
  kk.x = pt.x + k2.x * step * 0.5;
  kk.y = pt.y + k2.y * step * 0.5;
  if (!fun(kk, k3))
    return false;
  kk.x = pt.x + k2.x * step * 0.5;
  kk.y = pt.y + k3.y * step * 0.5;
  if (!fun(kk, k4))
    return false;
  k1.multiply(step / 6);
  k2.multiply(step / 3);
  k3.multiply(step / 3);
  k4.multiply(step / 6);
  change.set(k1);
  change.add(k2);
  change.add(k3);
  change.add(k4);
  return true;
}


class OccupancyGrid {

  constructor(width, height, minCellSz, maxCellSz, nSizes, logarithmic) {
    this.width = width;
    this.height = height;

    // Grid dimensions and cell sizes at the different levels
    this.nxArr = [];
    this.nyArr = [];
    this.cellWArr = [];
    this.cellHArr = [];
    const cellSizes = this.calcCellSizes(minCellSz, maxCellSz, nSizes, logarithmic);
    for (let i = 0; i < nSizes; ++i) {
      const cellSz = cellSizes[i];
      const nx = Math.round(width / cellSz);
      const ny = Math.round(height / cellSz);
      this.nxArr.push(nx);
      this.nyArr.push(ny);
      this.cellWArr.push(width / nx);
      this.cellHArr.push(height / ny);
    }
    this.data = new Uint32Array(this.nxArr[0] * this.nyArr[0]);
  }

  reset() {
    for (let i = 0; i < this.data.length; ++i)
      this.data[i] = 0;
  }

  calcCellSizes(minCellSz, maxCellSz, nSizes, logarithmic) {
    const sizes = [];
    // Linear
    if (!logarithmic) {
      const diff = (maxCellSz - minCellSz) / (nSizes - 1);
      for (let i = 0; i < nSizes; ++i)
        sizes.push(minCellSz + i * diff);
    }
    // Logarithmic
    else {
      const logDiff = Math.log2(maxCellSz - minCellSz + 1) / (nSizes - 1);
      for (let i = 0; i < nSizes; ++i)
        sizes.push(minCellSz + Math.pow(2, i * logDiff) - 1);
    }
    return sizes;
  }

  getPoss(x, y, poss) {
    for (let i = 0; i < this.nxArr.length; ++i)
      poss[i] = this.getPos(x, y, i);
    // let res = [];
    // for (let i = 0; i < this.nxArr.length; ++i)
    //   res.push(this.getPos(x, y, i));
    // return res;
  }

  getPos(x, y, level) {
    const ix = Math.floor(x / this.cellWArr[level]);
    const iy = Math.floor(y / this.cellHArr[level]);
    return iy * this.nxArr[level] + ix;
  }

  isOccupied(x, y, level) {
    const pos = this.getPos(x, y, level);
    const val = this.data[pos];
    const mask = 1 << level;
    return (val & mask) != 0;
  }

  fill(x, y) {
    for (let i = 0; i <= this.nxArr.length; ++i) {
      const pos = this.getPos(x, y, i);
      const mask = 1 << i;
      this.data[pos] |= mask;
    }
  }
}

export {FlowLineGenerator, Vec2}
