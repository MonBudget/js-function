
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

export class ClientResponseError extends Error {
  private _responseCode: number;
  public get responseCode(): number {
    return this._responseCode;
  }
  private _body: unknown;
  public get body(): unknown {
    return this._body;
  }

  constructor(responseCode: number, message: string | undefined = undefined, body: unknown = undefined) {
    super(message);
    this._responseCode = responseCode;
    this._body = body;
  }
}

