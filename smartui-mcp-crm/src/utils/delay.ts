/** Simulates a network delay — used in mock/offline mode only. */
export function delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
}
