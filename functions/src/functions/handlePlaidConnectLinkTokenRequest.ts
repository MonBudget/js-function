import {Request} from "firebase-functions/v2/https";
import {checkIdToken} from "../firebase/auth";
import {plaidClient} from "../plaidApi/plaidService";
import {CountryCode, Products} from "plaid";

export async function handlePlaidConnectLinkTokenRequest(req: Request) {
  const idToken = await checkIdToken(req);

  const result = await plaidClient.linkTokenCreate({client_name: "Budg'it",
    language: "fr",
    country_codes: [CountryCode.Fr],
    user: {
      client_user_id: idToken.uid,
    },
    products: [Products.Transactions],
    // redirect_uri: "app://budgit.com/connections/connect-callback", // configurable through PLAID_REDIRECT_URI
    webhook: "https://europe-west1-monbudget-2f616.cloudfunctions.net/onPlaidWebhook",
    android_package_name: "com.budgit.app.dev",
  });

  return {
    linkToken: result.data.link_token,
  };
}
