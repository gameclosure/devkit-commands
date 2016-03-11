'use strict';
let lazy = require('lazy-cache')(require);
lazy('fs');
lazy('path');
lazy('printf');
lazy('yargs');

lazy('devkit-logging', 'logging');

let logger = lazy.logging.get('commands');

let _usage = [];
let _commands = {};
let commandUsages = [];

let loadCommand = function (commandPath) {
  return new Promise((resolve, reject) => {
    let extname = lazy.path.extname(commandPath);
    let name = lazy.path.basename(commandPath, extname);
    logger.silly('> Loading command:', name, commandPath);
    let Command;
    try {
      Command = require(commandPath);
    } catch (e) {
      logger.error('Error loading:', name, e);
      return reject(e);
    }

    let aliasNames = [];
    let aliasUsages = [];
    if (typeof Command !== 'function') {
      return resolve();
    }

    let cmd = _commands[name] = new Command();

    // setup a single or array of aliases (e.g. "--version" and "-v" for the "version" command)
    if (cmd.alias) {
      let isArray = Array.isArray(cmd.alias);
      let aliases = cmd.alias;
      if (!isArray) {
        aliases = [aliases];
      }

      for (let i = 0; i < aliases.length; i++) {
        let alias = aliases[i];

        // if alias is an object with description, treat as own command
        if (alias.name && alias.description) {
          let aliasCommand = alias.name;
          // let description = alias.description;
          if (!_commands[aliasCommand]) {
            // add alias as a reference to this command
            _commands[aliasCommand] = cmd;

            // build usage string and add to alias usage list
            aliasUsages.push(alias);
          }

        } else {
          // add alias for command name
          lazy.yargs.alias(name, alias);

          // add to list of alias names
          aliasNames.push(alias);
        }
      }
    }

    // create "command name (aliases)" string
    let commandName = cmd.name;
    if (aliasNames.length > 0) {
      commandName += ', ' + aliasNames.join(', ');
    }
    // create usage data
    commandUsages.push({name: commandName, description: cmd.description});

    // add alias command usages after the main command
    if (aliasUsages.length > 0) {
      commandUsages = commandUsages.concat(aliasUsages);
    }

    resolve();
  });
};

// Let commands update args
let _yargsObj = lazy.yargs
  .count('verbose')
  .alias('v', 'verbose')
  .array('trace');

exports._yargsObj = _yargsObj;
exports.argv = _yargsObj.argv;

/** get all commands and their descriptions */
exports.initCommands = function(commandsDir) {
  logger.debug('Loading commands dir:', commandsDir);
  let tasks = [];
  lazy.fs.readdirSync(commandsDir).forEach(item => {
    let extname = lazy.path.extname(item);
    if (extname === '.js' && item !== 'index.js') {
      tasks.push(loadCommand(lazy.path.join(commandsDir, item)));
    }
  });

  return Promise.all(tasks).then(() => {
    // build usage strings for all the commands
    // find the longest command name
    let commandLength = 0;
    for (let i = 0; i < commandUsages.length; i++) {
      if (commandUsages[i].name.length > commandLength) {
        commandLength = commandUsages[i].name.length;
      }
    }

    let format = '  %-' + (commandLength + 1) + 's %s';
    for (let i = 0; i < commandUsages.length; i++) {
      _usage.push(
        lazy.printf(
          format, commandUsages[i].name, commandUsages[i].description
        )
      );
    }

    let usageStr = 'usage: devkit [--version] [--help] <command> [<args>]\n\n' +
      'available commands:\n' + _usage.join('\n') + '\n\n' +
      'See \'devkit help <command>\' to read about a specific command';
    _yargsObj.usage(usageStr);

    for (let commandName in _commands) {
      let command = _commands[commandName];
      if (command.updateArgs) {
        _yargsObj = command.updateArgs(_yargsObj);
      }
    }
  });
};

exports.get = function (name) {
  return _commands[name];
};

exports.has = function (name) {
  return name && !!_commands[name];
};

exports.run = function(name, args) {
  logger.debug('running commaned', name, args);
  let command = exports.get(name);
  let commandPromise = command.exec(name, args);
  if (!Promise.is(commandPromise)) {
    logger.warn('Command did not return promise, async issues may result.');
  }
  return commandPromise;
};
