import {Firestore} from "firebase-admin/firestore";
import {initializeApp as initializeFirebaseApp, apps as firebaseApps, firestore as getFirestore} from "firebase-admin";

export function firestore(): Firestore {
  // todo: cleaner way to really check if FirebaseApp exists admin.apps.findIndex((app) => app instanceof FirebaseApp)

  if (firebaseApps.length == 0) {
    console.log("Initializing firebase...");
    initializeFirebaseApp();
  }
  return getFirestore();
}
