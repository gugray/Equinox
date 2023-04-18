const std = @import("std");
const math = @import("std").math;
const expect = @import("std").testing.expect;
const Allocator = std.mem.Allocator;
const flg = @import("flg.zig");
const gpall = @import("alloc.zig").gpall;
const utils = @import("utils.zig");
const Vec2 = utils.Vec2;

export fn beep() void {}

test "test with large data" {
    beep();
    std.debug.print("Hello, sailor.\n", .{});
    try expect(false);
}
