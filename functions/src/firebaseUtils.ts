import {initializeFirestore} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";

export const firestore = initializeFirestore(initializeApp());
