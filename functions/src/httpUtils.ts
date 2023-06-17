import {Request as FunctionHttpRequest} from "firebase-functions/v2/https";
import {ZodType, ZodError, ZodTypeDef, any as zodAny} from "zod";

export class ResponseError extends Error {
  private _responseCode: number;
  public get responseCode(): number {
    return this._responseCode;
  }
  private _details: unknown;
  public get details(): unknown {
    return this._details;
  }

  constructor(responseCode: number, message: string | undefined = undefined, details: unknown = undefined) {
    super(message);
    this._responseCode = responseCode;
    this._details = details;
  }
}

export class ResponseEntity<T> {
  private _responseCode: number;
  public get responseCode(): number {
    return this._responseCode;
  }

  private _body: T | undefined;
  public get body(): T | undefined {
    return this._body;
  }

  constructor(responseCode: number, body: T | undefined = undefined) {
    this._responseCode = responseCode;
    this._body = body;
  }
}

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
): Promise<TOut> {
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

async function handleJsonResponse<TOut, TIn>(
  response: Response,
  responseSchema: ZodType<TOut, ZodTypeDef, TIn>,
): Promise<TOut> {
  let jsonPayload: unknown;
  try {
    jsonPayload = await response.json();
  } catch (error) {
    jsonPayload = undefined;
  }
  if (!response.ok) {
    throw new ResponseError(500, `Http request error ${response.status}(${response.statusText}) for ${response.url}`, jsonPayload);
  }
  try {
    return responseSchema.parse(jsonPayload);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ResponseError(500, `Error during http response parsing for ${response.url}`, {json: jsonPayload, errors: error.errors});
    }
    throw error;
  }
}
