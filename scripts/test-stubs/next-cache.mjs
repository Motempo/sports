// `unstable_cache` is a Next.js Data Cache adapter. Unit tests call the
// loader directly so they stay offline and do not need the Next runtime.

export function unstable_cache(callback) {
  return async (...args) => callback(...args);
}
