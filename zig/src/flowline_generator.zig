const std = @import("std");
const math = @import("std").math;
const expect = @import("std").testing.expect;
const assert = @import("std").debug.assert;
const Allocator = std.mem.Allocator;
const gpall = @import("alloc.zig").gpall;
const ArrayList = std.ArrayList;
const og = @import("occupancy_grid.zig");
const utils = @import("utils.zig");
const Vec2 = utils.Vec2;

// This helps all tests get executed, even for unreferenced code
test {
    std.testing.refAllDecls(@This());
}

const fieldFun = fn (pt: Vec2) Vec2;
const densityFun = fn (pt: Vec2) f32;

pub const Params = struct {
    width: u32,
    height: u32,
    stepSize: f32,
    maxLength: f32,
    minCellSize: f32,
    maxCellSize: f32,
    nShades: u32,
    logGrid: bool = true,
};

pub const Flowline = struct {
    fwPoints: []Vec2,
    bkPoints: []Vec2,
    length: f32 = 0,
};

pub const FlowlineGenerator = struct {
    alloc: Allocator,
    params: Params,
    stepSq: f32 = undefined,
    grid: *og.OccupancyGrid = undefined,
    nextIx: u32,
    ixs: []u32 = undefined,
    fwPoints: ArrayList(Vec2) = undefined,
    bkPoints: ArrayList(Vec2) = undefined,
    gridPoss1: []u32 = undefined,
    gridPoss2: []u32 = undefined,

    pub fn create(alloc: Allocator, params: Params) !*FlowlineGenerator {
        var self = try alloc.create(FlowlineGenerator);
        self.alloc = alloc;
        self.params = params;
        self.stepSq = self.params.stepSize * self.params.stepSize;

        self.grid = try og.OccupancyGrid.create(alloc, params.width, params.height, params.minCellSize, params.maxCellSize, params.nShades, params.logGrid);
        errdefer self.grid.destroy();

        self.ixs = try alloc.alloc(u32, self.grid.cellCount());
        errdefer alloc.free(self.ixs);

        var i: u32 = 0;
        while (i < self.ixs.len) : (i += 1) {
            self.ixs[i] = i;
        }

        utils.shuffle(self.ixs);
        self.nextIx = 0;

        self.fwPoints = ArrayList(Vec2).init(self.alloc);
        errdefer self.fwPoints.deinit();

        self.bkPoints = ArrayList(Vec2).init(self.alloc);
        errdefer self.bkPoints.deinit();

        self.gridPoss1 = try alloc.alloc(u32, params.nShades);
        errdefer self.alloc.free(self.gridPoss1);

        self.gridPoss2 = try alloc.alloc(u32, params.nShades);
        errdefer self.alloc.free(self.gridPoss2);

        return self;
    }

    pub fn destroy(self: *FlowlineGenerator) void {
        self.alloc.free(self.gridPoss2);
        self.alloc.free(self.gridPoss1);
        self.bkPoints.deinit();
        self.fwPoints.deinit();
        self.alloc.free(self.ixs);
        self.grid.destroy();
        self.alloc.destroy(self);
    }

    pub fn genFlowline(self: *FlowlineGenerator, field: *const fieldFun, density: *const densityFun) !Flowline {
        self.fwPoints.clearRetainingCapacity();
        self.bkPoints.clearRetainingCapacity();
        const startPt = self.getNextStartPt();
        if (startPt.isNan()) {
            return .{ .fwPoints = self.fwPoints.items, .bkPoints = self.bkPoints.items };
        }

        try self.fwPoints.append(startPt);
        try self.bkPoints.append(startPt);
        var startVal = field(startPt);
        if (startVal.isNan()) {
            return .{ .fwPoints = self.fwPoints.items, .bkPoints = self.bkPoints.items };
        }
        var level = @floatToInt(u32, math.round(@intToFloat(f32, self.grid.layers.len - 1) * density(startPt)));
        if (self.grid.isOccupied(startPt, level)) {
            return .{ .fwPoints = self.fwPoints.items, .bkPoints = self.bkPoints.items };
        }
        self.grid.fill(startPt);

        // Build forward
        var pt = startPt;
        var fwLength: f32 = 0;
        self.grid.getPoss(startPt, self.gridPoss1);
        var oldGridPoss: *[]u32 = &self.gridPoss1;
        var newGridPoss: *[]u32 = &self.gridPoss2;

        while (self.params.maxLength <= 0 or fwLength <= self.params.maxLength) {
            const ok = try self.tryAddPoint(pt, field, density, &self.fwPoints, oldGridPoss.*, newGridPoss.*, true);
            if (!ok) break;
            const nPoints = self.fwPoints.items.len;
            pt = self.fwPoints.items[nPoints - 1];
            var diff = self.fwPoints.items[nPoints - 1].sub(self.fwPoints.items[nPoints - 2]);
            fwLength += diff.len();
            if (isVortex(self.fwPoints.items, self.stepSq)) break;
            var tmp = oldGridPoss;
            oldGridPoss = newGridPoss;
            newGridPoss = tmp;
        }

        // Build backwards
        pt = startPt;
        var bkLength: f32 = 0;
        self.grid.getPoss(startPt, self.gridPoss1);
        oldGridPoss = &self.gridPoss1;
        newGridPoss = &self.gridPoss2;

        while (self.params.maxLength <= 0 or fwLength + bkLength <= self.params.maxLength) {
            const ok = try self.tryAddPoint(pt, field, density, &self.bkPoints, oldGridPoss.*, newGridPoss.*, false);
            if (!ok) break;
            const nPoints = self.bkPoints.items.len;
            pt = self.bkPoints.items[nPoints - 1];
            var diff = self.bkPoints.items[nPoints - 1].sub(self.bkPoints.items[nPoints - 2]);
            bkLength += diff.len();
            if (isVortex(self.bkPoints.items, self.stepSq)) break;
            var tmp = oldGridPoss;
            oldGridPoss = newGridPoss;
            newGridPoss = tmp;
        }

        return .{
            .fwPoints = self.fwPoints.items,
            .bkPoints = self.bkPoints.items,
            .length = fwLength + bkLength,
        };
    }

    fn tryAddPoint(
        self: *FlowlineGenerator,
        pt: Vec2,
        field: *const fieldFun,
        density: *const densityFun,
        points: *ArrayList(Vec2),
        oldGridPoss: []u32,
        newGridPoss: []u32,
        fwd: bool,
    ) !bool {
        if (pt.isNan())
            return false;
        var funHere = field(pt);
        if (funHere.isNan() or funHere.len() == 0)
            return false;
        var change = self.rk4(field, pt);
        if (change.isNan())
            return false;
        var newPt = pt;
        newPt = if (fwd) newPt.add(change) else newPt.sub(change);
        if (newPt.x < 0 or newPt.x >= @intToFloat(f32, self.params.width))
            return false;
        if (newPt.y < 0 or newPt.y >= @intToFloat(f32, self.params.height))
            return false;
        const level = @floatToInt(u32, math.round(@intToFloat(f32, self.grid.layers.len - 1) * density(newPt)));
        self.grid.getPoss(newPt, newGridPoss);
        if (newGridPoss[level] != oldGridPoss[level] and self.grid.isOccupied(newPt, level))
            return false;
        self.grid.fill(newPt);
        try points.append(newPt);
        return true;
    }

    fn isVortex(points: []Vec2, stepSizeSquared: f32) bool {
        if (points.len < 3) return false;
        var pt1 = points[points.len - 3];
        var pt2 = points[points.len - 1];
        var diff = pt1.sub(pt2);
        return diff.x * diff.x + diff.y * diff.y < stepSizeSquared;
    }

    fn getNextStartPt(self: *FlowlineGenerator) Vec2 {
        while (true) {
            if (self.nextIx == self.ixs.len)
                return Vec2.nan();
            const ix = self.ixs[self.nextIx];
            const ny = ix / self.grid.layers[0].nx;
            const nx = ix % self.grid.layers[0].nx;
            self.nextIx += 1;
            const res: Vec2 = .{
                .x = math.floor((@intToFloat(f32, nx) + utils.rand.float(f32)) * self.grid.layers[0].cellw),
                .y = math.floor((@intToFloat(f32, ny) + utils.rand.float(f32)) * self.grid.layers[0].cellh),
            };
            if (!self.grid.isOccupied(res, 0))
                return res;
        }
    }

    fn rk4(self: *FlowlineGenerator, field: *const fieldFun, pt: Vec2) Vec2 {
        const step = self.params.stepSize;
        var k1 = field(pt);
        if (k1.isNan()) return Vec2.nan();
        var k2 = field(pt.add(k1.mul(step * 0.5)));
        if (k2.isNan()) return Vec2.nan();
        var k3 = field(pt.add(k2.mul(step * 0.5)));
        if (k3.isNan()) return Vec2.nan();
        var k4 = field(pt.add(k3.mul(step)));
        if (k4.isNan()) return Vec2.nan();
        var res = k1.mul(step / 6).add(k2.mul(step / 3)).add(k3.mul(step / 3)).add(k4.mul(step / 6));
        return res;
    }
};

