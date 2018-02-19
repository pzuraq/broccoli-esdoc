'use strict';

const fs            = require('fs');
const path          = require('path');
const merge         = require('merge');
const ESDoc         = require('esdoc').default;
const CachingWriter = require('broccoli-caching-writer');

const defaultOpts = {
  source: './app',
  dest: './docs',
  plugins: []
};

function nullLog() {};

module.exports = class BroccoliESDoc extends CachingWriter {
  constructor(inputNodes, options) {
    options = options || {};

    if (Array.isArray(inputNodes)) {
      throw new Error('ESDoc only accepts one input path for the time being');
    }

    super([inputNodes], {
      annotation: options.annotation
    });

    this.inputNodes = [inputNodes];
    this.options = merge(true, defaultOpts, options);
  }

  build() {
    const [inputPath] = this.inputPaths;

    const originalDir = process.cwd();
    process.chdir(inputPath);

    // ESDoc requires a README.md to exist or it throws, so create
    // one if it doesn't exist and remove it later
    let readMePath = path.join(inputPath, 'README.md');
    let hasAutogeneratedReadme = !fs.existsSync(readMePath);
    if (hasAutogeneratedReadme) {
      fs.closeSync(fs.openSync(readMePath, 'w'));
    }

    const config = this.options;

    config.destination = path.join(this.outputPath, config.dest);

    // ESDoc writes to stdout (console.log statements) which we want
    // to absorb if possible
    let originalWrite = process.stdout.write;
    process.stdout.write = () => {};

    try {
      ESDoc.generate(config);
      process.stdout.write = originalWrite;
    } catch (e) {
      process.stdout.write = originalWrite;
      console.error(e);
    } finally {
      process.chdir(originalDir);

      if (hasAutogeneratedReadme) {
        fs.unlinkSync(readMePath);
      }
    }
  }
};
