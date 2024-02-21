const std = @import("std");

pub fn build(b: *std.Build) void {
    const lib = b.addSharedLibrary(.{
        .name = "md4w",
        .version = .{ .major = 0, .minor = 0, .patch = 1 },
        .root_source_file = .{ .path = "src/md4w.zig" },
        .target = .{ .cpu_arch = .wasm32, .os_tag = .freestanding },
        .optimize = .ReleaseSmall,
    });
    lib.addCSourceFile(.{ .file = .{ .path = "vendor/md4c/src/md4c.c" }, .flags = &.{} });
    lib.addIncludePath(.{ .path = "vendor/md4c/src" });
    lib.linkLibC();
    lib.rdynamic = true;
    b.installArtifact(lib);

    const copy = b.addInstallFileWithDir(lib.getEmittedBin(), .prefix, "../js/md4w.wasm");
    b.default_step.dependOn(&copy.step);
}
