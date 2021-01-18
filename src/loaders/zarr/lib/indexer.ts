import { getDims } from '../../utils';

export function getIndexer<T extends string>(labels: T[]) {
  const size = labels.length;
  const dims = getDims(labels);
  return (sel: { [K in T]: number } | number[]) => {
    if (Array.isArray(sel)) {
      return sel;
    }
    const selection: number[] = Array(size).fill(0);
    for (const [key, value] of Object.entries(sel)) {
      selection[dims(key as T)] = value as number;
    }
    return selection;
  };
}