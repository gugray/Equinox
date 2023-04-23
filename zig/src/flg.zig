const std = @import("std");
const math = @import("std").math;
const expect = @import("std").testing.expect;
const Allocator = std.mem.Allocator;
const flg = @import("flowline_generator.zig");
const gpall = @import("alloc.zig").gpall;
const utils = @import("utils.zig");
const Vec2 = utils.Vec2;
const FieldVal = utils.FieldVal;

// This helps all tests get executed, even for unreferenced code
test {
    std.testing.refAllDecls(@This());
}

// TODO: parameterize trg length
// TODO: reset flow line generator for subsequent use

var g_initialized = false;
var g_flgen: *flg.FlowlineGenerator = undefined;
var g_data: []f32 = undefined;
var g_trg: []u32 = undefined;
var g_trg_pos: u32 = undefined;

export fn initFlowlineGenerator(
    width: u32,
    height: u32,
    minCellSz: f32,
    maxCellSz: f32,
    nSizes: u32,
    logarithmic: bool,
    stepSize: f32,
    maxLength: f32,
) i32 {
    if (doInitFlowlineGenerator(width, height, minCellSz, maxCellSz, nSizes, logarithmic, stepSize, maxLength)) |_| {
        return 1;
    } else |_| {
        return 0;
    }
}

fn doInitFlowlineGenerator(
    width: u32,
    height: u32,
    minCellSz: f32,
    maxCellSz: f32,
    nSizes: u32,
    logarithmic: bool,
    stepSize: f32,
    maxLength: f32,
) !void {
    if (g_initialized) {
        g_flgen.destroy();
        gpall.free(g_data);
        gpall.free(g_trg);
    }
    g_flgen = try flg.FlowlineGenerator.create(gpall, .{
        .width = width,
        .height = height,
        .stepSize = stepSize,
        .maxLength = maxLength,
        .minCellSize = minCellSz,
        .maxCellSize = maxCellSz,
        .nShades = nSizes,
        .logGrid = logarithmic,
    });
    g_data = try gpall.alloc(f32, width * height * 2 * 4);
    g_trg = try gpall.alloc(u32, 10_000_000);
}

test "Execute initFlowlineGenerator" {
    var res = initFlowlineGenerator(1480, 1050, 3, 24, 12, true, 1, 0);
    try expect(res == 1);
}

export fn reset(reShuffle: bool) void {
    if (g_flgen.reset(reShuffle)) |_| {}
}

export fn getDataAddr() [*]f32 {
    return g_data.ptr;
}

export fn getTrgAddr() [*]u32 {
    return g_trg.ptr;
}

fn density(pt: Vec2) f32 {
    const w = g_flgen.params.width;
    var x = @floatToInt(u32, math.floor(pt.x));
    var y = @floatToInt(u32, math.floor(pt.y));
    var res = g_data[(y * w * 2 + w + x) * 4];
    if (res < 0) res = 0;
    if (res > 1) res = 1;
    return res;
    // In the first pane:
    // g_data[(y * w * 2 + x) * 4];
}

fn field(pt: Vec2) FieldVal {
    const w = g_flgen.params.width;
    const h = g_flgen.params.height;
    const x = @floatToInt(i32, math.floor(pt.x));
    const y = @floatToInt(i32, math.floor(pt.y));
    if (x < 1 or x >= w - 1 or y < 1 or y >= h - 1)
        return .{ .dir = Vec2.nan(), .dist = math.nan_f32 };
    var dist = g_data[(@intCast(u32, y) * w * 2 + w + @intCast(u32, x)) * 4 + 1];
    if (dist == 0)
        return .{ .dir = Vec2.nan(), .dist = dist };
    var dir: Vec2 = .{
        .x = g_data[(@intCast(u32, y) * w * 2 + w + @intCast(u32, x)) * 4 + 2],
        .y = g_data[(@intCast(u32, y) * w * 2 + w + @intCast(u32, x)) * 4 + 3],
    };
    const len = dir.len();
    if (len < 0.00001) return .{ .dir = Vec2.nan(), .dist = dist };
    dir = dir.mul(1 / len);
    return .{ .dir = dir, .dist = dist };
}

