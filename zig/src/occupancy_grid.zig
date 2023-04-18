const std = @import("std");
const math = @import("std").math;
const expect = @import("std").testing.expect;
const assert = @import("std").debug.assert;
const Allocator = std.mem.Allocator;
const gpall = @import("alloc.zig").gpall;
const utils = @import("utils.zig");
const Vec2 = utils.Vec2;

// This helps all tests get executed, even for unreferenced code
test {
    std.testing.refAllDecls(@This());
}

const LayerInfo = struct {
    /// Number of horizontal cells
    nx: u32,
    /// Number of vertical cells
    ny: u32,
    /// Width of each cell
    cellw: f32,
    /// Height of each cell
    cellh: f32,
};

pub const OccupancyGrid = struct {
    alloc: Allocator,
    width: u32,
    height: u32,

    /// Grid dimensions and cell sizes at the different levels
    layers: []LayerInfo,

    // Occupancy data
    data: []u32,

    pub fn create(alloc: Allocator, width: u32, height: u32, minCellSz: f32, maxCellSz: f32, nSizes: u32, logarithmic: bool) !*OccupancyGrid {
        var self = try alloc.create(OccupancyGrid);
        self.alloc = alloc;
        self.width = width;
        self.height = height;

        self.layers = try alloc.alloc(LayerInfo, nSizes);

        const cellSizes = try makeCellSizes(alloc, minCellSz, maxCellSz, nSizes, logarithmic);
        defer alloc.free(cellSizes);

        var i: u32 = 0;
        while (i < nSizes) : (i += 1) {
            const cellSz = cellSizes[i];
            const nx = math.round(@intToFloat(f32, width) / cellSz);
            const ny = math.round(@intToFloat(f32, height) / cellSz);
            const l = .{
                .nx = @floatToInt(u32, nx),
                .ny = @floatToInt(u32, ny),
                .cellw = @intToFloat(f32, width) / nx,
                .cellh = @intToFloat(f32, height) / ny,
            };
            self.layers[i] = l;
        }
        self.data = try alloc.alloc(u32, self.cellCount());
        errdefer alloc.free(self.data);
        for (self.data) |_, ix| {
            self.data[ix] = 0;
        }
        return self;
    }

    pub fn destroy(self: *OccupancyGrid) void {
        self.alloc.free(self.data);
        self.alloc.free(self.layers);
        self.alloc.destroy(self);
    }

    pub fn reset(self: *OccupancyGrid) void {
        for (self.data) |_, ix| {
            self.data[ix] = 0;
        }
    }

    pub fn cellCount(self: *OccupancyGrid) u32 {
        return self.layers[0].nx * self.layers[0].ny;
    }

    pub fn getPoss(self: *OccupancyGrid, pt: Vec2, poss: []u32) void {
        assert(poss.len == self.layers.len);
        var i: u32 = 0;
        while (i < self.layers.len) : (i += 1) {
            poss[i] = self.getPos(pt, i);
        }
    }

    pub fn getPos(self: *OccupancyGrid, pt: Vec2, level: u32) u32 {
        assert(level < self.layers.len);
        const ix = @floatToInt(u32, math.floor(pt.x / self.layers[level].cellw));
        const iy = @floatToInt(u32, math.floor(pt.y / self.layers[level].cellh));
        return iy * self.layers[level].nx + ix;
    }

    pub fn isOccupied(self: *OccupancyGrid, pt: Vec2, level: u32) bool {
        assert(level < self.layers.len);
        const pos = self.getPos(pt, level);
        const val = self.data[pos];
        const mask: u32 = @intCast(u32, 1) << @intCast(u5, level);
        return (val & mask) != 0;
    }

    pub fn fill(self: *OccupancyGrid, pt: Vec2) void {
        var i: u32 = 0;
        while (i < self.layers.len) : (i += 1) {
            const pos = self.getPos(pt, i);
            const mask: u32 = @intCast(u32, 1) << @intCast(u5, i);
            self.data[pos] |= mask;
        }
    }
};

