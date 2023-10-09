import {defineSecret, defineBoolean, defineInt, defineString} from "firebase-functions/params";


export const MAX_PAST_DAYS_TO_FETCH = defineInt("MAX_PAST_DAYS_TO_FETCH", {
  default: 90,
  description: "The maximum number of days of bank transactions to fetch",
});
export const BYPASS_TINK_EVENT_SIGNATURE = defineBoolean("BYPASS_TINK_EVENT_SIGNATURE", {
  default: true,
  description: "Indicates if the tink signature is stopping the function (false) or not (true) when the function receives a call through the webhook endpoint",
});
export const BYPASS_TINK_EVENT_SIGNATURE_LOCAL_ONLY = defineBoolean("BYPASS_TINK_EVENT_SIGNATURE_LOCAL_ONLY", {
  default: true,
  description: "Same as BYPASS_TINK_EVENT_SIGNATURE, but will only be effective on local machine (with 127.0.0.1 address)",
});

// must be in form of tink_id:tink_secret
export const TINK_KEYS = defineSecret("TINK_KEYS");
// dev "dcaf323e1ac841da84760a80cd64ad19:915757c3beb64024849231a559546d2c";
// prod "9e17101be81f4558b90f62870c869cf9:3074dd7702f446a085fd6e954f6e17c5";
export function getTinkClientId() {
  return TINK_KEYS.value().split(":")[0];
}
export function getTinkClientSecret() {
  return TINK_KEYS.value().split(":")[1];
}

// must be in form of tink_id:tink_secret
export const PLAID_KEYS = defineSecret("PLAID_KEYS");
// dev budgit "development:6511a3640d705f001be7b6cf:770ef167beedc71363fd946ba6d85f";
// dev personal use "dev:6383630bd3d18400133510e1:743440b9b50a26b47b400bf170978e";
export function getPlaidEnv() {
  return PLAID_KEYS.value().split(":")[0];
}
export function getPlaidClientId() {
  return PLAID_KEYS.value().split(":")[1];
}
export function getPlaidClientSecret() {
  return PLAID_KEYS.value().split(":")[2];
}

export const DEFAULT_MARKET = defineString("DEFAULT_MARKET", {
  default: "FR",
  input: {
    select: {
      options: [
        {
          value: "FR",
        },
      ],
    },
  },
});
export const DEFAULT_LOCALE = defineString("DEFAULT_LOCALE", {
  default: "fr_FR",
  input: {
    select: {
      options: [
        {
          value: "fr_FR",
        },
        {
          value: "en_US",
        },
      ],
    },
  },
});

export const ALLOW_ONE_TIME_ENV = defineBoolean("ALLOW_ONE_TIME_ENV", {
  default: true,
  description: "Indicates if the tink env can be long term and one-time/anonymous (true) or just long term (false)",
});
