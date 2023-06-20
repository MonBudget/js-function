import * as logger from "firebase-functions/logger";
import {createUser} from "../tinkApi/user";
import {getAccessTokenFromScopes} from "../tinkApi/auth";
import {UserRecord} from "firebase-functions/v1/auth";
import {AuthBlockingEvent} from "firebase-functions/v2/identity";


const DEFAULT_MARKET = "FR";

export async function handleUserCreation(event: UserRecord) {
  logger.info(`Creating user ${event.uid}`, event);
  await createUser({
    externalUserId: event.uid,
    market: DEFAULT_MARKET,
    accessToken: await getAccessTokenFromScopes("user:create"),
  });
}

export async function handleBlockingUserCreation(event: AuthBlockingEvent) {
  logger.info(`(blocking) Creating user ${event.data.uid}`, event);
  await createUser({
    externalUserId: event.data.uid,
    market: event.locale && event.locale !== "und" ? event.locale : DEFAULT_MARKET,
    accessToken: await getAccessTokenFromScopes("user:create"),
  });
}
