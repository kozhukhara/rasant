import {
  RasantConfig,
  HandlerOption,
  IncomingMessage,
  Middleware,
  getParseBodyFunction,
  resExt,
  Route,
  ServerResponse,
  Verbs,
  WILDCARD,
} from "./lib";
import http from "http";
import { parse as parseUrl } from "url";
import { join } from "path";
import { createReadStream, stat } from "fs";
import { performance } from "perf_hooks";

export class Rasant {
  private readonly routerTree: any;
  private server!: http.Server;
  private readonly config: RasantConfig;
  readonly logger = {
    log: (...args: any[]) =>
      console.log(`[${new Date().toLocaleString()}]`, ...args),
  };

  constructor(config: RasantConfig) {
    this.config = config;
    this.routerTree = this.buildRadixTree(config.router || []);
  }

  private buildRadixTree(routes: Route[]): any {
    let rootNode = {};

    const addRoute = (node: any, pathParts: string[], route: Route) => {
      if (pathParts.length === 0) {
        node.route = route;
        if (route.nodes && route.nodes.length > 0) {
          route.nodes.forEach((nestedRoute) => {
            let nestedParts = nestedRoute.path.split("/").filter((p) => p);
            addRoute(node, nestedParts, nestedRoute);
          });
        }
        delete route.nodes;
        return;
      }

      let part = pathParts.shift() as string;
      if (!node.children) {
        node.children = {};
      }

      if (!node.children[part]) {
        node.children[part] = {};
      }

      addRoute(node.children[part], pathParts, route);
    };

    routes.forEach((route) => {
      let parts = route.path.split("/").filter((p) => p);
      addRoute(rootNode, parts, route);
    });

    return rootNode;
  }

  async serveStaticFiles(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.config.app.publicFolder) return resolve(false);
      const requestedPath = req.url || "/";
      let fullPath = join(this.config.app.publicFolder, requestedPath);
      stat(fullPath, (err, stats) => {
        if (err) {
          return resolve(false);
        }

        if (stats.isDirectory()) {
          fullPath = join(fullPath, "index.html");
        }

        stat(fullPath, (err, stats) => {
          if (err || !stats.isFile()) {
            return resolve(false);
          }

          const stream = createReadStream(fullPath).pipe(res);
          stream.on("finish", () => resolve(true));
        });
      });
    });
  }

  public async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<ServerResponse> {
    if (await this.serveStaticFiles(req, res)) return res;
    const [route, handler] = this.findHandler(req);
    if (!route) {
      res.statusCode = 404;
      res.statusMessage = "Not Found";
      return res.end(res.statusMessage);
    }

    if (!handler) {
      res.statusCode = 405;
      res.statusMessage = "Method Not Allowed";
      return res.end(res.statusMessage);
    }

    if (
      req.method === "POST" ||
      req.method === "PUT" ||
      req.method === "PATCH"
    ) {
      req.parseBody = getParseBodyFunction(this.config.uploads);
    }

    return this.executeMiddlewaresAndHandler(req, res, route, handler);
  }

  private findHandler(
    req: IncomingMessage,
  ): [Route | undefined, HandlerOption | undefined] {
    req.route = {
      query: {},
      params: {},
    };
    req.method = req.method?.toUpperCase();
    const parsedUrl = parseUrl(req.url || "", true);
    const pathSegments = (parsedUrl.pathname || "")
      .split("/")
      .filter((segment) => segment.length > 0);
    let currentNode = this.routerTree;
    let params: { [key: string]: string } = {};

    req.route.query = parsedUrl.query;
    for (const segment of pathSegments) {
      if (currentNode.children && currentNode.children[segment]) {
        currentNode = currentNode.children[segment];
      } else if (currentNode.children) {
        const dynamicNodeKey = Object.keys(currentNode.children).find((key) => {
          if (key === WILDCARD) return true;
          if (key.startsWith(":")) {
            const node = currentNode.children[key];
            if (node && node.route && node.route.regex) {
              return node.route.regex.test(segment);
            } else {
              return true;
            }
          }
          return false;
        });

        if (dynamicNodeKey) {
          const dynamicSegment: string = dynamicNodeKey.startsWith(":")
            ? dynamicNodeKey.substring(1)
            : dynamicNodeKey;
          params[dynamicSegment === WILDCARD ? "_slug" : dynamicSegment] =
            segment;
          currentNode = currentNode.children[dynamicNodeKey];
        } else {
          return [undefined, undefined];
        }
      } else {
        return [undefined, undefined];
      }
    }

    req.route.params = params;

    if (currentNode.route && currentNode.route.handlers) {
      const handlerOption =
        currentNode.route.handlers[req.method as Verbs] ||
        currentNode.route.handlers[WILDCARD];
      return [currentNode.route, handlerOption];
    }

    return [undefined, undefined];
  }

  private async executeMiddlewaresAndHandler(
    req: IncomingMessage,
    res: ServerResponse,
    route: Route,
    handler: HandlerOption,
  ): Promise<ServerResponse> {
    const routeMiddlewares: Middleware[] = route.middleware
      ? [].concat(route.middleware as never[])
      : [];
    const handlerMiddlewares: Middleware[] = handler.middleware
      ? [].concat(handler.middleware as never[])
      : [];
    const combinedMiddlewares: Middleware[] = [
      ...routeMiddlewares,
      ...handlerMiddlewares,
    ];

    const executeMiddleware = async (index: number) => {
      if (index < combinedMiddlewares.length) {
        const nextMiddleware = combinedMiddlewares[index];
        const next = () => executeMiddleware(index + 1);
        await nextMiddleware(req, res, next);
      } else {
        await handler.handler(req, res);
      }
    };

    await executeMiddleware(0);
    return res;
  }

  private handleCors(req: IncomingMessage, res: ServerResponse): void {
    const corsConfig = this.config.cors;
    if (!corsConfig) return;

    const origin = req.headers.origin || "";
    if (
      corsConfig.allowedOrigins &&
      (corsConfig.allowedOrigins.includes(WILDCARD) ||
        corsConfig.allowedOrigins.includes(origin))
    ) {
      res.setHeader("Access-Control-Allow-Origin", origin || WILDCARD);
    }

    if (corsConfig.allowedMethods) {
      res.setHeader(
        "Access-Control-Allow-Methods",
        corsConfig.allowedMethods.join(", "),
      );
    }

    if (corsConfig.allowedHeaders) {
      res.setHeader(
        "Access-Control-Allow-Headers",
        corsConfig.allowedHeaders.join(", "),
      );
    }

    if (corsConfig.allowCredentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
    }
  }

  start(callback?: () => any) {
    this.server = http.createServer(async (req, res) => {
      performance.mark("T0");
      Object.assign(res, resExt);
      this.handleCors(req as IncomingMessage, res as ServerResponse);
      return this.handleRequest(
        req as IncomingMessage,
        res as ServerResponse,
      ).then((res) => {
        performance.mark("T1");
        performance.measure("T[01]", "T0", "T1");
        const measure = performance.getEntriesByName("T[01]")[0];
        performance.clearMeasures("T[01]");
        if (this.config.app.logging)
          this.logger.log(
            `${req.method?.padStart(7, " ")} ${req.url} →`,
            res.statusCode,
            `(${measure.duration.toFixed(3)}ms)`,
          );
        return;
      });
    });
    this.server.listen(this.config.app.port, () =>
      callback ? callback() : void 0,
    );
  }
}
