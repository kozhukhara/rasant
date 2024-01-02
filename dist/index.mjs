var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/lib/types.ts
var WILDCARD = "*";

// src/lib/utils.ts
import { parse } from "querystring";
import * as formidable from "formidable";
import { join, basename } from "path";
import { createReadStream } from "fs";
var timeDiff = (start, end) => end - start > 999 ? ((end - start) / 1e3).toFixed(3) : end - start + "ms";
function parseBody() {
  return new Promise((resolve, reject) => {
    const contentType = this.headers["content-type"];
    if (contentType === "application/json") {
      let body = "";
      this.on("data", (chunk) => body += chunk);
      this.on("end", () => resolve(JSON.parse(body)));
    } else if (contentType === "application/x-www-form-urlencoded") {
      let body = "";
      this.on("data", (chunk) => body += chunk);
      this.on("end", () => resolve(parse(body)));
    } else if (contentType && contentType.startsWith("multipart/form-data")) {
      const form = new formidable.IncomingForm({
        uploadDir: join(__dirname, "tmp"),
        keepExtensions: true
      });
      form.parse(this, (err, fields, files) => {
        if (err)
          return reject(err);
        resolve({ fields, files });
      });
    } else {
      let body = "";
      this.on("data", (chunk) => body += chunk);
      this.on("end", () => resolve(body));
    }
  });
}
var resExt = {
  file(path, options) {
    return new Promise((resolve, reject) => {
      this.setHeader(
        "Content-Disposition",
        `${(options == null ? void 0 : options.disposition) || "attachment"}; filename=${(options == null ? void 0 : options.filename) || basename(path)}`
      );
      const stream = createReadStream(path);
      stream.on("error", reject);
      stream.pipe(this);
      stream.on("end", resolve);
    });
  },
  setHeaders(headers) {
    headers.forEach(({ name, value }) => {
      this.setHeader(name, value);
    });
    return this;
  },
  redirect(to) {
    this.writeHead(302, { Location: to });
    this.end();
    return this;
  },
  html(payload) {
    this.setHeader("Content-Type", "text/html");
    this.end(payload);
    return this;
  },
  json(payload) {
    this.setHeader("Content-Type", "application/json");
    this.end(JSON.stringify(payload));
    return this;
  },
  send(payload, options) {
    this.setHeader(
      "Content-Type",
      `${(options == null ? void 0 : options.contentType) || "text/plain"}; charset=${(options == null ? void 0 : options.encoding) || "utf-8"}`
    );
    this.end(payload);
    return this;
  },
  status(statusCode, statusMessage) {
    this.statusCode = statusCode || 200;
    this.statusMessage = statusMessage || "OK";
    return this;
  }
};

