"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Rasant: () => Rasant
});
module.exports = __toCommonJS(src_exports);

// src/lib/types.ts
var WILDCARD = "*";

// src/lib/utils.ts
var import_querystring = require("querystring");
var formidable = __toESM(require("formidable"));
var import_path = require("path");
var import_fs = require("fs");
var getParseBodyFunction = (options) => {
  return function parseBody() {
    return new Promise((resolve, reject) => {
      const contentType = this.headers["content-type"];
      if (contentType === "application/json") {
        let body = "";
        this.on("data", (chunk) => body += chunk);
        this.on("end", () => resolve(JSON.parse(body)));
      } else if (contentType === "application/x-www-form-urlencoded") {
        let body = "";
        this.on("data", (chunk) => body += chunk);
        this.on("end", () => resolve((0, import_querystring.parse)(body)));
      } else if (contentType && contentType.startsWith("multipart/form-data")) {
        const form = new formidable.IncomingForm(options);
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
  };
};
var resExt = {
  file(path, options) {
    return new Promise((resolve, reject) => {
      this.setHeader(
        "Content-Disposition",
        `${(options == null ? void 0 : options.disposition) || "attachment"}; filename=${(options == null ? void 0 : options.filename) || (0, import_path.basename)(path)}`
      );
      const stream = (0, import_fs.createReadStream)(path);
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
var import_http = __toESM(require("http"));
var import_url = require("url");
var import_path2 = require("path");
var import_fs2 = require("fs");
var import_perf_hooks = require("perf_hooks");
var Rasant = class {
  constructor(config) {
    this.logger = {
      log: (...args) => console.log(`[${(/* @__PURE__ */ new Date()).toLocaleString()}]`, ...args)
    };
    this.config = config;
    this.routerTree = this.buildRadixTree(config.router || []);
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
      return new Promise((resolve) => {
        if (!this.config.app.publicFolder)
          return resolve(false);
        const requestedPath = req.url || "/";
        let fullPath = (0, import_path2.join)(this.config.app.publicFolder, requestedPath);
        (0, import_fs2.stat)(fullPath, (err, stats) => {
          if (err) {
            return resolve(false);
          }
          if (stats.isDirectory()) {
            fullPath = (0, import_path2.join)(fullPath, "index.html");
          }
          (0, import_fs2.stat)(fullPath, (err2, stats2) => {
            if (err2 || !stats2.isFile()) {
              return resolve(false);
            }
            const stream = (0, import_fs2.createReadStream)(fullPath).pipe(res);
            stream.on("finish", () => resolve(true));
          });
        });
      });
    });
  }
  handleRequest(req, res) {
    return __async(this, null, function* () {
      if (yield this.serveStaticFiles(req, res))
        return res;
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
      if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
        req.parseBody = getParseBodyFunction(this.config.uploads);
      }
      return this.executeMiddlewaresAndHandler(req, res, route, handler);
    });
  }
  findHandler(req) {
    var _a;
    req.route = {
      query: {},
      params: {}
    };
    req.method = (_a = req.method) == null ? void 0 : _a.toUpperCase();
    const parsedUrl = (0, import_url.parse)(req.url || "", true);
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
      return res;
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
    this.server = import_http.default.createServer((req, res) => __async(this, null, function* () {
      import_perf_hooks.performance.mark("T0");
      Object.assign(res, resExt);
      this.handleCors(req, res);
      return this.handleRequest(
        req,
        res
      ).then((res2) => {
        var _a;
        import_perf_hooks.performance.mark("T1");
        import_perf_hooks.performance.measure("T[01]", "T0", "T1");
        const measure = import_perf_hooks.performance.getEntriesByName("T[01]")[0];
        import_perf_hooks.performance.clearMeasures("T[01]");
        if (this.config.app.logging)
          this.logger.log(
            `${(_a = req.method) == null ? void 0 : _a.padStart(7, " ")} ${req.url} \u2192`,
            res2.statusCode,
            `(${measure.duration.toFixed(3)}ms)`
          );
        return;
      });
    }));
    this.server.listen(
      this.config.app.port,
      () => callback ? callback() : void 0
    );
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Rasant
});
//# sourceMappingURL=index.js.map