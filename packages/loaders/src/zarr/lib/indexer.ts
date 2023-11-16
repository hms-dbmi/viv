/**
 * The 'indexer' for a Zarr-based source translates
 * a 'selection' to an array of indices that align to
 * the labeled dimensions.
 *
 * > const labels = ['a', 'b', 'y', 'x'];
 * > const indexer = getIndexer(labels);
 * > console.log(indexer({ a: 10, b: 20 }));
 * > // [10, 20, 0, 0]
 */
export function getIndexer<T extends string>(labels: T[]) {
  const labelSet = new Set(labels);
  if (labelSet.size !== labels.length) {
    throw new Error('Labels must be unique');
  }
  return (sel: { [K in T]: number } | number[]) => {
    if (Array.isArray(sel)) {
      return [...sel];
    }
    const selection: number[] = Array(labels.length).fill(0);
    for (const [key, value] of Object.entries(sel)) {
      const index = labels.indexOf(key as T);
      if (index === -1) {
        throw new Error(`Invalid indexer key: ${key}`);
      }
      selection[index] = value as number;
    }
    return selection;
  };
}
