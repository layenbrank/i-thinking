"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
(0, node_fs_1.readFile)((0, node_path_1.resolve)(__dirname, '..', 'package.json'), {
    encoding: 'utf-8'
}, function (error, data) {
    if (error)
        return console.error("Read failed: ".concat(error));
    var parsed = JSON.parse(data);
    console.log('Read succeeded! Package: ', parsed.name);
    var packageJson = {
        scripts: {
            dev: parsed.scripts.dev,
            preview: parsed.scripts.preview
        },
        dependencies: parsed.dependencies
    };
    (0, node_fs_1.writeFile)((0, node_path_1.resolve)(__dirname, '..', 'dist/package.json'), JSON.stringify(packageJson, null, 2), function (error) {
        if (error)
            console.error("Write failed: ".concat(error));
        else
            console.log('Write succeeded!');
    });
});
