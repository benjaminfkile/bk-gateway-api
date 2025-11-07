/**
 * Returns a random jittered delay (in milliseconds)
 * within the given percentage or range.
 *
 * @param baseMs - The base interval (in ms)
 * @param jitterRatio - Fraction of jitter to apply (default 0.2 = ±20%)
 * @returns A randomized interval (in ms)
 */
export function addJitter(baseMs: number, jitterRatio = 0.2): number {
  const jitter = baseMs * jitterRatio;
  const min = baseMs - jitter;
  const max = baseMs + jitter;
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Waits for a randomized delay (useful for staggering startup tasks)
 *
 * @param baseMs - The base delay (in ms)
 * @param jitterRatio - Fraction of jitter to apply (default 0.2 = ±20%)
 * @returns A promise that resolves after the jittered delay
 */
export async function sleepWithJitter(baseMs: number, jitterRatio = 0.2): Promise<void> {
  const delay = addJitter(baseMs, jitterRatio);
  return new Promise((resolve) => setTimeout(resolve, delay));
}
