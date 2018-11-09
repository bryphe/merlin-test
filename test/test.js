const cp = require("child_process");
const fs = require("fs");
const path = require("path");

let ocamlMerlinPath = cp.execSync("esy b which ocamlmerlin").toString("utf8").trim();
let ocamlMerlinReasonPath = cp.execSync("esy b which ocamlmerlin-reason").toString("utf8").trim();

ocamlMerlinPath = process.platform === "win32" ? cp.execSync(`esy b cygpath -w ${ocamlMerlinPath}`).toString("utf8").trim() : ocamlMerlinPath
ocamlMerlinReasonPath = process.platform === "win32" ? cp.execSync(`esy b cygpath -w ${ocamlMerlinReasonPath}`).toString("utf8").trim() : ocamlMerlinPath
console.log(ocamlMerlinPath);
console.log(ocamlMerlinReasonPath);


const root = path.join(__dirname, "..");
const lib = path.join(root, "lib");
const bin = path.join(root, "bin");

let runMerlinCommand = (args, options) => {

    options = { cwd: process.cwd(), 
                input: null,
                ...options };

    let augmentedPath = path.dirname(ocamlMerlinReasonPath) + ";" + process.env["Path"];

    let env = {
        ...process.env,
        ["Path"]: augmentedPath,
        ["PATH"]: augmentedPath
    };

    console.log("[runMerlinCommand] Using cwd: " + options.cwd);
    return new Promise((resolve, reject) => {
        let proc = cp.spawn(ocamlMerlinPath, args, {
            cwd: options.cwd,
            env,
        })

        if (options.input) {
            proc.stdin.setEncoding('utf-8');
            proc.stdin.write(options.input);
            proc.stdin.end();
        }

        let data = "";
        let err = "";
        proc.stdout.on("data", (d) => {
            console.log("[Merlin - output]: " + d);
            data += d;
        })

        proc.stderr.on("data", (d) => {
            console.log("[Merlin - error]: " + d);
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

    let input = `
let x = 1
let y = .5
    `;

    test("Can give me a type from a .ml file", async () => {
        let { data }  = await runMerlinCommand(["single", "type-enclosing", "-position", "2:5", "-filename bin/test.ml"], {
            cwd: root,
            input
        });
        console.dir(data);
        expect(data.class).toBe('return');
    });

let reasonInput = `let x = 1;`
    test("Can give me a type from a single-line .re file", async () => {
        let { data }  = await runMerlinCommand(["single", "type-enclosing", "-position", "1:5", "-filename bin/Hello.re"], {
            cwd: root,
            input: reasonInput
        });
        console.dir(data);
        expect(data.class).toBe('return');
    });

let reasonMultiLineInput = `
let x = 1;
let y = 2;
`
    test("Can give me a type from a multi-line .re file", async () => {
        let { data }  = await runMerlinCommand(["single", "type-enclosing", "-position", "2:5", "-filename bin/Hello.re"], {
            cwd: root,
            input: reasonMultiLineInput
        });
        console.dir(data);
        expect(data.class).toBe('return');
    });

})

describe("path-of-source", () => {
    test("Can find file in same directory", async () => {
        let { data }  = await runMerlinCommand(["single", "path-of-source", "-file test.ml"], {
            cwd: lib
        });

        expect(data.class).toBe('return');
    });

    test("Can find file from another directory", async () => {
        let { data }  = await runMerlinCommand(["single", "path-of-source", "-file test.ml"], {
            cwd: bin
        });

        expect(data.class).toBe('return');
    });

    test("Can find file from root directory", async () => {
        let { data }  = await runMerlinCommand(["single", "path-of-source", "-file test.ml"], {
            cwd: root
        });

        expect(data.class).toBe('return');
    });
});
