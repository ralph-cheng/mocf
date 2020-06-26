import morgan from 'morgan';
import express from 'express';
import { IResolver } from './resolver';

export function startup(resolver: IResolver, hostname: string, port: number) {
  const app = express();

  app.use(morgan('dev'));

  app.use(async (req, res) => {
    const cfg = resolver.resolveReq(req);
    if (!cfg) {
      res.status(404).end();
      return;
    }
    const { delayFn, status, responseFn } = cfg;

    function respond() {
      responseFn().then(
        (value) => {
          res
            .type(typeof value === 'string' ? 'text/plain' : 'application/json')
            .status(status || 200)
            .send(value);
        },
        (err) => console.error(`Error getting responsed for '${req.url}': `, err)
      );
    }

    if (delayFn) {
      await delayFn();
    }
    respond();
  });

  return app.listen(port, hostname, () => {
    console.log(`Server is running at http://${hostname}:${port}`);
    console.log();
    console.log(resolver.info());
  });
}
