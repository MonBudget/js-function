import {
  Filter,
  initializeFirestore,
  FieldPath,
  Query,
  QueryDocumentSnapshot,
  BulkWriter,
  DocumentReference,
} from "firebase-admin/firestore";
import {app} from "./app";
import {fromEvent, lastValueFrom} from "rxjs";
import {takeUntil, concatMap} from "rxjs/operators";

export const firestore = initializeFirestore(app);

export function startsWith(fieldPath: string | FieldPath, value: string) {
  const strlength = value.length;
  const strFrontCode = value.slice(0, strlength - 1);
  const strEndCode = value.slice(strlength - 1, value.length);

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
    (data) => recursiveDelete(data.ref, bulkWriter)
  );
}

export async function forEachSnapshotAsync(query: Query, onEach: (doc: QueryDocumentSnapshot) => Promise<void>) {
  const stream = streamData(query);
  await lastValueFrom(
    stream.pipe(concatMap(onEach)),
    {defaultValue: ""}
  );
}

export async function recursiveDelete(ref: DocumentReference, bulkWriter: BulkWriter) {
  for (const collectionToRemove of (await ref.listCollections())) {
    await forEachSnapshotAsync(
      collectionToRemove,
      (data) => recursiveDelete(data.ref, bulkWriter)
    );
  }
  void bulkWriter.delete(ref);
}

function streamData(query: Query) {
  const stream = query.stream();
  return fromEvent(stream, "data", (data) => data as QueryDocumentSnapshot)
    .pipe(takeUntil(fromEvent(stream, "end")));
}