// src/index.ts
import http from "http";
import { parse as parseUrl } from "url";
import { join as join2 } from "path";
import { createReadStream as createReadStream2, stat } from "fs";
var Rasant = class {
  constructor(config) {
    this.logger = {
      log: (...args) => console.log(`[${(/* @__PURE__ */ new Date()).toLocaleString()}]`, ...args)
    };
    this.config = config;
    this.routerTree = this.buildRadixTree(config.router);
  }
  buildRadixTree(routes) {
    let rootNode = {};
    const addRoute = (node, pathParts, route) => {
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
      let part = pathParts.shift();
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
  serveStaticFiles(req, res) {
    return __async(this, null, function* () {
      return new Promise((resolve, reject) => {
        if (!this.config.app.publicFolder)
          return resolve(false);
        const requestedPath = req.url || "/";
        let fullPath = join2(this.config.app.publicFolder, requestedPath);
        stat(fullPath, (err, stats) => {
          if (err) {
            return resolve(false);
          }
          if (stats.isDirectory()) {
            fullPath = join2(fullPath, "index.html");
          }
          stat(fullPath, (err2, stats2) => {
            if (err2 || !stats2.isFile()) {
              return resolve(false);
            }
            const stream = createReadStream2(fullPath).pipe(res);
            stream.on("finish", () => resolve(true));
          });
        });
      });
    });
  }
  handleRequest(req, res) {
    return __async(this, null, function* () {
      if (yield this.serveStaticFiles(req, res))
        return;
      const [route, handler] = this.findHandler(req);
      if (!route) {
        res.statusCode = 404;
        res.statusMessage = "Not Found";
        res.end("Not Found");
        return;
      }
      if (!handler) {
        res.statusCode = 405;
        res.statusMessage = "Method Not Allowed";
        res.end("Method Not Allowed");
        return;
      }
      if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        req.parseBody = parseBody;
      }
      yield this.executeMiddlewaresAndHandler(req, res, route, handler);
    });
  }
  findHandler(req) {
    var _a;
    req.route = {
      query: {},
      params: {}
    };
    req.method = (_a = req.method) == null ? void 0 : _a.toUpperCase();
    const parsedUrl = parseUrl(req.url || "", true);
    const pathSegments = (parsedUrl.pathname || "").split("/").filter((segment) => segment.length > 0);
    let currentNode = this.routerTree;
    let params = {};
    req.route.query = parsedUrl.query;
    for (const segment of pathSegments) {
      if (currentNode.children && currentNode.children[segment]) {
        currentNode = currentNode.children[segment];
      } else if (currentNode.children) {
        const dynamicNodeKey = Object.keys(currentNode.children).find((key) => {
          if (key === WILDCARD)
            return true;
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
          const dynamicSegment = dynamicNodeKey.startsWith(":") ? dynamicNodeKey.substring(1) : dynamicNodeKey;
          params[dynamicSegment === WILDCARD ? "_slug" : dynamicSegment] = segment;
          currentNode = currentNode.children[dynamicNodeKey];
        } else {
          return [void 0, void 0];
        }
      } else {
        return [void 0, void 0];
      }
    }
    req.route.params = params;
    if (currentNode.route && currentNode.route.handlers) {
      const handlerOption = currentNode.route.handlers[req.method] || currentNode.route.handlers[WILDCARD];
      return [currentNode.route, handlerOption];
    }
    return [void 0, void 0];
  }
  executeMiddlewaresAndHandler(req, res, route, handler) {
    return __async(this, null, function* () {
      const routeMiddlewares = route.middleware ? [].concat(route.middleware) : [];
      const handlerMiddlewares = handler.middleware ? [].concat(handler.middleware) : [];
      const combinedMiddlewares = [
        ...routeMiddlewares,
        ...handlerMiddlewares
      ];
      const executeMiddleware = (index) => __async(this, null, function* () {
        if (index < combinedMiddlewares.length) {
          const nextMiddleware = combinedMiddlewares[index];
          const next = () => executeMiddleware(index + 1);
          yield nextMiddleware(req, res, next);
        } else {
          yield handler.handler(req, res);
        }
      });
      yield executeMiddleware(0);
    });
  }
  handleCors(req, res) {
    const corsConfig = this.config.cors;
    if (!corsConfig)
      return;
    const origin = req.headers.origin || "";
    if (corsConfig.allowedOrigins && (corsConfig.allowedOrigins.includes(WILDCARD) || corsConfig.allowedOrigins.includes(origin))) {
      res.setHeader("Access-Control-Allow-Origin", origin || WILDCARD);
    }
    if (corsConfig.allowedMethods) {
      res.setHeader(
        "Access-Control-Allow-Methods",
        corsConfig.allowedMethods.join(", ")
      );
    }
    if (corsConfig.allowedHeaders) {
      res.setHeader(
        "Access-Control-Allow-Headers",
        corsConfig.allowedHeaders.join(", ")
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
  start(callback) {
    this.server = http.createServer((req, res) => __async(this, null, function* () {
      var _a;
      const time = Date.now();
      Object.assign(res, resExt);
      this.handleCors(req, res);
      yield this.handleRequest(req, res);
      return this.logger.log(
        `${(_a = req.method) == null ? void 0 : _a.padStart(7, " ")} ${req.url}`,
        timeDiff(time, Date.now())
      );
    }));
    this.server.listen(
      this.config.app.port,
      () => callback ? callback() : void 0
    );
  }
};
export {
  Rasant
};
//# sourceMappingURL=index.mjs.map