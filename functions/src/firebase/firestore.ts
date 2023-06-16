import {Filter, initializeFirestore, FieldPath} from "firebase-admin/firestore";
import {app} from "./app";

export const firestore = initializeFirestore(app);

export function startsWith(fieldPath: string | FieldPath, value: string) {
  const strlength = value.length;
  const strFrontCode = value.slice(0, strlength-1);
  const strEndCode = value.slice(strlength-1, value.length);

  const startcode = value;
  const endcode= strFrontCode + String.fromCharCode(strEndCode.charCodeAt(0) + 1);

  return Filter.and(
    Filter.where(fieldPath, ">=", startcode),
    Filter.where(fieldPath, "<", endcode)
  );
}
