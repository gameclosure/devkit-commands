'use strict';
/** @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the Mozilla Public License v. 2.0 as published by Mozilla.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * Mozilla Public License v. 2.0 for more details.

 * You should have received a copy of the Mozilla Public License v. 2.0
 * along with the Game Closure SDK.  If not, see <http://mozilla.org/MPL/2.0/>.
 */
let lazy = require('lazy-cache')(require);
lazy('devkit-logging', 'logging');
lazy('path');

class BaseCommand {

  constructor () {
    // strip off executable if it matches node|nodejs
    var executable = lazy.path.basename(process.argv[0]);
    if (executable === 'node' || executable === 'nodejs') {
      process.argv.shift();
    }

    this.name = '';
    this.description = '';

    this.opts = require('yargs')();
    this.logger = lazy.logging.get(this.name);

    Object.defineProperty(this, 'argv', {
      get: this.getArgv.bind(this),
      configurable: true,
      enumerable: true
    });
  }

  getArgv () {
    return this.opts.parse(process.argv);
  }

  showHelp () {
    console.log('devkit', this.name + ':', this.description);
    console.log();
    this.opts.showHelp();
  }

  exec (command, args, cb) {
    // to implement
  }
}

module.exports = BaseCommand;
