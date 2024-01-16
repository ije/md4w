// polyfill libc for wasm target
usingnamespace @import("libc.zig");

const std = @import("std");
const c = @cImport({
    @cInclude("md4c-html.h");
});

const allocator = std.heap.wasm_allocator;

const Writer = struct {
    buf: []u8 = undefined,
    len: usize = 0,
    pub fn write(self: *Writer, chunk: []const u8) !void {
        const new_len = self.len + chunk.len;
        if (new_len > self.buf.len) {
            const new_cap = @max(new_len, self.buf.len * 2);
            self.buf = allocator.realloc(self.buf, new_cap) catch unreachable;
        }
        std.mem.copy(u8, self.buf[self.len..], chunk);
        self.len = new_len;
    }
};

fn fromJS(ptrLen: u64) []const u8 {
    const s = @as([2]u32, @bitCast(ptrLen));
    return @as([*]u8, @ptrFromInt(s[0]))[0..s[1]];
}

fn toJS(data: []const u8) u64 {
    return @as(u64, @bitCast([2]u32{
        @as(u32, @intFromPtr(data.ptr)),
        data.len,
    }));
}

export fn allocMem(length: u32) u64 {
    return @as(u64, @bitCast([2]u32{
        @intFromPtr((allocator.alloc(u8, length) catch unreachable).ptr),
        length,
    }));
}

export fn freeMem(ptrLen: u64) void {
    allocator.free(fromJS(ptrLen));
}

export fn mdToHtml(ptrLen: u64) u64 {
    const code = fromJS(ptrLen);
    defer allocator.free(code);

    const renderer = struct {
        fn render(
            ptr: [*c]const c.MD_CHAR,
            len: c.MD_SIZE,
            userdata: ?*anyopaque,
        ) callconv(.C) void {
            const w: *Writer = @ptrCast(@alignCast(userdata));
            const str = @as([*]const u8, @ptrCast(ptr))[0..len];
            w.write(str) catch {};
        }
    };

    var writer = Writer{};
    _ = c.md_html(
        code.ptr,
        @intCast(code.len),
        renderer.render,
        @ptrFromInt(@intFromPtr(&writer)),
        0,
        0,
    );

    return toJS(writer.buf[0..writer.len]);
}
