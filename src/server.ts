import connect from 'connect';
import { NextFunction } from 'express';
import { IncomingMessage, ServerResponse } from 'http';
import morgan from 'morgan';
import { IConfigOptions } from './config-options';
import { createResolver } from './resolver';
import { getProxyHandler } from './proxy';

export async function startup(options: IConfigOptions) {
  const { hostname, port, dataFiles, proxy, proxypath } = options;
  const resolver = createResolver();
  for (const filename of dataFiles) {
    await resolver.addFile(filename);
  }
  const app = connect();

  app.use(morgan('dev'));

  app.use((req: IncomingMessage, res: ServerResponse, next: NextFunction) => {
    const cfg = resolver.resolveReq(req);
    if (!cfg) {
      next();
      return;
    }

    const { delayFn, status = 200, responseFn } = cfg;

    function respond() {
      responseFn().then(
        (value) => {
          const isText = typeof value === 'string';
          const type = isText ? 'text/plain' : 'application/json';
          const body = isText ? value : JSON.stringify(value);
          res.writeHead(status, {
            'Content-Type': type,
            'Content-Length': Buffer.byteLength(body),
          });
          res.end(body);
          next();
        },
        (err) => console.error(`Error getting responsed for '${req.url}': `, err)
      );
    }

    if (delayFn) {
      delayFn().then(respond);
    } else {
      respond();
    }
  });

  app.use(getProxyHandler(proxy, proxypath || []))

  return app.listen(port, hostname, () => {
    console.log(`Server is running at http://${hostname}:${port}\n`);
    console.log(resolver.info());
  });
}