fn testDensity(pt: Vec2) f32 {
    _ = pt;
    return 0;
}

fn testField(pt: Vec2) Vec2 {
    _ = pt;
    var res: Vec2 = .{ .x = 1, .y = 1 };
    res.normalize();
    return res;
}

test "generate a flow line" {
    {
        var fgen = try FlowlineGenerator.create(gpall, .{
            .width = 740,
            .height = 525,
            .stepSize = 1,
            .maxLength = 0,
            .minCellSize = 3,
            .maxCellSize = 24,
            .nShades = 12,
            .logGrid = true,
        });
        defer fgen.destroy();

        var fl = try fgen.genFlowline(testField, testDensity);
        _ = fl;
        // std.debug.print("\n\n{d}\n\n", .{fl.fwPoints.len});
    }
}

test "generate all flow lines" {
    {
        var fgen = try FlowlineGenerator.create(gpall, .{
            .width = 740,
            .height = 525,
            .stepSize = 1,
            .maxLength = 0,
            .minCellSize = 3,
            .maxCellSize = 24,
            .nShades = 12,
            .logGrid = true,
        });
        defer fgen.destroy();

        var nLines: u32 = 1;
        const msStart = std.time.milliTimestamp();

        while (true) {
            var fl = try fgen.genFlowline(testField, testDensity);
            if (fl.fwPoints.len == 0)
                break;
            if (fl.fwPoints.len + fl.bkPoints.len >= 3)
                nLines += 1;
        }
        const msElapsed = std.time.milliTimestamp() - msStart;
        _ = msElapsed;
        // std.debug.print("\n\nFlowlines: {d}\n", .{nLines});
        // std.debug.print("Generate msec: {d}\n\n", .{msElapsed});
    }
}
