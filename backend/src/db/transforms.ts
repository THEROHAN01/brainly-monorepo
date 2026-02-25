/**
 * Transform a DB row's `id` to `_id` for MongoDB-compatible frontend responses.
 * The frontend expects `_id` on all objects (MongoDB convention).
 */
export function withMongoId<T extends { id: string }>(
  row: T
): Omit<T, "id"> & { _id: string } {
  const { id, ...rest } = row;
  return { _id: id, ...rest } as Omit<T, "id"> & { _id: string };
}
