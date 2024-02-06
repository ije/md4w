const std = @import("std");
const c = @cImport({
    @cInclude("md4c.h");
});

const allocator = std.heap.wasm_allocator;

const Writer = struct {
    buf: []u8 = undefined,
    len: usize = 0,
    image_nesting_level: usize = 0,
    pub fn init(buffer_size: usize) Writer {
        return Writer{ .buf = allocator.alloc(u8, buffer_size) catch unreachable };
    }
    pub fn deinit(self: *Writer) void {
        allocator.free(self.buf);
    }
    pub fn writeByte(self: *Writer, byte: u8) void {
        if (self.len == self.buf.len) {
            push(toJS(self.buf[0..self.len]));
            self.len = 0;
        }
        self.buf[self.len] = byte;
        self.len += 1;
    }
    pub fn write(self: *Writer, chunk: []const u8) void {
        if (chunk.len >= self.buf.len) {
            push(toJS(chunk));
            return;
        }
        var new_len = self.len + chunk.len;
        if (new_len > self.buf.len) {
            push(toJS(self.buf[0..self.len]));
            self.len = 0;
            new_len = chunk.len;
        }
        std.mem.copy(u8, self.buf[self.len..], chunk);
        self.len = new_len;
    }
    pub fn writeEscaped(self: *Writer, chunk: []const u8) void {
        var start: usize = 0;
        while (true) {
            var i = start;
            while (i < chunk.len) {
                const ch = chunk[i];
                if (ch == '<' or ch == '>' or ch == '&' or ch == '"') {
                    break;
                }
                i += 1;
            }
            self.write(chunk[start..i]);
            if (i == chunk.len) {
                break;
            }
            self.writeEscapedChar(chunk[i]);
            start = i + 1;
        }
    }
    pub fn writeEscapedChar(self: *Writer, ch: u8) void {
        switch (ch) {
            '<' => self.write("&lt;"),
            '>' => self.write("&gt;"),
            '&' => self.write("&amp;"),
            '"' => self.write("&quot;"),
            else => self.writeByte(ch),
        }
    }
};

