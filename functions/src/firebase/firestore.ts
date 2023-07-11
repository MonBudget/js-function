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
  const endcode = strFrontCode + String.fromCharCode(strEndCode.charCodeAt(0) + 1);

  return Filter.and(
    Filter.where(fieldPath, ">=", startcode),
    Filter.where(fieldPath, "<", endcode)
  );
}

export async function removeDocumentsRecursively(query: Query, bulkWriter: BulkWriter) {
  await forEachSnapshotAsync(
    query,
    (data) => recursiveDelete(data, bulkWriter)
  );
}

export async function forEachSnapshotAsync(query: Query, onEach: (doc: QueryDocumentSnapshot, bulkWriter: BulkWriter) => Promise<void>) {
  const stream = streamData(query);
  const bulkWriter = firestore.bulkWriter();
  await lastValueFrom(
    stream.pipe(concatMap((data) => onEach(data, bulkWriter))),
    {defaultValue: ""}
  );
  await bulkWriter.close();
}

async function recursiveDelete(snapshot: QueryDocumentSnapshot, bulkWriter: BulkWriter) {
  for (const collectionToRemove of (await snapshot.ref.listCollections())) {
    await forEachSnapshotAsync(
      collectionToRemove,
      (data) => recursiveDelete(data, bulkWriter)
    );
  }
  void bulkWriter.delete(snapshot.ref);
}

function streamData(query: Query) {
  const stream = query.stream();
  return fromEvent(stream, "data", (data) => data as QueryDocumentSnapshot)
    .pipe(takeUntil(fromEvent(stream, "end")));
}
