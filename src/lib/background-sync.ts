/**
 * Utility for running asynchronous background tasks in Next.js Server Actions / Node.js runtime.
 * Executes tasks without blocking the immediate HTTP response to the client.
 */
export function runInBackground(taskName: string, asyncFn: () => Promise<void>): void {
  // Use setImmediate to defer execution to the next tick of the event loop,
  // allowing the current Server Action response to return immediately to the browser.
  setImmediate(async () => {
    try {
      await asyncFn();
    } catch (error) {
      console.error(`[Background Sync Error] "${taskName}":`, error);
    }
  });
}
