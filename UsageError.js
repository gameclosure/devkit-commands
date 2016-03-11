'use strict';

class UsageError extends Error {
  constructor (message) {
    this.message = message;
    this.name = 'UsageError';
    Error.captureStackTrace(this, UsageError);
  }
}

module.exports = UsageError;
