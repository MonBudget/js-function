import {initializeFirestore} from "firebase-admin/firestore";
import {app} from "./app";

export const firestore = initializeFirestore(app);
