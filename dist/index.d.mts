import { IncomingMessage as IncomingMessage$1, ServerResponse as ServerResponse$1 } from 'http';
import { Options } from 'formidable';

type Wildcard = "*";
type Verbs = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "CONNECT" | "HEAD" | Wildcard;
interface AppConfig {
    port: number;
    publicFolder?: string;
    logging?: boolean;
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
    uploads?: Options;
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
    handleRequest(req: IncomingMessage, res: ServerResponse): Promise<ServerResponse>;
    private findHandler;
    private executeMiddlewaresAndHandler;
    private handleCors;
    start(callback?: () => any): void;
}

export { Rasant };
