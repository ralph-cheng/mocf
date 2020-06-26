import { program } from 'commander';
import { createResolver } from './resolver';
import { startup } from './server';

program
  .version(require('../package.json').version)
  .arguments('<data_files>')
  .option('-a, --address <host>', 'ip address to bind', '0.0.0.0')
  .option('-p, --port <port>', 'port to bind', '4040');

program.parse(process.argv);

const { address, port } = program.opts();
const files = program.args;

if (files.length === 0) {
  program.help();
}

export async function main() {
  const resolver = createResolver();
  for (const filename of files) {
    await resolver.addFile(filename);
  }
  startup(resolver, address, port);
}

main();
