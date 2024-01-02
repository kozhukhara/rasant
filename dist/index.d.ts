import { IncomingMessage as IncomingMessage$1, ServerResponse as ServerResponse$1 } from 'http';

type Wildcard = "*";
type httpVerbs = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "CONNECT" | "HEAD" | Wildcard;
type CaseInsensitive<T extends string> = string extends T ? string : T extends `${infer F1}${infer F2}${infer R}` ? `${Uppercase<F1> | Lowercase<F1>}${Uppercase<F2> | Lowercase<F2>}${CaseInsensitive<R>}` : T extends `${infer F}${infer R}` ? `${Uppercase<F> | Lowercase<F>}${CaseInsensitive<R>}` : "";
type Verbs = CaseInsensitive<httpVerbs>;
interface AppConfig {
    port: number;
    publicFolder?: string;
}
interface Cors {
    allowedOrigins?: string[] | Wildcard;
    allowedMethods?: Verbs[];
    allowedHeaders?: string[];
    allowCredentials?: boolean;
}
interface RasantConfig {
    router: Route[];
    cors?: Cors;
    app: AppConfig;
}
type Header = {
    name: string;
    value: number | string | readonly string[];
};
interface RequestRoute {
    query: {
        [key in string]?: string | string[];
    };
    params: {
        [key in string]?: string;
    };
}
interface IncomingMessage extends IncomingMessage$1 {
    route: RequestRoute;
    body?: any;
    context: any;
    parseBody: () => Promise<void>;
}
interface ServerResponse extends ServerResponse$1 {
    file: (path: string, options?: ResFileOptions) => Promise<any>;
    setHeaders: (headers: Header[]) => this;
    redirect: (to: string) => this;
    status: (statusCode: number) => this;
    html: (payload: string) => this;
    json: (payload: any) => this;
    send: (payload: string, options?: ResContentOptions) => this;
}
type Handler = (req: IncomingMessage, res: ServerResponse) => ServerResponse | Promise<ServerResponse> | any | Promise<any>;
type Middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => void | Promise<void>;
type HandlerOption = {
    verb?: Verbs;
    middleware?: Middleware | Middleware[];
    handler: Handler;
};
interface Route {
    path: string;
    regex?: RegExp;
    middleware?: Middleware | Middleware[];
    handlers: {
        [key in Verbs]?: HandlerOption;
    };
    nodes?: Route[];
}
interface ResFileOptions {
    disposition?: string;
    filename?: string;
}
interface ResContentOptions {
    contentType?: string;
    encoding?: string;
}

declare class Rasant {
    private readonly routerTree;
    private server;
    private readonly config;
    readonly logger: {
        log: (...args: any[]) => void;
    };
    constructor(config: RasantConfig);
    private buildRadixTree;
    serveStaticFiles(req: IncomingMessage, res: ServerResponse): Promise<boolean>;
    handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void>;
    private findHandler;
    private executeMiddlewaresAndHandler;
    private handleCors;
    start(callback?: () => any): void;
}

export { Rasant };
