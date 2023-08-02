

export function getPastDate(daysToSubstract: number) {
  const date_ = Date.now();

  return new Date(date_ - 1000*60*60*24*daysToSubstract).toISOString().substring(0, 10);// get only xxxx-xx-xx
}

export function max(a: string, b: string) {
  const [, max] = [a, b].sort();
  return max;
}

export function min(a: string, b: string) {
  const [min] = [a, b].sort();
  return min;
}

