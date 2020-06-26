import * as Fs from 'fs';
import * as Path from 'path';
import * as URL from 'url';
import { HTTP_METHOD, HTTP_STATUS } from './constants';
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

function genFileResponseFn(line: string, filename: string): ReturnType<Parsers['responseFn']> {
  const matched = /^\s*file:\s*(.*)$/.exec(line);
  if (!matched) {
    return null;
  }
  const [, responseFilename] = matched;
  const resolvedFilename = Path.resolve(Path.dirname(filename), responseFilename);
  const fallbackResponseFn = genInlineResponseFn(line);

  return async () => {
    try {
      if (!Fs.lstatSync(resolvedFilename).isFile()) {
        return fallbackResponseFn();
      } else {
        const content = Fs.readFileSync(resolvedFilename).toString();
        const value = await genInlineResponseFn(content)();
        return value;
      }
    } catch (e) {
      return fallbackResponseFn();
    }
  };
}

function genInlineResponseFn(line: string): ReturnType<Parsers['responseFn']> {
  let content: any;
  try {
    content = JSON.parse(line);
  } catch (e) {
    // ignore error, use the line as text
    content = line;
  }
  return async () => content;
}

function getLineParsers(filename: string): Parsers {
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
      return genFileResponseFn(line, filename) || genInlineResponseFn(line);
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

  if (HTTP_METHOD.includes(line.toUpperCase())) {
    return LineType.Method;
  }

  if (HTTP_STATUS.includes(line)) {
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
  const parsers = getLineParsers(filename);
  return (line: string, endpoint: IEndpoint): IEndpoint => {
    line = line.trim();
    const lineType = guessLineType(line);
    switch (lineType) {
      case LineType.Url:
        return { path: parsers.path(line) };
      case LineType.Status:
        endpoint.status = parsers.status(line);
        return endpoint;
      case LineType.Method:
        endpoint.method = parsers.method(line);
        return endpoint;
      case LineType.Delay:
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
