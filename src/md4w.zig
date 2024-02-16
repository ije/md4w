const std = @import("std");
const c = @cImport({
    @cInclude("md4c.h");
});

const allocator = std.heap.wasm_allocator;

/// slugCharMap is a map of ASCII characters to their corresponding slug character.
/// copied from https://github.com/rsms/markdown-wasm/blob/0d99d1151ff4d929a8ac8f3a191bfec54a10a869/src/fmt_html.c#L120C1-L138C3
const slugCharMap = [256]u8{
    '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', // <CTRL> ...
    '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', // <CTRL> ...
    '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '.', '-', //   ! " # $ % & ' ( ) * + , - . /
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '-', '-', '-', '-', '-', // 0 1 2 3 4 5 6 7 8 9 : ; < = > ?
    '-', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', // @ A B C D E F G H I J K L M N O
    'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '-', '-', '-', '-', '_', // P Q R S T U V W X Y Z [ \ ] ^ _
    '-', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', // ` a b c d e f g h i j k l m n o
    'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '-', '-', '-', '-', '-', // p q r s t u v w x y z { | } ~ <DEL>
    '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', // <CTRL> ...
    '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', // <CTRL> ...
    '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', // <NBSP> ¡ ¢ £ ¤ ¥ ¦ § ¨ © ª « ¬ <SOFTHYPEN> ® ¯
    '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', // ° ± ² ³ ´ µ ¶ · ¸ ¹ º » ¼ ½ ¾ ¿
    'a', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'e', 'e', 'e', 'e', 'i', 'i', 'i', 'i', // À Á Â Ã Ä Å Æ Ç È É Ê Ë Ì Í Î Ï
    'd', 'n', 'o', 'o', 'o', 'o', 'o', 'x', 'o', 'u', 'u', 'u', 'u', 'y', '-', 's', // Ð Ñ Ò Ó Ô Õ Ö × Ø Ù Ú Û Ü Ý Þ ß
    'a', 'a', 'a', 'a', 'a', 'a', 'a', 'c', 'e', 'e', 'e', 'e', 'i', 'i', 'i', 'i', // à á â ã ä å æ ç è é ê ë ì í î ï
    'd', 'n', 'o', 'o', 'o', 'o', 'o', '-', 'o', 'u', 'u', 'u', 'u', 'y', '-', 'y', // ð ñ ò ó ô õ ö ÷ ø ù ú û ü ý þ ÿ
};

