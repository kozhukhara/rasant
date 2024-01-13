import {
  IncomingMessage as IncomingMessageI,
  ServerResponse as ServerResponseI,
} from "http";
import { Options as UploadOptions } from "formidable";

export const WILDCARD = "*";

export type Wildcard = "*";

export type Verbs =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "CONNECT"
  | "HEAD"
  | Wildcard;

export interface AppConfig {
  port: number;
  publicFolder?: string;
  logging?: boolean;
}

export interface Cors {
  allowedOrigins?: string[] | Wildcard;
  allowedMethods?: Verbs[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
}

export interface RasantConfig {
  router: Route[];
  cors?: Cors;
  uploads?: UploadOptions;
  app: AppConfig;
}

export type Headers = { [key: string]: string };

export interface RequestRoute {
  query: { [key in string]?: string | string[] };
  params: { [key in string]?: string };
}

export interface IncomingMessage extends IncomingMessageI {
  route: RequestRoute;
  body?: any;
  context: any;
  parseBody: () => Promise<void>;
}

export interface ServerResponse extends ServerResponseI {
  file: (path: string, options?: ResFileOptions) => Promise<any>;
  setHeaders: (headers: Headers) => this;
  redirect: (to: string) => this;
  status: (statusCode: number) => this;
  html: (payload: string) => this;
  json: (payload: any) => this;
  send: (payload: string, options?: ResContentOptions) => this;
}

export type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
) => ServerResponse | Promise<ServerResponse> | any | Promise<any>;

export type Middleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => void | Promise<void>;

export type HandlerOption = {
  verb?: Verbs;
  middleware?: Middleware | Middleware[];
  handler: Handler;
};

export interface Route {
  path: string;
  regex?: RegExp;
  middleware?: Middleware | Middleware[];
  handlers: {
    [key in Verbs]?: HandlerOption;
  };
  nodes?: Route[];
}

export interface ResFileOptions {
  disposition?: string;
  filename?: string;
  encoding?: string;
}

export interface ResContentOptions {
  contentType?: string;
  encoding?: string;
}
