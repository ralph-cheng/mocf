import { program } from 'commander';
import { startup } from './server';

function collect(value: string, previous: string[]) {
  return (previous || []).concat([value]);
}

program
  .version(require('../package.json').version)
  .option('-a, --address <host>', 'ip address to bind', '0.0.0.0')
  .option('-p, --port <port>', 'port to bind', parseFloat, 4040)
  .option('--proxy <proxy_target>', 'proxy requests to another server if there is no endpoint configured here')
  .option('--proxypath <proxy_path>', 'only proxy requests starts with this path prefix, repeatable', collect)
  .arguments('<data_files>');

program.parse(process.argv);

const { address: hostname, port, proxy, proxypath } = program.opts();
const dataFiles = program.args;

if (dataFiles.length === 0) {
  program.help();
}

export function main() {
  startup({
    hostname,
    port,
    dataFiles,
    proxy,
    proxypath,
  });
}

main();