/// The writer handles the output of the md4c parser
const Writer = struct {
    buf: []u8 = undefined,
    len: usize = 0,
    slug: []u8 = undefined,
    slug_len: usize = 0,
    current_block: c.MD_BLOCKTYPE = 0,
    current_span: c.MD_SPANTYPE = 100,
    has_block_children: bool = false,
    has_span_children: bool = false,
    image_nesting_level: usize = 0,
    has_code_highlighter: bool = undefined,
    pub fn init(buffer_size: usize, has_code_highlighter: bool) Writer {
        return Writer{
            .buf = allocator.alloc(u8, buffer_size) catch unreachable,
            .slug = allocator.alloc(u8, 512) catch unreachable,
            .has_code_highlighter = has_code_highlighter,
        };
    }
    pub fn deinit(self: *Writer) void {
        allocator.free(self.buf);
        allocator.free(self.slug);
    }
    pub fn writeByte(self: *Writer, byte: u8) void {
        if (self.len >= self.buf.len) {
            push(toJS(self.buf[0..self.buf.len]));
            self.len = 0;
        }
        self.buf[self.len] = byte;
        self.len += 1;
    }
    pub fn write(self: *Writer, chunk: []const u8) void {
        if (chunk.len >= self.buf.len) {
            if (self.len > 0) {
                push(toJS(self.buf[0..self.len]));
                self.len = 0;
            }
            push(toJS(chunk));
            return;
        }
        if (self.len + chunk.len > self.buf.len) {
            push(toJS(self.buf[0..self.len]));
            self.len = 0;
        }
        std.mem.copy(u8, self.buf[self.len..], chunk);
        self.len += chunk.len;
    }
    pub fn safeWrite(self: *Writer, chunk: []const u8) void {
        var start: usize = 0;
        while (true) {
            var i = start;
            loop: while (i < chunk.len) {
                switch (chunk[i]) {
                    '<', '>', '&', '"' => break :loop,
                    else => i += 1,
                }
            }
            self.write(chunk[start..i]);
            if (i == chunk.len) {
                break;
            }
            switch (chunk[i]) {
                '<' => self.write("&lt;"),
                '>' => self.write("&gt;"),
                '&' => self.write("&amp;"),
                '"' => self.write("&quot;"),
                else => {},
            }
            start = i + 1;
        }
    }
    pub fn safeWriteUrl(self: *Writer, input: []const u8) void {
        for (input) |ch| switch (ch) {
            'A'...'Z', 'a'...'z', '0'...'9', '_', '$', '@', ':', '+', '-', '*', '/', '.', ',', ';', '~', '=', '?', '!', '#', '&', '%', '(', ')' => self.writeByte(ch),
            else => {
                var buf: [2]u8 = undefined;
                _ = std.fmt.bufPrint(&buf, "{X:0>2}", .{ch}) catch unreachable;
                self.writeByte('%');
                self.writeByte(buf[0]);
                self.writeByte(buf[1]);
            },
        };
    }
    pub fn updateSlug(self: *Writer, ch: u8) void {
        // skip if the last character is already a hyphen
        if (ch == '-' and (self.slug_len == 0 or self.slug[self.slug_len - 1] == '-')) {
            return;
        }
        if (self.slug_len < self.slug.len) {
            self.slug[self.slug_len] = ch;
            self.slug_len += 1;
        }
    }
    pub fn getSlug(self: *Writer) []const u8 {
        // strip trailing hyphen
        if (self.slug_len > 0 and self.slug[self.slug_len - 1] == '-') {
            return self.slug[0 .. self.slug_len - 1];
        }
        return self.slug[0..self.slug_len];
    }
    pub fn writeJSONType(self: *Writer, typ: c.MD_BLOCKTYPE) void {
        self.write("{\"type\":");
        var buffer: [3]u8 = undefined;
        const buf = buffer[0..];
        self.write(std.fmt.bufPrintIntToSlice(buf, @as(u8, @intCast(typ)), 10, .lower, .{}));
    }
    pub fn writeJSONChildren(self: *Writer) void {
        self.write(",\"children\":[");
    }
    pub fn writeJSONTypeAndChildren(self: *Writer, typ: c.MD_BLOCKTYPE) void {
        self.writeJSONType(typ);
        self.writeJSONChildren();
    }
    pub fn writeJSONProps(self: *Writer) void {
        self.write(",\"props\":{");
    }
    pub fn safeWriteJSONString(self: *Writer, input: []const u8) void {
        for (input) |ch| {
            if (ch == '"') {
                self.writeByte('\\');
            }
            self.writeByte(ch);
        }
    }
};

