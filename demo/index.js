const unimportedTool = require("../dist/index.js");

// const { unimported } =  unimportedTool.default({});

unimportedTool
  .default({
    entry: ["../src/index.ts"],
    extensions: [".ts", ".js"],
  })
  .then(({ unimported }) => {
    const result = unimported.reduce((pre, item) => {
      return `${pre}\n${item}`;
    }, "");

    console.log(result);
  });