fn makeCellSizes(alloc: Allocator, minCellSz: f32, maxCellSz: f32, nSizes: u32, logarithmic: bool) ![]f32 {
    const sizes = try alloc.alloc(f32, nSizes);
    // Linear
    if (!logarithmic) {
        const diff = (maxCellSz - minCellSz) / @intToFloat(f32, nSizes - 1);
        var i: u32 = 0;
        while (i < nSizes) : (i += 1) {
            sizes[i] = minCellSz + @intToFloat(f32, i) * diff;
        }
    }
    // Logarithmic
    else {
        const logDiff = math.log2(maxCellSz - minCellSz + 1) / @intToFloat(f32, nSizes - 1);
        var i: u32 = 0;
        while (i < nSizes) : (i += 1) {
            sizes[i] = minCellSz + math.pow(f32, 2, @intToFloat(f32, i) * logDiff) - 1;
        }
    }
    return sizes;
}

test "calculate linear cell sizes" {
    const sizes = try makeCellSizes(gpall, 2, 5, 3, false);
    defer gpall.free(sizes);
    try expect(sizes.len == 3);
    try expect(sizes[0] == 2);
    try expect(sizes[1] == 3.5);
    try expect(sizes[2] == 5);
}

test "calculate logarithmic cell sizes" {
    const sizes = try makeCellSizes(gpall, 2, 5, 3, true);
    defer gpall.free(sizes);
    try expect(sizes.len == 3);
    try expect(sizes[0] == 2);
    try expect(sizes[1] == 3);
    try expect(sizes[2] == 5);
}

test "initialize simple occupancy grid" {
    const grid = try OccupancyGrid.create(gpall, 100, 80, 2, 5, 3, true);
    defer grid.destroy();

    try expect(grid.width == 100);
    try expect(grid.height == 80);
    try expect(grid.layers[0].nx == 50);
    try expect(grid.layers[1].nx == 33);
    try expect(grid.layers[2].nx == 20);
    try expect(grid.layers[0].ny == 40);
    try expect(grid.layers[1].ny == 27);
    try expect(grid.layers[2].ny == 16);
    try expect(grid.layers[0].cellw == 100.0 / 50.0);
    try expect(grid.layers[1].cellw == 100.0 / 33.0);
    try expect(grid.layers[2].cellw == 100.0 / 20.0);
    try expect(grid.layers[0].cellh == 80.0 / 40.0);
    try expect(grid.layers[1].cellh == 80.0 / 27.0);
    try expect(grid.layers[2].cellh == 80.0 / 16.0);
    try expect(grid.data.len == 50 * 40);
}

test "get grid positions" {
    const grid = try OccupancyGrid.create(gpall, 100, 80, 2, 5, 3, true);
    defer grid.destroy();

    try expect(grid.getPos(.{ .x = 0, .y = 0 }, 0) == 0);
    try expect(grid.getPos(.{ .x = 2, .y = 0 }, 0) == 1);
    try expect(grid.getPos(.{ .x = 2, .y = 2 }, 0) == 51);

    var poss: [3]u32 = .{ 42, 42, 42 };
    grid.getPoss(.{ .x = 30, .y = 30 }, poss[0..]);
    try expect(poss[0] == 765);
    try expect(poss[1] == 339);
    try expect(poss[2] == 126);
}

test "cells filled and occupied" {
    const grid = try OccupancyGrid.create(gpall, 100, 80, 2, 5, 3, true);
    defer grid.destroy();

    try expect(grid.isOccupied(.{ .x = 20, .y = 15 }, 0) == false);

    grid.fill(.{ .x = 20, .y = 15 });
    try expect(grid.isOccupied(.{ .x = 20, .y = 15 }, 0) == true);
    try expect(grid.isOccupied(.{ .x = 20, .y = 15 }, 1) == true);
    try expect(grid.isOccupied(.{ .x = 20, .y = 15 }, 2) == true);
    try expect(grid.isOccupied(.{ .x = 21, .y = 14 }, 0) == true);
    try expect(grid.isOccupied(.{ .x = 19, .y = 16 }, 1) == true);
    try expect(grid.isOccupied(.{ .x = 23, .y = 18 }, 2) == true);
}
