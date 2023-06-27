import {Filter, initializeFirestore, FieldPath, Query, QueryDocumentSnapshot, BulkWriter} from "firebase-admin/firestore";
import {app} from "./app";
import {fromEvent, lastValueFrom} from "rxjs";
import {takeUntil, concatMap} from "rxjs/operators";

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

export async function removeDocumentsRecursively(query: Query, bulkWriter: BulkWriter) {
  const stream = streamData(query);
  await lastValueFrom(
    stream.pipe(concatMap((data) => recursiveDelete(data, bulkWriter))),
    {defaultValue: ""}
  );
}

export async function recursiveDelete(snapshot: QueryDocumentSnapshot, bulkWriter: BulkWriter) {
  for (const collectionToRemove of (await snapshot.ref.listCollections())) {
    await lastValueFrom(
      streamData(collectionToRemove).pipe(concatMap((data) => recursiveDelete(data, bulkWriter))),
      {defaultValue: ""}
    );
  }
  void bulkWriter.delete(snapshot.ref);
}

export function streamData(query: Query) {
  const stream = query.stream();
  return fromEvent(stream, "data", (data) => data as QueryDocumentSnapshot)
    .pipe(takeUntil(fromEvent(stream, "end")));
}
