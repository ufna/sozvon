// Telegram can throttle profile changes for hours. Keep polling and retry later.
export async function updateProfileField(fn, { schedule = setTimeout, warn = console.warn } = {}) {
 try {
  await fn();
 } catch (error) {
  const retryAfter = error.parameters?.retry_after;
  if (error.error_code === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
   warn(`[setup] profile update deferred for ${retryAfter}s`);
   const timer = schedule(() => updateProfileField(fn, { schedule, warn }), retryAfter * 1000 + 1000);
   timer.unref?.();
  } else {
   warn(`[setup] skipped (${error.error_code ?? error.message})`);
  }
 }
}