const Parser = struct {
    pub fn enter_block(
        typ: c.MD_BLOCKTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));
        switch (typ) {
            c.MD_BLOCK_DOC => {
                // skip
            },
            c.MD_BLOCK_QUOTE => w.write("<blockquote>\n"),
            c.MD_BLOCK_UL => w.write("<ul>\n"),
            c.MD_BLOCK_OL => {
                const ol: *c.MD_BLOCK_OL_DETAIL = @ptrCast(@alignCast(detail));
                if (ol.start > 1) {
                    w.write("<ol start=\"");
                    w.writeByte('0' + @as(u8, @intCast(ol.start)));
                    w.write("\">\n");
                } else {
                    w.write("<ol>\n");
                }
            },
            c.MD_BLOCK_LI => {
                const li: *c.MD_BLOCK_LI_DETAIL = @ptrCast(@alignCast(detail));
                if (li.is_task > 0) {
                    w.write("<li class=\"task-list-item\"><input type=\"checkbox\" class=\"task-list-item-checkbox\"");
                    if (li.task_mark == 'x' or li.task_mark == 'X') {
                        w.write(" checked");
                    }
                    w.write(" disabled>");
                } else {
                    w.write("<li>");
                }
            },
            c.MD_BLOCK_HR => w.write("<hr>\n"),
            c.MD_BLOCK_H => {
                const h: *c.MD_BLOCK_H_DETAIL = @ptrCast(@alignCast(detail));
                w.write("<h");
                w.writeByte('0' + @as(u8, @intCast(h.level)));
                w.writeByte('>');
            },
            c.MD_BLOCK_CODE => {
                const code: *c.MD_BLOCK_CODE_DETAIL = @ptrCast(@alignCast(detail));
                w.write("<pre><code");
                if (code.lang.size > 0) {
                    w.write(" class=\"language-");
                    w.write(@as([*]const u8, @ptrCast(code.lang.text))[0..code.lang.size]);
                    w.writeByte('"');
                }
                w.writeByte('>');
            },
            c.MD_BLOCK_HTML => {
                // skip
            },
            c.MD_BLOCK_P => w.write("<p>"),
            c.MD_BLOCK_TABLE => w.write("<table>\n"),
            c.MD_BLOCK_THEAD => w.write("<thead>\n"),
            c.MD_BLOCK_TBODY => w.write("<tbody>\n"),
            c.MD_BLOCK_TR => w.write("<tr>\n"),
            c.MD_BLOCK_TH, c.MD_BLOCK_TD => {
                const td: *c.MD_BLOCK_TD_DETAIL = @ptrCast(@alignCast(detail));
                if (typ == c.MD_BLOCK_TH) {
                    w.write("<th");
                } else {
                    w.write("<td");
                }
                switch (td.@"align") {
                    c.MD_ALIGN_LEFT => w.write(" align=\"left\">"),
                    c.MD_ALIGN_CENTER => w.write(" align=\"center\">"),
                    c.MD_ALIGN_RIGHT => w.write(" align=\"right\">"),
                    else => w.writeByte('>'),
                }
            },
            else => {},
        }
        return 0;
    }

    pub fn leave_block(
        typ: c.MD_BLOCKTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));
        switch (typ) {
            c.MD_BLOCK_DOC => {
                // skip
            },
            c.MD_BLOCK_QUOTE => w.write("</blockquote>\n"),
            c.MD_BLOCK_UL => w.write("</ul>\n"),
            c.MD_BLOCK_OL => w.write("</ol>\n"),
            c.MD_BLOCK_LI => w.write("</li>\n"),
            c.MD_BLOCK_HR => {
                // skip
            },
            c.MD_BLOCK_H => {
                const h: *c.MD_BLOCK_H_DETAIL = @ptrCast(@alignCast(detail));
                w.write("</h");
                w.writeByte('0' + @as(u8, @intCast(h.level)));
                w.write(">\n");
            },
            c.MD_BLOCK_CODE => w.write("</code></pre>\n"),
            c.MD_BLOCK_HTML => {
                // skip
            },
            c.MD_BLOCK_P => w.write("</p>\n"),
            c.MD_BLOCK_TABLE => w.write("</table>\n"),
            c.MD_BLOCK_THEAD => w.write("</thead>\n"),
            c.MD_BLOCK_TBODY => w.write("</tbody>\n"),
            c.MD_BLOCK_TR => w.write("</tr>\n"),
            c.MD_BLOCK_TH => w.write("</th>\n"),
            c.MD_BLOCK_TD => w.write("</td>\n"),
            else => {},
        }
        return 0;
    }

    pub fn enter_span(
        typ: c.MD_SPANTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        _ = userdata;
        _ = detail;
        _ = typ;
        return 0;
    }

    pub fn leave_span(
        typ: c.MD_SPANTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        _ = userdata;
        _ = detail;
        _ = typ;
        return 0;
    }

    pub fn text(
        typ: c.MD_TEXTTYPE,
        ptr: [*c]const c.MD_CHAR,
        len: c.MD_SIZE,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));
        switch (typ) {
            c.MD_TEXT_NULLCHAR => w.write(&[1]u8{0}),
            c.MD_TEXT_BR => w.write(if (w.image_nesting_level == 0) "<br>\n" else ""),
            c.MD_TEXT_SOFTBR => w.write(if (w.image_nesting_level == 0) "\n" else ""),
            // currently we don't translate entity to its UTF-8 equivalent
            c.MD_TEXT_ENTITY, c.MD_TEXT_HTML => w.write(@as([*]const u8, @ptrCast(ptr))[0..len]),
            c.MD_TEXT_NORMAL, c.MD_TEXT_CODE, c.MD_TEXT_LATEXMATH => {
                w.writeEscaped(@as([*]const u8, @ptrCast(ptr))[0..len]);
            },
            else => {},
        }
        return 0;
    }
};

export fn allocMem(length: u32) u64 {
    return @as(u64, @bitCast([2]u32{
        @intFromPtr((allocator.alloc(u8, length) catch unreachable).ptr),
        length,
    }));
}

export fn freeMem(ptr_len: u64) void {
    allocator.free(fromJS(ptr_len));
}

export fn mdToHtml(ptr_len: u64, flags: usize, buffer_size: usize) usize {
    const md = fromJS(ptr_len);
    defer allocator.free(md);

    const parser = c.MD_PARSER{
        .abi_version = 0,
        .flags = flags,
        .enter_block = Parser.enter_block,
        .leave_block = Parser.leave_block,
        .enter_span = Parser.enter_span,
        .leave_span = Parser.leave_span,
        .text = Parser.text,
        .debug_log = null,
        .syntax = null,
    };

    var writer = Writer.init(buffer_size);
    defer writer.deinit();

    _ = c.md_parse(
        md.ptr,
        @intCast(md.len),
        &parser,
        @ptrFromInt(@intFromPtr(&writer)),
    );

    // flush remaining buffer
    push(toJS(writer.buf[0..writer.len]));

    return 0;
}

fn fromJS(ptr_len: u64) []const u8 {
    const s = @as([2]u32, @bitCast(ptr_len));
    return @as([*]u8, @ptrFromInt(s[0]))[0..s[1]];
}

fn toJS(data: []const u8) u64 {
    return @as(u64, @bitCast([2]u32{
        @as(u32, @intFromPtr(data.ptr)),
        data.len,
    }));
}

// add libc compatibility layer for wasm target
usingnamespace @import("libc.zig");

// push the buffer to the host
pub extern fn push(ptr_len: u64) void;
