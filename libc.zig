const std = @import("std");

const allocator = std.heap.wasm_allocator;
const usize_len = @sizeOf(usize);

export fn malloc(size: usize) callconv(.C) *anyopaque {
    // Allocates a block that is a multiple of usize that fits the header and the user allocation.
    const eff_size = 1 + (size + usize_len - 1) / usize_len;
    const block = allocator.alloc(usize, eff_size) catch unreachable;
    // Header stores the length.
    block[0] = eff_size;
    // Return the user allocation.
    return &block[1];
}

export fn realloc(ptr: ?*anyopaque, size: usize) callconv(.C) *anyopaque {
    if (ptr == null) {
        return malloc(size);
    }
    const eff_size = 1 + (size + usize_len - 1) / usize_len;
    const addr = @intFromPtr(ptr.?) - usize_len;
    const block = @as([*]usize, @ptrFromInt(addr));
    const len = block[0];
    const slice: []usize = block[0..len];
    const new_slice = allocator.realloc(slice, eff_size) catch unreachable;
    new_slice[0] = eff_size;
    return @as(*anyopaque, @ptrCast(&new_slice[1]));
}

export fn free(ptr: ?*anyopaque) callconv(.C) void {
    if (ptr == null) {
        return;
    }
    const addr = @intFromPtr(ptr) - usize_len;
    const block = @as([*]const usize, @ptrFromInt(addr));
    const len = block[0];
    allocator.free(block[0..len]);
}

export fn strlen(s: [*c]const u8) usize {
    return std.mem.sliceTo(s, 0).len;
}

export fn strcmp(s1: [*c]const u8, s2: [*c]const u8) c_int {
    return switch (std.mem.orderZ(u8, s1, s2)) {
        .lt => -1,
        .eq => 0,
        .gt => 1,
    };
}

export fn strncmp(_l: [*:0]const u8, _r: [*:0]const u8, _n: usize) callconv(.C) c_int {
    if (_n == 0) return 0;
    var l = _l;
    var r = _r;
    var n = _n - 1;
    while (l[0] != 0 and r[0] != 0 and n != 0 and l[0] == r[0]) {
        l += 1;
        r += 1;
        n -= 1;
    }
    return @as(c_int, l[0]) - @as(c_int, r[0]);
}

export fn strchr(s: [*:0]const u8, ch: u8) callconv(.C) ?[*:0]const u8 {
    if (std.mem.indexOfScalar(u8, std.mem.sliceTo(s, 0), ch)) |idx| {
        return @as([*:0]const u8, @ptrCast(&s[idx]));
    } else return null;
}

const BinarySearchCompare = ?*const fn (?*const anyopaque, ?*const anyopaque) callconv(.C) c_int;

export fn bsearch(
    key: [*c]const u8,
    base: [*c]const u8,
    nmemb: usize,
    size: usize,
    compar: *const fn ([*]const u8, [*]const u8) i2,
) ?[*]const u8 {
    var next_base = base;
    var nel = nmemb;
    while (nel > 0) {
        const t = @as([*]const u8, @ptrCast(next_base)) + size * (nel / 2);
        const s = compar(@as([*]const u8, @ptrCast(key)), t);
        if (s < 0) {
            nel /= 2;
        } else if (s > 0) {
            next_base = t + size;
            nel -= nel / 2 + 1;
        } else {
            return t;
        }
    }
    return null;
}

const QuicksortCompare = fn (left: *u8, right: *u8) callconv(.C) c_int;

export fn qsort(base: [*c]u8, nmemb: usize, size: usize, c_compare: *const QuicksortCompare) void {
    const idxes = allocator.alloc(u32, nmemb) catch unreachable;
    defer allocator.free(idxes);

    const Context = struct {
        buf: []u8,
        c_compare: *const QuicksortCompare,
        size: usize,
    };

    const S = struct {
        fn lessThan(ctx: Context, lhs: u32, rhs: u32) bool {
            return ctx.c_compare(&ctx.buf[lhs * ctx.size], &ctx.buf[rhs * ctx.size]) < 0;
        }
    };
    const ctx = Context{
        .size = size,
        .c_compare = c_compare,
        .buf = base[0 .. nmemb * size],
    };
    for (idxes, 0..) |_, i| {
        idxes[i] = i;
    }
    std.sort.heap(u32, idxes, ctx, S.lessThan);

    // Copy to temporary buffer.
    const temp = allocator.alloc(u8, nmemb * size) catch unreachable;
    defer allocator.free(temp);
    for (idxes, 0..) |idx, i| {
        std.mem.copy(u8, temp[i * size .. i * size + size], ctx.buf[idx * size .. idx * size + size]);
    }
    std.mem.copy(u8, ctx.buf, temp);
}

export const stderr: ?*anyopaque = null;

export fn fprintf(stream: *anyopaque, format: [*c]const u8, ...) c_int {
    _ = format;
    _ = stream;
    unreachable;
}

export fn snprintf(s: [*c]u8, maxlen: usize, format: [*c]const u8, ...) c_int {
    _ = format;
    var ap = @cVaStart();
    defer @cVaEnd(&ap);
    var arg = @cVaArg(&ap, c_int);
    _ = std.fmt.bufPrint(s[0..maxlen], "<ol start=\"{d}\">\n", .{@as(i32, arg)}) catch unreachable;
    return 0;
}
