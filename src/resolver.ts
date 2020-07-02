import chokidar from 'chokidar';
import { Request } from 'express';
import * as Fs from 'fs';
import * as Readline from 'readline';
import { calcEndpointKey, calcRequestKey, IEndpoint } from './endpoint';
import { getParserForFile } from './line-parser';

function fromTextFile(filename: string, cache: Record<string, IEndpoint>) {
  let currEndpoint: IEndpoint = null;
  const parseLine = getParserForFile(filename);

  return new Promise<Record<string, IEndpoint>>((resolve) => {
    const endpoints: IEndpoint[] = [];
    const reader = Readline.createInterface({
      input: Fs.createReadStream(filename),
      output: null,
    });
    reader.on('line', (line) => {
      const nextEndpoint = parseLine(line, currEndpoint);
      if (nextEndpoint !== currEndpoint) {
        endpoints.push(nextEndpoint);
        currEndpoint = nextEndpoint;
      }
    });
    reader.on('close', () => {
      for (const e of endpoints) {
        const key = calcEndpointKey(e);
        cache[key] = e;
      }
      resolve(cache);
    });
  });
}

export interface IResolver {
  addFile(filename: string): Promise<void>;
  resolveReq(req: Request): IEndpoint;
  info(): string;
}

export function createResolver(): IResolver {
  // used to keep resolving order, i.e. files added later shadows same endpoint in files added earlier
  const files: string[] = [];
  const cache: Record<string, Record<string, IEndpoint>> = {};

  async function loadFile(filename: string) {
    try {
      const fileCache = await fromTextFile(filename, {});
      cache[filename] = fileCache;
      if (!files.includes(filename)) {
        files.unshift(filename);
      }
    } catch (e) {
      console.error(`Cannot load text file '${filename}':`, e);
    }
  }

  const info: IResolver['info'] = () => {
    let text: string[] = [];
    let endpointCount = 0;

    for (const filename of files) {
      const size = Object.keys(cache[filename]).length;
      endpointCount += size;
      text.push(`\n${filename} [${plural(size, 'endpoint')}]:`);
      for (const key in cache[filename]) {
        text.push(`    ${key}`);
      }
      text.push('');
    }
    const nFiles = files.length;
    text.unshift(`Found ${plural(endpointCount, 'endpoint')} in ${plural(nFiles, 'file')}...`);
    text.push('');
    return text.join('\n');
  };

  const resolveReq: IResolver['resolveReq'] = (req) => {
    const key = calcRequestKey(req);
    for (const filename of files) {
      if (filename in cache && key in cache[filename]) {
        return cache[filename][key];
      }
    }
    return null;
  };

  const addFile: IResolver['addFile'] = (filename) => {
    if (filename in cache) {
      return;
    }

    chokidar.watch(filename).on('change', async (path) => {
      console.debug(`File ${path} has changed, updating...`);
      await loadFile(path);
      console.log(info());
    });
    return loadFile(filename);
  };

  return { addFile, resolveReq, info };
}

function plural(n: number, word: string, pluralForm: string = `${word}s`) {
  return n + ' ' + (n > 1 ? pluralForm : word);
}
