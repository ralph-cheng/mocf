import { program } from 'commander';
import { startup } from './server';

program
  .version(require('../package.json').version)
  .arguments('<data_files>')
  .option('-a, --address <host>', 'ip address to bind', '0.0.0.0')
  .option('-p, --port <port>', 'port to bind', parseFloat, 4040);

program.parse(process.argv);

const { address: hostname, port } = program.opts();
const dataFiles = program.args;

if (dataFiles.length === 0) {
  program.help();
}

export function main() {
  startup({
    hostname,
    port,
    dataFiles
  });
}

main();