/// Render markdown to html
const HTMLRenderer = struct {
    pub fn enterBlock(
        typ: c.MD_BLOCKTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));
        w.current_block = typ;

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
                if (code.lang.size > 0) {
                    const lang = @as([*]const u8, @ptrCast(code.lang.text))[0..code.lang.size];
                    std.mem.copy(u8, w.slug[0..], lang);
                    w.slug_len = lang.len;
                }
                if (!w.has_code_highlighter or w.slug_len == 0) {
                    w.write("<pre><code");
                    if (w.slug_len > 0) {
                        w.write(" class=\"language-");
                        w.safeWrite(w.slug[0..w.slug_len]);
                        w.writeByte('"');
                    }
                    w.writeByte('>');
                }
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

    pub fn leaveBlock(
        typ: c.MD_BLOCKTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));
        defer w.current_block = 0;
        defer w.slug_len = 0;

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
                const slug = w.getSlug();
                w.write(" <a class=\"anchor\" aria-hidden=\"true\" id=\"");
                w.safeWriteUrl(slug);
                w.write("\" href=\"#");
                w.safeWriteUrl(slug);
                w.write("\"></a></h");
                w.writeByte('0' + @as(u8, @intCast(h.level)));
                w.write(">\n");
            },
            c.MD_BLOCK_CODE => if (!w.has_code_highlighter or w.slug_len == 0) w.write("</code></pre>\n"),
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

    pub fn enterSpan(
        typ: c.MD_SPANTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));
        const inside_img = w.image_nesting_level > 0;

        if (typ == c.MD_SPAN_IMG)
            w.image_nesting_level += 1;
        if (inside_img)
            return 0;

        switch (typ) {
            c.MD_SPAN_EM => w.write("<em>"),
            c.MD_SPAN_STRONG => w.write("<strong>"),
            c.MD_SPAN_A => {
                const a: *c.MD_SPAN_A_DETAIL = @ptrCast(@alignCast(detail));
                w.write("<a href=\"");
                w.safeWriteUrl(@as([*]const u8, @ptrCast(a.href.text))[0..a.href.size]);
                if (a.title.size > 0) {
                    w.write("\" title=\"");
                    w.safeWrite(@as([*]const u8, @ptrCast(a.title.text))[0..a.title.size]);
                }
                w.write("\">");
            },
            c.MD_SPAN_IMG => {
                const img: *c.MD_SPAN_IMG_DETAIL = @ptrCast(@alignCast(detail));
                w.write("<img src=\"");
                w.safeWriteUrl(@as([*]const u8, @ptrCast(img.src.text))[0..img.src.size]);
                w.write("\" alt=\""); // empty alt attribute
            },
            c.MD_SPAN_CODE => w.write("<code>"),
            c.MD_SPAN_DEL => w.write("<del>"),
            c.MD_SPAN_LATEXMATH => w.write("<x-equation>"),
            c.MD_SPAN_LATEXMATH_DISPLAY => w.write("<x-equation type=\"display\">"),
            c.MD_SPAN_WIKILINK => {
                const wikilink: *c.MD_SPAN_WIKILINK_DETAIL = @ptrCast(@alignCast(detail));
                w.write("<x-wikilink data-target=\"");
                w.safeWrite(@as([*]const u8, @ptrCast(wikilink.target.text))[0..wikilink.target.size]);
                w.write("\">");
            },
            c.MD_SPAN_U => w.write("<u>"),
            else => {},
        }

        return 0;
    }

    pub fn leaveSpan(
        typ: c.MD_SPANTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));

        if (typ == c.MD_SPAN_IMG)
            w.image_nesting_level -= 1;
        if (w.image_nesting_level > 0)
            return 0;
        _ = detail;

        switch (typ) {
            c.MD_SPAN_EM => w.write("</em>"),
            c.MD_SPAN_STRONG => w.write("</strong>"),
            c.MD_SPAN_A => w.write("</a>"),
            c.MD_SPAN_IMG => w.writeByte('>'),
            c.MD_SPAN_CODE => w.write("</code>"),
            c.MD_SPAN_DEL => w.write("</del>"),
            c.MD_SPAN_LATEXMATH, c.MD_SPAN_LATEXMATH_DISPLAY => w.write("</x-equation>"),
            c.MD_SPAN_WIKILINK => w.write("</x-wikilink>"),
            c.MD_SPAN_U => w.write("</u>"),
            else => {},
        }

        return 0;
    }

    pub fn text(
        typ: c.MD_TEXTTYPE,
        ptr: [*c]const c.MD_CHAR,
        len: c.MD_SIZE,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));

        if (w.current_block == c.MD_BLOCK_H and typ == c.MD_TEXT_NORMAL) {
            var i: usize = 0;
            while (i < len) {
                const textContent = @as([*]const u8, @ptrCast(ptr));
                const ch = textContent[i];
                const code_point_len: u3 = switch (ch) {
                    0b0000_0000...0b0111_1111 => 1,
                    0b1100_0000...0b1101_1111 => 2,
                    0b1110_0000...0b1110_1111 => 3,
                    0b1111_0000...0b1111_0111 => 4,
                    else => unreachable,
                };
                if (code_point_len == 1) {
                    w.updateSlug(slugCharMap[ch]);
                } else {
                    // we keep the original character for non-ASCII characters
                    for (textContent[i .. i + code_point_len]) |code| {
                        w.updateSlug(code);
                    }
                }
                i += code_point_len;
            }
        }

        switch (typ) {
            c.MD_TEXT_NULLCHAR => w.writeByte(0),
            c.MD_TEXT_BR => w.write(if (w.image_nesting_level == 0) "<br>\n" else " "),
            c.MD_TEXT_SOFTBR => w.writeByte(if (w.image_nesting_level == 0) '\n' else ' '),
            // currently we don't translate entity to its UTF-8 equivalent
            c.MD_TEXT_ENTITY, c.MD_TEXT_HTML => w.write(@as([*]const u8, @ptrCast(ptr))[0..len]),
            c.MD_TEXT_CODE => {
                const code = @as([*]const u8, @ptrCast(ptr))[0..len];
                if (w.has_code_highlighter and w.slug_len > 0 and w.current_block == c.MD_BLOCK_CODE) {
                    // flush the buffer if not empty
                    if (w.len > 0) {
                        push(toJS(w.buf[0..w.len]));
                        w.len = 0;
                    }
                    pushCodeBlock(toJS(w.slug[0..w.slug_len]), toJS(code));
                } else {
                    w.safeWrite(code);
                }
            },
            c.MD_TEXT_NORMAL, c.MD_TEXT_LATEXMATH => {
                w.safeWrite(@as([*]const u8, @ptrCast(ptr))[0..len]);
            },
            else => {},
        }

        return 0;
    }
};

