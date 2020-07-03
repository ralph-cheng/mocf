import httpProxy from 'http-proxy';
import { NextHandleFunction } from 'connect';

export function getProxyHandler(target: string, prefixes?: string[]): NextHandleFunction {
  if (!target) {
    return (_req, _res, next) => next();
  }

  prefixes = prefixes || [];
  if (!prefixes.length) {
    prefixes.push('/');
  }

  const proxyServer = httpProxy.createProxyServer({ target });

  return (req, res, next) => {
    if (prefixes.some((p) => req.url.startsWith(p))) {
      proxyServer.web(req, res);
    } else {
      next();
    }
  };
}
