const std = @import("std");

const allocator = std.heap.wasm_allocator;

/// Since this is often 16 for the new operator in C++, malloc should also mimic that.
const DefaultMallocAlignment = 16;
const PointerSize = @sizeOf(*anyopaque);
const BlocksPerAlignment = DefaultMallocAlignment / PointerSize;

export fn malloc(size: usize) callconv(.C) *anyopaque {
    // Allocates blocks of PointerSize sized items that fits the header and the user memory using the default alignment.
    const blocks = (1 + (size + DefaultMallocAlignment - 1) / DefaultMallocAlignment) * BlocksPerAlignment;
    const buf = allocator.alignedAlloc(usize, DefaultMallocAlignment, blocks) catch @panic("malloc: out of memory");
    // Header stores the length.
    buf[0] = blocks;
    // Return the user pointer.
    return &buf[BlocksPerAlignment];
}

export fn realloc(ptr: ?*anyopaque, size: usize) callconv(.C) *anyopaque {
    if (ptr == null) {
        return malloc(size);
    }

    // Get current block size and slice.
    const addr = @intFromPtr(ptr.?) - DefaultMallocAlignment;
    const block = @as([*]usize, @ptrFromInt(addr));
    const len = block[0];
    const slice: []usize = block[0..len];

    // Reallocate.
    const blocks = (1 + (size + DefaultMallocAlignment - 1) / DefaultMallocAlignment) * BlocksPerAlignment;
    const new_slice = allocator.reallocAdvanced(slice, DefaultMallocAlignment, blocks) catch @panic("realloc: out of memory");
    new_slice[0] = blocks;
    return @as(*anyopaque, @ptrCast(&new_slice[BlocksPerAlignment]));
}

export fn free(ptr: ?*anyopaque) callconv(.C) void {
    if (ptr != null) {
        const addr = @intFromPtr(ptr) - DefaultMallocAlignment;
        const block = @as([*]const usize, @ptrFromInt(addr));
        const len = block[0];
        allocator.free(block[0..len]);
    }
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

export fn bsearch(key: ?*const anyopaque, base: ?*const anyopaque, nmemb: usize, size: usize, compar: BinarySearchCompare) callconv(.C) ?*anyopaque {
    var l: usize = undefined;
    var u: usize = undefined;
    var idx: usize = undefined;
    var p: ?*const anyopaque = undefined;
    var comparison: c_int = undefined;
    l = @as(usize, @bitCast(@as(c_long, @as(c_int, 0))));
    u = nmemb;
    while (l < u) {
        idx = ((l +% u) / @as(c_ulong, @bitCast(@as(c_long, @as(c_int, 2)))));
        p = @as(?*anyopaque, @ptrFromInt(@intFromPtr(((@as([*c]const u8, @ptrCast(@alignCast(base)))) + (idx *% size)))));
        comparison = (compar).?(key, p);
        if (comparison < @as(c_int, 0)) u = idx else if (comparison > @as(c_int, 0)) l = (idx +% @as(c_ulong, @bitCast(@as(c_long, @as(c_int, 1))))) else return @as(?*anyopaque, @ptrFromInt(@intFromPtr(p)));
    }
    return (@as(?*anyopaque, @ptrFromInt(@as(c_int, 0))));
}

const QuicksortCompare = fn (left: *u8, right: *u8) callconv(.C) c_int;

export fn qsort(base: [*c]u8, nmemb: usize, size: usize, c_compare: *const QuicksortCompare) void {
    const idxes = allocator.alloc(u32, nmemb) catch @panic("libc::qsort: out of memory");
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
    const temp = allocator.alloc(u8, nmemb * size) catch @panic("libc::qsort: out of memory");
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

export fn snprintf(s: [*c]u8, maxlen: c_ulong, format: [*c]const u8, ...) c_int {
    _ = format;
    _ = maxlen;
    _ = s;
    unreachable;
}
