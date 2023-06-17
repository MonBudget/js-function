import {fetcheuh} from "../httpUtils";
import * as zod from "zod";


const CreateUserResponseSchema = zod.object({
  user_id: zod.string(),
  external_user_id: zod.string(),
});

export function createUser(params: {externalUserId: string, market: string, accessToken: string}) {
  return fetcheuh("POST", "https://api.tink.com/api/v1/user/create", params.accessToken, {
    market: params.market,
    // locale: detected from market
    external_user_id: params.externalUserId,
  }, CreateUserResponseSchema);
}

export function deleteUser(accessToken: string) {
  return fetcheuh("POST", "https://api.tink.com/api/v1/user/delete", accessToken);
}

const GetUserProfileResponseSchema = zod.object({
  locale: zod.string(),
  market: zod.string(),
  timeZone: zod.string(),
});

export function getUserProfile(accessToken: string) {
  return fetcheuh("GET", "https://api.tink.com/api/v1/user/profile", accessToken, undefined, GetUserProfileResponseSchema);
}