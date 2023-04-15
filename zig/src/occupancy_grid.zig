const std = @import("std");
const math = @import("std").math;
const expect = @import("std").testing.expect;
const Allocator = std.mem.Allocator;
const gpall = @import("alloc.zig").gpall;

pub const OccupancyGrid = struct {
    alloc: Allocator,
    width: u32,
    height: u32,

    // Grid dimensions and cell sizes at the different levels
    nxArr: []u32,
    nyArr: []u32,
    cellWArr: []f32,
    cellHArr: []f32,

    // Occupancy data
    data: []u32,

    pub fn create(alloc: Allocator, width: u32, height: u32, minCellSz: f32, maxCellSz: f32, nSizes: usize, logarithmic: bool) !*OccupancyGrid {
        var grid = try alloc.create(OccupancyGrid);
        grid.alloc = alloc;
        grid.width = width;
        grid.height = height;
        grid.nxArr = try alloc.alloc(u32, nSizes);
        grid.nyArr = try alloc.alloc(u32, nSizes);
        grid.cellWArr = try alloc.alloc(f32, nSizes);
        grid.cellHArr = try alloc.alloc(f32, nSizes);
        const cellSizes = try makeCellSizes(alloc, minCellSz, maxCellSz, nSizes, logarithmic);
        defer alloc.free(cellSizes);
        var i: u32 = 0;
        while (i < nSizes) : (i += 1) {
            const cellSz = cellSizes[i];
            const nx = math.round(@intToFloat(f32, width) / cellSz);
            const ny = math.round(@intToFloat(f32, height) / cellSz);
            grid.nxArr[i] = @floatToInt(u32, nx);
            grid.nyArr[i] = @floatToInt(u32, ny);
            grid.cellWArr[i] = @intToFloat(f32, width) / nx;
            grid.cellHArr[i] = @intToFloat(f32, height) / ny;
        }
        grid.data = try alloc.alloc(u32, grid.nxArr[0] * grid.nyArr[0]);
        for (grid.data) |_, ix| {
            grid.data[ix] = 0;
        }
        return grid;
    }

    pub fn destroy(self: *OccupancyGrid) void {
        self.alloc.free(self.data);
        self.alloc.destroy(self);
    }
};

fn makeCellSizes(alloc: Allocator, minCellSz: f32, maxCellSz: f32, nSizes: usize, logarithmic: bool) ![]f32 {
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
    try expect(grid.nxArr[0] == 50);
    try expect(grid.nxArr[1] == 33);
    try expect(grid.nxArr[2] == 20);
    try expect(grid.nyArr[0] == 40);
    try expect(grid.nyArr[1] == 27);
    try expect(grid.nyArr[2] == 16);
    try expect(grid.cellWArr[0] == 100.0 / 50.0);
    try expect(grid.cellWArr[1] == 100.0 / 33.0);
    try expect(grid.cellWArr[2] == 100.0 / 20.0);
    try expect(grid.cellHArr[0] == 80.0 / 40.0);
    try expect(grid.cellHArr[1] == 80.0 / 27.0);
    try expect(grid.cellHArr[2] == 80.0 / 16.0);
    try expect(grid.data.len == 50 * 40);
}
