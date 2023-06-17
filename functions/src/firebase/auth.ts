import {getAuth} from "firebase-admin/auth";
import {app} from "./app";
import {Request as FunctionHttpRequest} from "firebase-functions/v2/https";
import {ResponseError} from "../httpUtils";

export const auth = getAuth(app);

export async function getIdToken(req: FunctionHttpRequest) {
  const authorization = req.headers.authorization;
  if (authorization && authorization.startsWith("Bearer ")) {
    const idToken = authorization.substring(7);
    try {
      return await auth.verifyIdToken(idToken, true);
    } catch (error) {
      throw new ResponseError(401, "Unauthorized", error);
    }
  } else {
    throw new ResponseError(401, "Unauthorized");
  }
}
