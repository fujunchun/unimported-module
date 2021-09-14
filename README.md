# unimported-module

forked from unimported([https://github.com/smeijer/unimported](https://github.com/smeijer/unimported))

`unimported` is a cli tool, modify the entry file, so we can import it as a module.

if get something unclear or want a cli, you can look at [unimported](https://github.com/smeijer/unimported)

**Find unused source files in javascript / typescript projects.**

While adding new code to our projects, we might forget to remove the old code. Linters warn us for unused code in a module, but they fail to report unused files.

`unimported` analyzes your code by following the require/import statements starting from your entry file.

The result is a report showing which files are unimported, which dependencies are missing from your `package.json`, and which dependencies can be removed from your `package.json`.

## usage

```
npm install unimported-module
```

or

```
yarn add unimported-module
```

```
const unimported = require('unimported-module')
const config = {
entry: ['./src/index.ts']
}

unimported(config).then(({unresolved,unused,unimported }) => {

})
```

### config

```json
{
  "entry": ["src/main.ts", "src/pages/**/*.{js,ts}"],
  "extensions": [".ts", ".js"],
  "ignorePatterns": ["**/node_modules/**", "private/**"],
  "ignoreUnresolved": ["some-npm-dependency"],
  "ignoreUnimported": ["src/i18n/locales/en.ts", "src/i18n/locales/nl.ts"],
  "ignoreUnused": ["bcrypt", "create-emotion"]
}
```

**Custom module directory**
You can also add an optional `moduleDirectory` option to your configuration file to resolve dependencies from other directories than `node_modules`. This setting defaults to `node_modules`.

```json
{
  "moduleDirectory": ["node_modules", "src/app"]
}
```

**Custom aliases**
If you wish to use aliases to import your modules & these can't be imported
directly (e.g. `tsconfig.json` in the case of Typescript or `jsconfig.json` if you have one), there is an option `aliases` to provide the correct path mapping:

```json
{
  "aliases": {
    "@components/*": ["./components", "./components/*"]
  }
}
```

_Note:_ you may wish to also add the `rootDir` option to specify the base path to
start looking for the aliases from:

```json
{
  "rootDir": "./src"
}
```

## Report

The report will look something like [below](#example). When a particular check didn't have any positive results, it's section will be excluded from the output.

### summary

Summary displays a quick overview of the results, showing the entry points that were used, and some statistics about the outcome.

### unresolved imports

These import statements could not be resolved. This can either be a reference to a local file. Or to a `node_module`. In case of a node module, it can be that nothing is wrong. Maybe you're importing only types from a `DefinitelyTyped` package. But as `unimported` only compares against `dependencies`, it can also be that you've added your module to the `devDependencies`, and that's a problem.

To ignore specific results, add them to `.unimportedrc.json#ignoreUnresolved`.

### unused dependencies

Some dependencies that are declared in your package.json, were not imported by your code. It should be possible to remove those packages from your project.

But, please double check. Maybe you need to move some dependencies to `devDependencies`, or maybe it's a peer-dependency from another package. These are hints that something might be wrong. It's no guarantee.

To ignore specific results, add them to `.unimportedrc.json#ignoreUnused`.

### unimported files

The files listed under `unimported files`, are the files that exist in your code base, but are not part of your final bundle. It should be safe to delete those files.

For your convenience, some files are not shown, as we treat those as 'dev only' files which you might need.

## License

[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/fujunchun/unimported-module/blob/main/LICENSE)
