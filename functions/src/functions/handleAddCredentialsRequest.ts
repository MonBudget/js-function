import {Request} from "firebase-functions/v2/https";
import {getIdToken} from "../firebase/auth";
import {getQueryParam} from "../shared/httpUtils";
import {saveCredentials} from "../services/credentialsService";


export async function handleAddCredentialsRequest(req: Request) {
  const decodedIdToken = await getIdToken(req);

  await saveCredentials({
    userId: decodedIdToken.uid,
    credentialsId: getQueryParam(req, "credentialsId"),
  });
}
