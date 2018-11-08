const cp = require("child_process");
const fs = require("fs");
const path = require("path");

let ocamlMerlinPath = cp.execSync("esy b which ocamlmerlin").toString("utf8").trim();

ocamlMerlinPath = process.platform === "win32" ? cp.execSync(`esy b cygpath -w ${ocamlMerlinPath}`).toString("utf8").trim() : ocamlMerlinPath
console.log(ocamlMerlinPath);

const root = path.join(__dirname, "..");
const lib = path.join(root, "lib");
const bin = path.join(root, "bin");

let runMerlinCommand = (args, options) => {

    options = { cwd: process.cwd(), 
                input: null,
                ...options };

    console.log("Using cwd: " + options.cwd);
    return new Promise((resolve, reject) => {
        let proc = cp.spawn(ocamlMerlinPath, args, {
            cwd: options.cwd
        })
        // proc.stdin.setEncoding('utf-8');
        // proc.stdout.pipe(process.stdout);

        let data = "";
        let err = "";
        proc.stdout.on("data", (d) => {
            console.log("DATA: " + d);
            data += d;
        })

        proc.stderr.on("data", (d) => {
            err += d;
        })

        proc.on('close', (exitCode) => {
            if (exitCode === 0) {
                resolve({
                    exitCode,
                    data: JSON.parse(data),
                    stdout: data,
                    stderr: err,
                });
            } else {
                reject({
                    exitCode,
                    stdout: data,
                    stderr: err,
                })
            }
        })
    });
};

describe("type-enclosing", () => {
    test("Can give me a type from a .ml file", async () => {
        let { data }  = await runMerlinCommand(["single", "type-enclosing", "-position", "1:5", "-filename bin/test.ml"], {
            cwd: root
        });
        console.dir(data);
        expect(data.class).toBe('return');
    });

    test("Can give me a type from a .re file", async () => {
        let { data }  = await runMerlinCommand(["single", "type-enclosing", "-position", "1:5", "-filename bin/Hello.re"], {
            cwd: root
        });
        console.dir(data);
        expect(data.class).toBe('return');
    });
})

describe("path-of-source", () => {
    test("Can find file in same directory", async () => {
        let { data }  = await runMerlinCommand(["single", "path-of-source", "-file test.ml"], {
            cwd: bin
        });

        expect(data.class).toBe('return');
    });

    test("Can find file from another directory", async () => {
        let { data }  = await runMerlinCommand(["single", "path-of-source", "-file test.ml"], {
            cwd: lib
        });

        expect(data.class).toBe('return');
    });
});
