import { IncomingMessage } from 'http';

export interface IEndpoint {
  path: string;
  method?: string;
  status?: number;
  responseFn?: () => Promise<any>;
  delayFn?: () => Promise<void>;
}

export function calcEndpointKey(endpoint: IEndpoint) {
  const { method = 'GET', path = '/' } = endpoint;
  return `${method} ${path}`;
}

export function calcRequestKey(request: IncomingMessage) {
  const { method, url } = request;
  return `${method.toUpperCase()} ${url}`;
}
