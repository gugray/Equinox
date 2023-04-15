const std = @import("std");
const math = @import("std").math;
const expect = @import("std").testing.expect;
const Allocator = std.mem.Allocator;
const og = @import("occupancy_grid.zig");
const gpall = @import("alloc.zig").gpall;

var grid: *og.OccupancyGrid = undefined;

export fn initFlowLineGenerator(width: u32, height: u32, minCellSz: f32, maxCellSz: f32, nSizes: usize, logarithmic: bool) i32 {
    if (grid != undefined) {
        grid.destroy();
    }
    if (og.OccupancyGrid.create(gpall, width, height, minCellSz, maxCellSz, nSizes, logarithmic)) |val| {
        grid = val;
        return @intCast(i32, grid.data.len);
    } else |_| {
        return 1;
    }
}

pub fn log(
    comptime message_level: std.log.Level,
    comptime scope: @Type(.EnumLiteral),
    comptime format: []const u8,
    args: anytype,
) void {
    _ = message_level;
    _ = scope;
    _ = format;
    _ = args;
}
