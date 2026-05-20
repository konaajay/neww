// A lightweight JS module that runs a fixed-interval job to simulate the backend scheduler for UI polling

let schedulerIntervalId = null;

/**
 * Starts the scheduler.
 * @param {Function} callbackFn - The function to call on each tick (e.g., fetchData(true)).
 * @param {number} intervalMs - The interval in milliseconds. Default is 5 minutes (300000ms).
 * @returns {number} The interval ID.
 */
export const startScheduler = (callbackFn, intervalMs = 300000) => {
  if (schedulerIntervalId) {
    console.warn("Scheduler is already running. Stop it first if you want to restart.");
    return schedulerIntervalId;
  }
  
  console.log(`Starting scheduler with interval ${intervalMs}ms`);
  schedulerIntervalId = setInterval(() => {
    console.log("Scheduler tick: fetching data to check for RETRY -> PROCESSING transitions");
    callbackFn();
  }, intervalMs);
  
  return schedulerIntervalId;
};

/**
 * Stops the scheduler.
 */
export const stopScheduler = () => {
  if (schedulerIntervalId) {
    clearInterval(schedulerIntervalId);
    schedulerIntervalId = null;
    console.log("Scheduler stopped.");
  }
};
