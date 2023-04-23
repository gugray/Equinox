const std = @import("std");
const math = @import("std").math;
const expect = @import("std").testing.expect;
const gpall = @import("alloc.zig").gpall;
const Random = std.rand.Random;
const ArrayList = std.ArrayList;

pub const Vec2 = struct {
    x: f32 = 0,
    y: f32 = 0,

    pub fn len(self: *Vec2) f32 {
        return math.sqrt(self.x * self.x + self.y * self.y);
    }

    pub fn add(self: *const Vec2, rhs: Vec2) Vec2 {
        return .{ .x = self.x + rhs.x, .y = self.y + rhs.y };
    }

    pub fn sub(self: *const Vec2, rhs: Vec2) Vec2 {
        return .{ .x = self.x - rhs.x, .y = self.y - rhs.y };
    }

    pub fn mul(self: *const Vec2, scalar: f32) Vec2 {
        return .{ .x = self.x * scalar, .y = self.y * scalar };
    }

    pub fn normalize(self: *Vec2) void {
        const l = self.len();
        self.x /= l;
        self.y /= l;
    }

    pub fn isNan(self: *const Vec2) bool {
        return math.isNan(self.x) or math.isNan(self.y);
    }

    pub fn nan() Vec2 {
        return .{ .x = math.nan(f32), .y = math.nan(f32) };
    }
};

test "Vec2 returns its length" {
    var v: Vec2 = .{ .x = 3, .y = 4 };
    var l = v.len();
    try expect(l == 5);
}

pub const FieldVal = struct {
    dir: Vec2,
    dist: f32,
};

pub var prng: std.rand.DefaultPrng = std.rand.DefaultPrng.init(0);
pub var rand = prng.random();

pub fn seedPRNG(seed: u64) void {
    prng = std.rand.DefaultPrng.init(seed);
    rand = prng.random();
}

pub fn shuffle(arr: []u32) void {
    var i: u32 = @intCast(u32, arr.len);
    while (i > 1) : (i -= 1) {
        var p = @intCast(u64, rand.int(u32));
        p = p * i;
        p = p >> 32;
        const tmp = arr[i - 1];
        arr[i - 1] = arr[@intCast(usize, p)];
        arr[@intCast(usize, p)] = tmp;
    }
}

test "shuffle stuff" {
    var aSmall = try gpall.alloc(u32, 3);
    var i: u32 = 0;
    while (i < aSmall.len) : (i += 1) {
        aSmall[i] = i;
    }
    shuffle(aSmall);
    //std.debug.print("\n\n{d} {d} {d}\n\n", .{ aSmall[0], aSmall[1], aSmall[2] });

    // const sz = 10_000_000;
    const sz = 97125; // 740 * 525 / 4
    var aLarge = try gpall.alloc(u32, sz);
    i = 0;
    while (i < aLarge.len) : (i += 1) {
        aLarge[i] = i;
    }
    const msStart = std.time.milliTimestamp();
    shuffle(aLarge);
    const msElapsed = std.time.milliTimestamp() - msStart;
    _ = msElapsed;
    // std.debug.print("\n\nSuffle msec: {d}\n\n", .{msElapsed});
}

// test "ArrayList behavior" {
//     var al = ArrayList(Vec2).init(gpall);
//     std.debug.print("\n\n{d}\n", .{al.capacity});
//     var i: u32 = 0;
//     while (i < 90) : (i += 1) {
//         try al.append(.{ .x = 1, .y = 2 });
//     }
//     std.debug.print("{d}\n", .{al.capacity});
//     al.clearRetainingCapacity();
//     std.debug.print("{d}\n", .{al.capacity});
//     std.debug.print("\n\n", .{});
// }
