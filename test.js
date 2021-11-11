// const { unimported } = require("unimported-module");
 const { unimported } = require("./dist/index");

unimported({
  entry: ["./src/index.ts"],
  extensions: [".ts", ".js"],
}).then(({ unimported }) => {
  console.log(unimported);
});
