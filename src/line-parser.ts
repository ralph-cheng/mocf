import * as Fs from 'fs';
import { METHODS, STATUS_CODES } from 'http';
import * as Path from 'path';
import * as URL from 'url';
import { IEndpoint } from './endpoint';

enum LineType {
  Whitespace,
  CommentLine,
  Url,
  Method,
  Status,
  Response,
  Delay,
}

type Parsers = {
  [k in keyof Required<IEndpoint>]: (line: string) => IEndpoint[k];
};

function respondContent(lines: string[]) {
  const text = lines.join('\n');
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

function respondFile(line: string, filename: string) {
  const matched = /^\s*file:\s*(.*)$/.exec(line);
  if (!matched) {
    return null;
  }
  const [, responseFilename] = matched;
  const resolvedFilename = Path.resolve(Path.dirname(filename), responseFilename);

  try {
    if (!Fs.lstatSync(resolvedFilename).isFile()) {
      return null;
    }

    const ext = Path.extname(responseFilename);
    let content = '';
    if (ext === '.js') {
      try {
        content = require(resolvedFilename);
        delete require.cache[resolvedFilename];
        if (typeof content === 'object') {
          content = JSON.stringify(content);
        }
      } catch (e) {
        content = Fs.readFileSync(resolvedFilename).toString();
      }
    }
    else {
      content = Fs.readFileSync(resolvedFilename).toString();
    }
    return respondContent([content]);
  } catch (e) {
    return null;
  }
}

function getLineParsers(filename: string): Parsers {
  const responseLines: string[] = [];

  return {
    path(line) {
      return URL.parse(line).path;
    },
    method(line) {
      return line.toUpperCase();
    },
    status(line) {
      return parseInt(line);
    },
    responseFn(line) {
      responseLines.push(line);
      return async () => {
        switch (responseLines.length) {
          case 0:
            return null;
          case 1:
            return respondFile(responseLines[0], filename) || respondContent(responseLines);
          default:
            return respondContent(responseLines);
        }
      };
    },
    delayFn(line) {
      const [, ms1, , ms2 = '0'] = /^(\d+)(ms)?-?(\d+)?ms$/.exec(line);
      const [lo, hi] = [parseInt(ms1), parseInt(ms2)].sort();

      return () =>
        new Promise((resolve) => {
          const delay = Math.floor(Math.random() * (hi - lo) + lo);
          setTimeout(resolve, delay);
        });
    },
  };
}

function guessLineType(line: string): LineType {
  if (!line) {
    return LineType.Whitespace;
  }

  if (line.startsWith('#')) {
    return LineType.CommentLine;
  }

  if (line.match(/^(\d+)(ms)?-?(\d+)?ms$/)) {
    return LineType.Delay;
  }

  if (METHODS.includes(line.toUpperCase())) {
    return LineType.Method;
  }

  if (line.trim() in STATUS_CODES) {
    return LineType.Status;
  }

  const { hostname, path } = URL.parse(line);
  if (hostname || path.startsWith('/')) {
    return LineType.Url;
  }

  // Anything not recognized is Response
  return LineType.Response;
}

export function getParserForFile(filename: string) {
  let parsers: Parsers = getLineParsers(filename);
  return (line: string, endpoint: IEndpoint): IEndpoint => {
    line = line.trim();
    const lineType = guessLineType(line);
    switch (lineType) {
      case LineType.Url:
        parsers = getLineParsers(filename);
        return { path: parsers.path(line) };
      case LineType.Status:
        if (endpoint.responseFn) {
          endpoint.responseFn = parsers.responseFn(line);
          return endpoint;
        }
        endpoint.status = parsers.status(line);
        return endpoint;
      case LineType.Method:
        if (endpoint.responseFn) {
          endpoint.responseFn = parsers.responseFn(line);
          return endpoint;
        }
        endpoint.method = parsers.method(line);
        return endpoint;
      case LineType.Delay:
        if (endpoint.responseFn) {
          endpoint.responseFn = parsers.responseFn(line);
          return endpoint;
        }
        endpoint.delayFn = parsers.delayFn(line);
        return endpoint;
      case LineType.Response:
        endpoint.responseFn = parsers.responseFn(line);
        return endpoint;
      default:
        return endpoint;
    }
  };
}
