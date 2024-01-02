import {
  IncomingMessage as IncomingMessageI,
  ServerResponse as ServerResponseI,
} from "http";

export const WILDCARD = "*";

export type Wildcard = "*";

type httpVerbs =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "CONNECT"
  | "HEAD"
  | Wildcard;

type CaseInsensitive<T extends string> = string extends T
  ? string
  : T extends `${infer F1}${infer F2}${infer R}`
    ? `${Uppercase<F1> | Lowercase<F1>}${
        | Uppercase<F2>
        | Lowercase<F2>}${CaseInsensitive<R>}`
    : T extends `${infer F}${infer R}`
      ? `${Uppercase<F> | Lowercase<F>}${CaseInsensitive<R>}`
      : "";

export type Verbs = CaseInsensitive<httpVerbs>;

export interface AppConfig {
  port: number;
  publicFolder?: string;
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
  app: AppConfig;
}

export type Header = {
  name: string;
  value: number | string | readonly string[];
};

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
  setHeaders: (headers: Header[]) => this;
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
}

export interface ResContentOptions {
  contentType?: string;
  encoding?: string;
}
