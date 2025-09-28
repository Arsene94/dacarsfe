/**
 * No-op runtime shim used to bypass Next.js' baseline polyfills when we only
 * target modern evergreen browsers.
 *
 * By aliasing the framework polyfill entrypoint to this module we prevent the
 * legacy helpers for features such as `Array.prototype.flat` or
 * `Object.fromEntries` from being bundled, shrinking the hydration payload.
 */
export {};
