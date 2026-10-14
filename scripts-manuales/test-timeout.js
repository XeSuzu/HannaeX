const { performance } = require("node:perf_hooks");

const delays = [2147483647, 2419200000, 2147483648];
const MAX_DELAY = 2147483647;

function scheduleAndMeasure(delay) {
  const startedAt = performance.now();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        requested: delay,
        effective: timer._idleTimeout,
        elapsed: performance.now() - startedAt,
        method: "callback wall time",
      });
    }, delay);

    // The safe maximum would remain pending for about 24.8 days.
    // Read the effective scheduled delay and cancel it immediately.
    if (delay === MAX_DELAY) {
      const effective = timer._idleTimeout;
      clearTimeout(timer);
      resolve({
        requested: delay,
        effective,
        elapsed: null,
        method: "Timeout._idleTimeout; canceled before callback",
      });
    }
  });
}

(async () => {
  for (const delay of delays) {
    const result = await scheduleAndMeasure(delay);
    console.log(JSON.stringify(result));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
