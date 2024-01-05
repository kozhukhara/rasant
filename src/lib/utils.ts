import {
  Header,
  IncomingMessage,
  ResContentOptions,
  ResFileOptions,
  ServerResponse,
} from "./types";
import { Options as UploadOptions } from "formidable";
import { parse } from "querystring";
import * as formidable from "formidable";
import { basename } from "path";
import { createReadStream } from "fs";

export const getParseBodyFunction = (options?: UploadOptions) => {
  return function parseBody(this: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const contentType = this.headers["content-type"];

      if (contentType === "application/json") {
        let body = "";
        this.on("data", (chunk) => (body += chunk));
        this.on("end", () => resolve(JSON.parse(body)));
      } else if (contentType === "application/x-www-form-urlencoded") {
        let body = "";
        this.on("data", (chunk) => (body += chunk));
        this.on("end", () => resolve(parse(body)));
      } else if (contentType && contentType.startsWith("multipart/form-data")) {
        const form = new formidable.IncomingForm(options);
        form.parse(this, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      } else {
        let body = "";
        this.on("data", (chunk) => (body += chunk));
        this.on("end", () => resolve(body));
      }
    });
  };
};

export const resExt: ServerResponse = <ServerResponse>{
  file(path: string, options?: ResFileOptions) {
    return new Promise<any>((resolve, reject) => {
      this.setHeader(
        "Content-Disposition",
        `${options?.disposition || "attachment"}; filename=${
          options?.filename || basename(path)
        }`,
      );
      const stream = createReadStream(path);
      stream.on("error", reject);
      stream.pipe(this);
      stream.on("end", resolve);
    });
  },

  setHeaders(headers: Header[]) {
    headers.forEach(({ name, value }) => {
      this.setHeader(name, value);
    });
    return this;
  },

  redirect(to: string) {
    this.writeHead(302, { Location: to });
    this.end();
    return this;
  },

  html(payload: string) {
    this.setHeader("Content-Type", "text/html");
    this.end(payload);
    return this;
  },

  json(payload: any) {
    this.setHeader("Content-Type", "application/json");
    this.end(JSON.stringify(payload));
    return this;
  },

  send(payload: string, options?: ResContentOptions) {
    this.setHeader(
      "Content-Type",
      `${options?.contentType || "text/plain"}; charset=${
        options?.encoding || "utf-8"
      }`,
    );
    this.end(payload);
    return this;
  },

  status(statusCode: number, statusMessage?: string) {
    this.statusCode = statusCode || 200;
    this.statusMessage = statusMessage || "OK";
    return this;
  },
};
