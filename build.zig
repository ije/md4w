const std = @import("std");

pub fn build(b: *std.Build) void {
    const lib = b.addSharedLibrary(.{
        .name = "md4c",
        .version = .{ .major = 0, .minor = 0, .patch = 1 },
        .root_source_file = .{ .path = "wasm/md4c.zig" },
        .target = .{ .cpu_arch = .wasm32, .os_tag = .freestanding },
        .optimize = .ReleaseSmall,
    });
    lib.addCSourceFile(.{ .file = .{ .path = "md4c/src/entity.c" }, .flags = &.{} });
    lib.addCSourceFile(.{ .file = .{ .path = "md4c/src/md4c-html.c" }, .flags = &.{} });
    lib.addCSourceFile(.{ .file = .{ .path = "md4c/src/md4c.c" }, .flags = &.{} });
    lib.addIncludePath(.{ .path = "md4c/src" });
    lib.linkLibC();
    lib.rdynamic = true;
    b.installArtifact(lib);
}