/// Render markdown to JSON
const JOSNRenderer = struct {
    pub fn enterBlock(
        typ: c.MD_BLOCKTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));

        // skip the document block
        if (typ == c.MD_BLOCK_DOC or typ == c.MD_BLOCK_HTML) {
            return 0;
        }

        if (w.current_block > 0) w.writeByte(',');
        w.current_block = typ;

        switch (typ) {
            c.MD_BLOCK_OL => {
                const ol: *c.MD_BLOCK_OL_DETAIL = @ptrCast(@alignCast(detail));
                w.writeJSONType(typ);
                if (ol.start > 1) {
                    w.writeJSONProps();
                    w.write("\"start\":");
                    w.writeByte('0' + @as(u8, @intCast(ol.start)));
                    w.write("}");
                }
                w.writeJSONChildren();
            },
            c.MD_BLOCK_LI => {
                const li: *c.MD_BLOCK_LI_DETAIL = @ptrCast(@alignCast(detail));
                w.writeJSONType(typ);
                if (li.is_task > 0) {
                    w.writeJSONProps();
                    w.write("\"isTask\":true,\"done\":");
                    w.write(if (li.task_mark == 'x' or li.task_mark == 'X') "true" else "false");
                    w.write("}");
                }
                w.writeJSONChildren();
            },
            c.MD_BLOCK_HR => w.write("{\"type\":5}"),
            c.MD_BLOCK_H => {
                const h: *c.MD_BLOCK_H_DETAIL = @ptrCast(@alignCast(detail));
                w.writeJSONTypeAndChildren(20 + h.level);
            },
            c.MD_BLOCK_CODE => {
                const code: *c.MD_BLOCK_CODE_DETAIL = @ptrCast(@alignCast(detail));
                w.writeJSONType(typ);
                if (code.lang.size > 0) {
                    w.writeJSONProps();
                    w.write("\"lang\":\"");
                    w.safeWriteJSONString(@as([*]const u8, @ptrCast(code.lang.text))[0..code.lang.size]);
                    w.write("\"}");
                }
                w.writeJSONChildren();
            },
            c.MD_BLOCK_TH, c.MD_BLOCK_TD => {
                const td: *c.MD_BLOCK_TD_DETAIL = @ptrCast(@alignCast(detail));
                w.writeJSONType(typ);
                w.writeJSONProps();
                w.write("\"align\":\"");
                switch (td.@"align") {
                    c.MD_ALIGN_LEFT => w.write("left"),
                    c.MD_ALIGN_CENTER => w.write("center"),
                    c.MD_ALIGN_RIGHT => w.write("right"),
                    else => {},
                }
                w.write("\"}");
                w.writeJSONChildren();
            },
            else => w.writeJSONTypeAndChildren(typ),
        }

        return 0;
    }

    pub fn leaveBlock(
        typ: c.MD_BLOCKTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));
        _ = detail;

        // skip the document block
        if (typ == c.MD_BLOCK_DOC or typ == c.MD_BLOCK_HTML) {
            return 0;
        }

        w.has_block_children = false;
        w.write("]}");

        return 0;
    }

    pub fn enterSpan(
        typ: c.MD_SPANTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));
        const inside_img = w.image_nesting_level > 0;

        if (typ == c.MD_SPAN_IMG)
            w.image_nesting_level += 1;
        if (inside_img)
            return 0;

        if (w.has_block_children) w.writeByte(',');
        w.current_span = typ;
        w.has_block_children = true;
        w.has_span_children = false;

        switch (typ) {
            c.MD_SPAN_A => {
                const a: *c.MD_SPAN_A_DETAIL = @ptrCast(@alignCast(detail));
                w.writeJSONType(100 + typ);
                w.writeJSONProps();
                w.write("\"href\":\"");
                w.safeWriteJSONString(@as([*]const u8, @ptrCast(a.href.text))[0..a.href.size]);
                if (a.title.size > 0) {
                    w.write("\",\"title\":");
                    w.safeWriteJSONString(@as([*]const u8, @ptrCast(a.title.text))[0..a.title.size]);
                }
                w.write("\"}");
                w.writeJSONChildren();
            },
            c.MD_SPAN_IMG => {
                const img: *c.MD_SPAN_IMG_DETAIL = @ptrCast(@alignCast(detail));
                w.writeJSONType(100 + typ);
                w.writeJSONProps();
                w.write("\"src\":\"");
                w.safeWriteJSONString(@as([*]const u8, @ptrCast(img.src.text))[0..img.src.size]);
                w.write("\"}");
                w.writeJSONChildren();
            },
            c.MD_SPAN_WIKILINK => {
                const wikilink: *c.MD_SPAN_WIKILINK_DETAIL = @ptrCast(@alignCast(detail));
                w.writeJSONType(100 + typ);
                w.writeJSONProps();
                w.write("\"target\":\"");
                w.safeWrite(@as([*]const u8, @ptrCast(wikilink.target.text))[0..wikilink.target.size]);
                w.write("\"}");
                w.writeJSONChildren();
            },
            else => w.writeJSONTypeAndChildren(100 + typ),
        }

        return 0;
    }

    pub fn leaveSpan(
        typ: c.MD_SPANTYPE,
        detail: ?*anyopaque,
        userdata: ?*anyopaque,
    ) callconv(.C) c_int {
        const w: *Writer = @ptrCast(@alignCast(userdata));
        _ = detail;

        if (typ == c.MD_SPAN_IMG)
            w.image_nesting_level -= 1;
        if (w.image_nesting_level > 0)
            return 0;

        w.current_span = 100;
        w.write("]}");

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
            c.MD_TEXT_NULLCHAR, c.MD_TEXT_BR, c.MD_TEXT_SOFTBR => {
                // skip
            },
            else => {
                if (w.current_span != 100) {
                    if (w.has_span_children) w.writeByte(',');
                    w.has_span_children = true;
                } else {
                    if (w.has_block_children) w.writeByte(',');
                    w.has_block_children = true;
                }
                const text_content = @as([*]const u8, @ptrCast(ptr))[0..len];
                w.writeByte('"');
                w.safeWriteJSONString(text_content);
                w.writeByte('"');
            },
        }

        return 0;
    }
};

