import {fetcheuh} from "../shared/httpUtils";
import * as zod from "zod";
import {getTinkClientId} from "../vars";


const CreateUserResponseSchema = zod.object({
  user_id: zod.string(),
  external_user_id: zod.string(),
});

const CreateAnonymousUserResponseSchema = zod.object({
  user: zod.object({id: zod.string()}),
  access_token: zod.string(),
});

export function createUser(params: {externalUserId: string, market: string, locale?: string, accessToken: string}) {
  return fetcheuh("POST", "https://api.tink.com/api/v1/user/create", params.accessToken, {
    market: params.market,
    locale: params.locale, // detected from market if undefined
    external_user_id: params.externalUserId,
  }, CreateUserResponseSchema);
}

export function createAnonymousUser(params: {market: string, locale?: string}) {
  return fetcheuh("POST", "https://api.tink.com/api/v1/user/anonymous", undefined, {
    market: params.market,
    locale: params.locale, // detected from market if undefined
  }, CreateAnonymousUserResponseSchema, {
    headers: {
      "x-tink-oauth-client-id": getTinkClientId(),
    },
  });
}

export function deleteUser(accessToken: string) {
  return fetcheuh("POST", "https://api.tink.com/api/v1/user/delete", accessToken);
}

const GetUserProfileResponseSchema = zod.object({
  locale: zod.string(),
  market: zod.string(),
  timeZone: zod.string(),
});

export function getTinkUserProfile(accessToken: string) {
  return fetcheuh("GET", "https://api.tink.com/api/v1/user/profile", accessToken, undefined, GetUserProfileResponseSchema);
}
