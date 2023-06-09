import {onDocumentCreated, onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {DocumentSnapshot} from "firebase-admin/firestore";
import {setGlobalOptions} from "firebase-functions/v2/options";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

setGlobalOptions({
  region: "europe-west1",
  concurrency: 1,
  minInstances: 0,
  maxInstances: 1,
  timeoutSeconds: 10,
  memory: "128MiB",
  cpu: 0.25,
});

export const makeuppercase1 = onDocumentCreated("/messages/{documentId}", (event) => {
  if (event.data) {
    return uppercase(event.data);
  }
  return null;
});
export const makeuppercase2 = onDocumentUpdated("/messages/{documentId}", (event) => {
  if (event.data?.after) {
    return uppercase(event.data.after);
  }
  return null;
});

function uppercase(snapshot: DocumentSnapshot) {
  const data = snapshot.data();
  if (!data) return;
  // Grab the current value of what was written to Firestore.
  const original = data.original;

  // Access the parameter `{documentId}` with `event.params`
  logger.log("Uppercasing", snapshot.id, original);

  const uppercase = original.toUpperCase();

  if (uppercase !== data.uppercase) {
    return snapshot.ref.set({uppercase}, {merge: true});
  }
  return null;
}
