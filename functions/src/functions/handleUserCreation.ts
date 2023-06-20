import * as logger from "firebase-functions/logger";
import {createUser} from "../tinkApi/user";
import {getAccessTokenFromScopes} from "../tinkApi/auth";
import {AuthBlockingEvent} from "firebase-functions/v2/identity";


const DEFAULT_MARKET = "FR";

export async function handleUserCreation(event: AuthBlockingEvent) {
  logger.info(`Creating user in tink ${event.data.uid}`, event);
  let market: string;
  let locale: string | undefined;
  if (event.locale && /^[a-zA-Z]{2}-[a-zA-Z]{2}.*$/.test(event.locale)) {
    market = event.locale.substring(3, 4).toUpperCase();
    locale = `${event.locale.substring(0, 1).toLowerCase()}_${market}`;
  } else if (event.locale && /^[a-zA-Z]{2}$/.test(event.locale)) {
    market = event.locale.substring(0, 1).toUpperCase();
    locale = undefined;
  } else {
    market = DEFAULT_MARKET;
    locale = undefined;
  }
  logger.info(`Detected market ${market} and locale ${locale}`);
  await createUser({
    externalUserId: event.data.uid,
    market: market,
    locale: locale,
    accessToken: await getAccessTokenFromScopes("user:create"),
  });
}
