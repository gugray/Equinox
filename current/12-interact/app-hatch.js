import {rand} from "../../src/random.js";

const nVortexPts = 3;

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
    // return Math.sqrt(this.x**2 + this.y **2);
  }

  normalize() {
    let len = this.length();
    if (len == 0) return;
    this.x /= len;
    this.y /= len;
    this.len = 1;
  }

  multiply(val) {
    return new Vec2(this.x * val, this.y * val);
  }

  add(pt) {
    return new Vec2(this.x + pt.x, this.y + pt.y);
  }

  subtract(pt) {
    return new Vec2(this.x - pt.x, this.y - pt.y);
  }

  clone() {
    return new Vec2(this.x, this.y);
  }
}

function shuffle(arr) {
  let currIx = arr.length;
  while (currIx != 0) {
    let randIx = Math.floor(rand() * currIx);
    currIx--;
    [arr[currIx], arr[randIx]] = [arr[randIx], arr[currIx]];
  }
  return arr;
}


class FlowLineGenerator {

  constructor({
                width, height, field, stepSize, maxLength,
                density,
                minCellSize, maxCellSize, nShades, logGrid
              }) {
    this.width = width;
    this.height = height;
    this.field = field;
    this.density = density;
    this.maxLength = maxLength;
    this.stepSize = stepSize;
    this.grid = new OccupancyGrid(width, height, minCellSize, maxCellSize, nShades, logGrid);

    // Random grid positions at finest resolution
    this.ixs = new Uint32Array(this.grid.nxArr[0] * this.grid.nyArr[0]);
    for (let i = 0; i < this.ixs.length; ++i) this.ixs[i] = i;
    shuffle(this.ixs);
    this.nextIx = 0;
  }

  getNextStartPt() {
    while (true) {
      if (this.nextIx == this.ixs.length)
        return null;
      const ix = this.ixs[this.nextIx];
      const ny = Math.floor(ix / this.grid.nxArr[0]);
      const nx = ix % this.grid.nxArr[0];
      ++this.nextIx;
      const res = new Vec2(
        Math.floor((nx + rand()) * this.grid.cellWArr[0]),
        Math.floor((ny + rand()) * this.grid.cellHArr[0]));
      if (!this.grid.isOccupied(res.x, res.y, 0))
        return res;
    }
  }

  genFlowLine() {

    let startPt = this.getNextStartPt();
    if (startPt == null)
      return [null, 0];

    // startPt = new Vec2(426, 301);

    const points = [startPt];
    let flLength = 0;
    if (this.field(startPt) == null)
      return [points, flLength];
    let level = this.density ? Math.round((this.grid.nyArr.length - 1) * this.density(startPt)) : 0;
    if (this.grid.isOccupied(startPt.x, startPt.y, level))
      return [points, flLength];

    // if (startPt.x > 100 || startPt.y > 100)
    //   return [points, 0];


    const isVortex = (forward) => {
      if (points.length < nVortexPts) return false;
      let [pt1, pt2] = forward
        ? [points[points.length - nVortexPts], points[points.length - 1]]
        : [points[0], points[nVortexPts - 1]];
      let diff = pt1.subtract(pt2);
      return diff.length() < this.stepSize;
    }

    const tryAddPoint = (pt, gridPoss, forward) => {
      if (pt == null) return [pt, gridPoss];
      let funHere = this.field(pt);
      if (funHere == null || funHere.length() == 0)
        return [null, gridPoss];
      const change = this.rk4(pt);
      if (!change)
        return [null, gridPoss];
      if (forward) pt = pt.add(change);
      else pt = pt.subtract(change);
      if (pt.x < 0 || pt.x >= this.width || pt.y < 0 || pt.y >= this.height)
        return [null, gridPoss];
      let level = this.density ? Math.round((this.grid.nyArr.length - 1) * this.density(pt)) : 0;
      const currPoss = this.grid.getPoss(pt.x, pt.y);
      if (gridPoss != null && currPoss[level] != gridPoss[level] && this.grid.isOccupied(pt.x, pt.y, level))
        return [null, gridPoss];
      this.grid.fill(pt.x, pt.y);
      gridPoss = currPoss;
      if (forward) {
        flLength += points[points.length - 1].subtract(pt).length();
        points.push(pt);
      }
      else {
        flLength += points[0].subtract(pt).length();
        points.unshift(pt);
      }
      return [pt, gridPoss];
    };

    let fwPt = startPt.clone();
    let fwGridPoss = null;
    let bkPt = startPt.clone();
    let bkGridPoss = null;

    let iter = 0;
    while (this.maxLength <= 0 || flLength <= this.maxLength) {
      if (fwPt != null) [fwPt, fwGridPoss] = tryAddPoint(fwPt, fwGridPoss, true);
      // if (fwPt != null && (isNaN(fwPt.x) || isNaN(fwPt.y))) {
      //   fwPt = null;
      //   points.pop();
      // }
      if (fwPt != null && isVortex(true)) {
        fwPt = null;
      }
      if (bkPt != null) [bkPt, bkGridPoss] = tryAddPoint(bkPt, bkGridPoss, false);
      // if (bkPt != null && (isNaN(bkPt.x) || isNaN(bkPt.y))) {
      //   bkPt = null;
      //   points.shift();
      // }
      if (bkPt != null && isVortex(false))
        bkPt = null;
      if (fwPt == null && bkPt == null)
        break;
      ++iter;
      if (iter >= 10000)
        alert("boo");
    }

    return [points, flLength];
  }

  rk4(pt) {
    const step = this.stepSize;
    const k1 = this.field(pt);
    if (!k1) return null;
    const k2 = this.field(pt.add(k1.multiply(step * 0.5)));
    if (!k2) return null;
    const k3 = this.field(pt.add(k2.multiply(step * 0.5)));
    if (!k3) return null;
    const k4 = this.field(pt.add(k3.multiply(step)));
    if (!k4) return null;
    const res = k1.multiply(step / 6).add(k2.multiply(step / 3)).add(k3.multiply(step / 3)).add(k4.multiply(step / 6));
    return res;
  }
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

    // this.nx = Math.round(width / cellSz);
    // this.ny = Math.round(height / cellSz);
    // this.cellW = width / this.nx;
    // this.cellH = height / this.ny;
    // this.data = new Uint32Array(this.nx * this.ny);
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

  getPoss(x, y) {
    let res = [];
    for (let i = 0; i < this.nxArr.length; ++i)
      res.push(this.getPos(x, y, i));
    return res;
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
    for (let i = 0; i < this.nxArr.length; ++i) {
      const pos = this.getPos(x, y, i);
      const mask = 1 << i;
      this.data[pos] |= mask;
    }
  }
}

export {FlowLineGenerator, Vec2}
