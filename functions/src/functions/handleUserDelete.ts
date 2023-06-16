import * as logger from "firebase-functions/logger";
import {deleteUser} from "../tinkApi/user";
import {getAccessTokenForUserId} from "../tinkApi/auth";
import {UserRecord} from "firebase-functions/v1/auth";


export async function handleUserDelete(event: UserRecord) {
  logger.info(`Deleting user ${event.uid}`, event);
  await deleteUser(await getAccessTokenForUserId(event.uid, "user:delete"));
}
