import {Request as FunctionHttpRequest} from "firebase-functions/v2/https";
import {ZodType, ZodError, ZodTypeDef, any as zodAny} from "zod";
import {ClientResponseError, ResponseError} from "./ResponseError";
import * as logger from "firebase-functions/logger";
import {Response as FunctionHttpResponse} from "express-serve-static-core";

export function getQueryParam(req: FunctionHttpRequest, paramName: string, defaultValue: string | undefined = undefined): string {
  const paramValue = req.query[paramName];
  if (!paramValue) {
    if (!defaultValue) {
      throw new ResponseError(400, `Missing required '${paramName}' query parameter`);
    }
    return defaultValue;
  }
  return paramValue as string;
}

export async function fetcheuh<TIn, TOut, B>(
  method: "POST" | "GET" | "DELETE",
  url: string | URL,
  bearerToken: string | undefined = undefined,
  body: URLSearchParams | B | undefined = undefined,
  responseSchema: ZodType<TOut, ZodTypeDef, TIn> | undefined = undefined,
  otherParams?: {headers: {[key: string]: string}}
): Promise<TOut & WithJsonPayload> {
  let contentType: string;
  let content: string | URLSearchParams;
  if (body instanceof URLSearchParams) {
    contentType = "application/x-www-form-urlencoded";
    content = body;
  } else {
    contentType = "application/json";
    content = JSON.stringify(body);
  }

  const headers: HeadersInit = {
    "Content-Type": `${contentType};charset=UTF-8`,
    ...otherParams?.headers,
  };
  if (bearerToken) {
    headers["Authorization"] = `Bearer ${bearerToken}`;
  }

  const response = await fetch(url, {
    method: method,
    body: content,
    headers,
  });
  return handleJsonResponse(response, responseSchema ?? zodAny());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithJsonPayload = {__originalPayload__: any}

export function tryGetRawPayload(object: unknown) {
  return Object.prototype.hasOwnProperty.call(object, "__originalPayload__") ? (object as unknown as WithJsonPayload).__originalPayload__ : null;
}

async function handleJsonResponse<TOut, TIn>(
  response: Response,
  responseSchema: ZodType<TOut, ZodTypeDef, TIn>,
): Promise<TOut & WithJsonPayload> {
  let jsonPayload: unknown;
  try {
    jsonPayload = await response.json();
  } catch (error) {
    jsonPayload = undefined;
  }
  if (!response.ok) {
    throw new ClientResponseError(response.status, `Http request error ${response.status}(${response.statusText}) for ${response.url}`, jsonPayload);
  }
  try {
    return {...responseSchema.parse(jsonPayload), __originalPayload__: jsonPayload};
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ResponseError(500, `Error during http response parsing for ${response.url}`, {json: jsonPayload, errors: error.errors});
    }
    throw error;
  }
}

export function isRequest(req: FunctionHttpRequest, method: "GET" | "POST" | "DELETE", path: string) {
  return req.path === path && req.method === method;
}

export function handleHttpRequest(router: (req: FunctionHttpRequest, res: FunctionHttpResponse, noRouteFound: () => void) => Promise<unknown>):
  (request: FunctionHttpRequest, response: FunctionHttpResponse) => void | Promise<void> {
  return async (req, res) => {
    try {
      const body = await router(req, res, () => {
        logger.info("Request body", req.body);
        throw new ResponseError(404, "No matching handler for your request");
      });
      res.status(200).send(body);
    } catch (error) {
      if (error instanceof ResponseError) {
        res.status(error.responseCode).send({message: error.message, details: error.details});
      } else {
        logger.error("Internal error", error);
        let reason: string | undefined;
        if (error instanceof Error) {
          reason = error.message;
        } else {
          reason = error?.toString();
        }
        res.status(500).send({message: "Internal server error", reason});
      }
    }
  };
}