fn savePoint(pt: Vec2) void {
    g_trg[g_trg_pos] = @floatToInt(u32, math.round(pt.x));
    g_trg_pos += 1;
    g_trg[g_trg_pos] = @floatToInt(u32, math.round(pt.y));
    g_trg_pos += 1;
}

fn saveFlowline(fwPoints: []Vec2, bkPoints: []Vec2) void {
    // if (g_trg_pos + (fwPoints.len + bkPoints.len - 1) * 2 + 2 > g_trg.len)
    //     return;
    var i = bkPoints.len - 1;
    while (i > 0) : (i -= 1) {
        savePoint(bkPoints[i]);
    }
    i = 0;
    while (i < fwPoints.len) : (i += 1) {
        savePoint(fwPoints[i]);
    }
    g_trg[g_trg_pos] = 0xffffffff;
    g_trg_pos += 1;
    g_trg[g_trg_pos] = 0xffffffff;
    g_trg_pos += 1;
}

export fn genFlowlines(reShuffle: bool, logGrid: bool) i32 {
    var nLines: i32 = 0;
    g_trg_pos = 0;
    g_flgen.params.logGrid = logGrid;
    if (g_flgen.reset(reShuffle)) |_| {}
    while (true) {
        if (g_flgen.genFlowline(field, density)) |fl| {
            if (fl.fwPoints.len == 0) break;
            if (fl.fwPoints.len + fl.bkPoints.len < 3) continue;
            if (fl.length < g_flgen.params.minCellSize) continue;
            saveFlowline(fl.fwPoints, fl.bkPoints);
            nLines += 1;
        } else |_| {
            return -1;
        }
    }
    return nLines;
}

export fn seedPRNG(seed: i64) void {
    const pseed = if (seed < 0) -seed else seed;
    utils.seedPRNG(@intCast(u64, pseed));
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

fn doLargeDataTest() !void {
    var file = try std.fs.cwd().openFile("../data.txt", .{});
    defer file.close();

    var buf_reader = std.io.bufferedReader(file.reader());
    var in_stream = buf_reader.reader();
    var buf: [1024]u8 = undefined;

    var itemCountStr = try in_stream.readUntilDelimiterOrEof(&buf, '\n');
    var itemCount = try std.fmt.parseUnsigned(u32, itemCountStr.?, 10);

    g_data = try gpall.alloc(f32, itemCount);
    g_trg = try gpall.alloc(u32, 10_000_000);

    var arrIx: u32 = 0;
    while (try in_stream.readUntilDelimiterOrEof(&buf, '\n')) |line| {
        var p0 = std.mem.indexOfPos(u8, line, 0, " ").?;
        var p1 = std.mem.indexOfPos(u8, line, p0 + 1, " ").?;
        var p2 = std.mem.indexOfPos(u8, line, p1 + 1, " ").?;
        var str0 = line[0..p0];
        var str1 = line[p0 + 1 .. p1];
        var str2 = line[p1 + 1 .. p2];
        var str3 = line[p2 + 1 ..];
        g_data[arrIx] = try std.fmt.parseFloat(f32, str0);
        arrIx += 1;
        g_data[arrIx] = try std.fmt.parseFloat(f32, str1);
        arrIx += 1;
        g_data[arrIx] = try std.fmt.parseFloat(f32, str2);
        arrIx += 1;
        g_data[arrIx] = try std.fmt.parseFloat(f32, str3);
        arrIx += 1;
    }
    try expect(arrIx == itemCount);

    g_flgen = try flg.FlowlineGenerator.create(gpall, .{
        .width = 1480,
        .height = 1050,
        .stepSize = 1,
        .maxLength = 0,
        .minCellSize = 3,
        .maxCellSize = 24,
        .nShades = 12,
        .logGrid = true,
    });

    const msStart = std.time.milliTimestamp();
    var nLines = genFlowlines(true, true);
    const msElapsed = std.time.milliTimestamp() - msStart;
    std.debug.print("\n\n# flowlines: {d} in {d} msec\n\n", .{ nLines, msElapsed });
}

test "test with large data" {
    // try doLargeDataTest();
}