/// allow the host to allocate memory
export fn allocMem(length: u32) u64 {
    return @as(u64, @bitCast([2]u32{
        @intFromPtr((allocator.alloc(u8, length) catch unreachable).ptr),
        length,
    }));
}

/// allow the host to free memory
export fn freeMem(ptr_len: u64) void {
    allocator.free(fromJS(ptr_len));
}

/// the main function to render markdown to html
export fn render(ptr_len: u64, flags: usize, buffer_size: usize, has_code_highlighter: usize, output_type: usize) u64 {
    const md = fromJS(ptr_len);
    defer allocator.free(md);

    var writer = Writer.init(buffer_size, has_code_highlighter > 0);
    defer writer.deinit();

    var parser = c.MD_PARSER{
        .abi_version = 0,
        .flags = flags,
        .enter_block = HTMLRenderer.enterBlock,
        .leave_block = HTMLRenderer.leaveBlock,
        .enter_span = HTMLRenderer.enterSpan,
        .leave_span = HTMLRenderer.leaveSpan,
        .text = HTMLRenderer.text,
        .debug_log = null,
        .syntax = null,
    };

    const output_json = output_type == 2;
    if (output_json) {
        parser.enter_block = JOSNRenderer.enterBlock;
        parser.leave_block = JOSNRenderer.leaveBlock;
        parser.enter_span = JOSNRenderer.enterSpan;
        parser.leave_span = JOSNRenderer.leaveSpan;
        parser.text = JOSNRenderer.text;
    }

    if (output_json) {
        writer.writeByte('[');
    }

    _ = c.md_parse(
        md.ptr,
        @intCast(md.len),
        &parser,
        @ptrFromInt(@intFromPtr(&writer)),
    );

    if (output_json) {
        writer.writeByte(']');
    }

    // return remaining buffer
    return toJS(writer.buf[0..writer.len]);
}

/// get a slice from the pointer and length
fn fromJS(ptr_len: u64) []const u8 {
    const s = @as([2]u32, @bitCast(ptr_len));
    return @as([*]u8, @ptrFromInt(s[0]))[0..s[1]];
}

/// convert a slice to its pointer and length
fn toJS(data: []const u8) u64 {
    return @as(u64, @bitCast([2]u32{
        @as(u32, @intFromPtr(data.ptr)),
        data.len,
    }));
}

// add libc compatibility layer for wasm target
usingnamespace @import("libc.zig");

// js functions
pub extern fn push(ptr_len: u64) void;
pub extern fn pushCodeBlock(language_ptr_len: u64, code_ptr_len: u64) void;
