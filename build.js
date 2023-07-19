build();

const mainPort = 8080;
const backPort = 8081;

async function build() {

  const esbuild = require("esbuild");
  const livereload = require("livereload");
  const customTasks = require("./build-custom-tasks");
  const myGlsl = require("./build-my-glsl.js");
  const staticServer = require("static-server");

  const args = (argList => {
    let res = {};
    let opt, thisOpt, curOpt;
    for (let i = 0; i < argList.length; i++) {
      thisOpt = argList[i].trim();
      opt = thisOpt.replace(/^\-+/, "");
      if (opt === thisOpt) {
        // argument value
        if (curOpt) res[curOpt] = opt;
        curOpt = null;
      } else {
        // argument name
        curOpt = opt;
        res[curOpt] = true;
      }
    }
    //console.log(res);
    return res;
  })(process.argv);

  let prod = args.prod ? true : false;
  let watch = false;
  let isBackstage = args.sketch.startsWith("xx");
  let pubDir = isBackstage ? "public-xx" : "public";

  if (args.watch) {
    watch = {
      onRebuild(error) {
        let dstr = "[" + new Date().toLocaleTimeString() + "] ";
        if (error) {
          console.error(dstr + "Change detected; rebuild failed:", error);
          return;
        }
        console.log(dstr + "Change detected; rebuild OK");
      },
    };
  }

  const sketchName = "current/" + args.sketch + "/app.js";

  esbuild.build({
    entryPoints: [sketchName],
    outfile: pubDir + "/app.js",
    bundle: true,
    sourcemap: !args.prod,
    minify: args.prod,
    plugins: [
      myGlsl(),
      customTasks({prod, pubDir}),
    ],
    watch: watch,
  }).catch(err => {
    console.error("Unexpected error; quitting.");
    if (err) console.error(err);
    process.exit(1);
  }).then(() => {
    console.log("Build finished.");
    if (args.watch) {
      if (!isBackstage) {
        livereload.createServer().watch("./" + pubDir);
        console.log("Watching changes, with livereload...");
      }
      var server = new staticServer({
        rootPath: "./" + pubDir,
        port: isBackstage ? backPort : mainPort,
      });
      server.start(function () {
        console.log("Server listening at " + server.port + "; serving from " + pubDir);
      });
    }
  });
}
