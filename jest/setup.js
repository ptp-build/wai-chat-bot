/* eslint-env jest */
/* eslint-disable import/no-extraneous-dependencies */
const { CustomConsole } = require('@jest/console');

jest.setTimeout(1000000000);

function simpleFormatter(type, message) {
  const TITLE_INDENT = ' ';
  const CONSOLE_INDENT = TITLE_INDENT + '  ';

  return (
    '> ' +
    message
      .split(/\n/)
      .map(line => CONSOLE_INDENT + line)
      .join('\n')
  );
}

global.console = new CustomConsole(process.stdout, process.stderr, simpleFormatter);
