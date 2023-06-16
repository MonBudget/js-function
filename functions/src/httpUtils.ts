import {Request as FunctionHttpRequest} from "firebase-functions/v2/https";
import {ZodType, ZodError} from "zod";

export class ResponseError extends Error {
  private _responseCode: number;
  public get responseCode(): number {
    return this._responseCode;
  }
  private _details: any;
  public get details(): any {
    return this._details;
  }

  constructor(responseCode: number, message: string | undefined = undefined, details: any = undefined) {
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

export async function fetcheuh<T, B>(
  method: "POST" | "GET" | "DELETE",
  url: string | URL,
  bearerToken: string | undefined = undefined,
  body: URLSearchParams | B | undefined = undefined,
  responseSchema: ZodType<T>,
): Promise<T> {
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
  return handleJsonResponse(response, responseSchema);
}

async function handleJsonResponse<T>(
  response: Response,
  responseSchema: ZodType<T>,
): Promise<T> {
  const json = await response.json();
  if (!response.ok) {
    throw new ResponseError(500, `Http request error ${response.status}(${response.statusText}) for ${response.url}`, json);
  }
  try {
    return responseSchema.parse(json);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ResponseError(500, `Error during http response parsing for ${response.url}`, {json: json, errors: error.errors});
    }
    throw error;
  }
}
