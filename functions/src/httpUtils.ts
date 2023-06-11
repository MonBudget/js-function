import {Request as FunctionHttpRequest} from "firebase-functions/v2/https";

export class ResponseError extends Error {
  private _responseCode: number;
  public get responseCode(): number {
    return this._responseCode;
  }

  constructor(responseCode: number, message: string) {
    super(message);
    this._responseCode = responseCode;
  }
}

export class ResponseEntity<T = any> {
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

export async function fetcheuh<T = any>(
  method: "POST" | "GET" | "DELETE",
  url: string,
  bearerToken: string | undefined = undefined,
  body: URLSearchParams | any | undefined = undefined
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
  return handleJsonResponse(response);
}

async function handleJsonResponse<T = any>(response: Response): Promise<T> {
  const json = await response.json();
  if (!response.ok) {
    throw new ResponseError(500, `Http request error for ${response.url}: ${json.errorMessage}`);
  }
  return json;
}
