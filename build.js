build();

async function build() {

  const esbuild = require("esbuild");
  const { default: glslify } = await import("esbuild-plugin-glslify");
  const livereload = require("livereload");
  const customTasks = require("./build-custom-tasks");
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

  const sketchName = "current/" + args.sketch + "/sketch.js";

  esbuild.build({
    entryPoints: [sketchName],
    outfile: "public/sketch.js",
    bundle: true,
    sourcemap: !args.prod,
    minify: args.prod,
    plugins: [
      glslify({
        extensions: ['vs', 'fs', '.glsl', '.frag.shader'],
        compress: false,
      }),
      customTasks({prod}),
    ],
    watch: watch,
  }).catch(err => {
    console.error("Unexpected error; quitting.");
    if (err) console.error(err);
    process.exit(1);
  }).then(() => {
    console.log("Build finished.");
    if (args.watch) {
      livereload.createServer().watch("./public");
      console.log("Watching changes, with livereload...");
      var server = new staticServer({
        rootPath: "./public",
        port: 8080,
      });
      server.start(function () {
        console.log("Server listening at " + server.port);
      });
    }
  });
}
