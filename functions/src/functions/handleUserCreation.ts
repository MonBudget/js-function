import * as logger from "firebase-functions/logger";
import {createUser} from "../tinkApi/user";
import {getAccessTokenFromScopes} from "../tinkApi/auth";
import {AuthBlockingEvent} from "firebase-functions/v2/identity";
import {firestore} from "../firebase/firestore";
import {ClientResponseError} from "../shared/ResponseError";
import {ALLOW_ONE_TIME_ENV, DEFAULT_LOCALE, DEFAULT_MARKET} from "../vars";


export async function handleUserCreation(event: AuthBlockingEvent) {
  logger.info(`Creating user in tink ${event.data.uid}`, event);
  let market: string;
  let locale: string | undefined;
  // todo see Intl.Locale
  if (event.locale && /^[a-zA-Z]{2}-[a-zA-Z]{2}.*$/.test(event.locale)) {
    market = event.locale.substring(3, 4).toUpperCase();
    locale = `${event.locale.substring(0, 1).toLowerCase()}_${market}`;
  } else if (event.locale && /^[a-zA-Z]{2}$/.test(event.locale)) {
    market = event.locale.substring(0, 1).toUpperCase();
    locale = DEFAULT_LOCALE.value();
  } else {
    market = DEFAULT_MARKET.value();
    locale = DEFAULT_LOCALE.value();
  }
  logger.info(`Detected market ${market} and locale ${locale}`);
  let accessToken: string;
  try {
    accessToken = await getAccessTokenFromScopes("user:create");
  } catch (error) {
    if (error instanceof ClientResponseError) {
      if (error.responseCode === 401 && ALLOW_ONE_TIME_ENV.value()) {
        return;// ignore error and don't create tink user if one time connections allowed
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
  await createUser({
    externalUserId: event.data.uid,
    market: market,
    locale: locale,
    accessToken,
  });
  await firestore.collection("userProfiles").doc(event.data.uid).set({
    market,
    locale,
  }, {merge: true});
}
