export { assert, assertUsage };

function assert(condition: unknown, debugInfo?: unknown): asserts condition {
  if (condition) return;

  const debugStr = (() => {
    if (!debugInfo) {
      return null;
    }
    const debugInfoSerialized =
      typeof debugInfo === 'string' ? debugInfo : JSON.stringify(debugInfo);
    return `Debug info (for vite-plugin-standalone maintainers; you can ignore this): ${debugInfoSerialized}`;
  })();

  let errMsg = [
    `You stumbled upon a bug in vite-plugin-standalone's source code.`,
    `Go to https://github.com/nitedani/vite-plugin-standalone and copy-paste this error.`,
    debugStr,
  ]
    .filter(Boolean)
    .join(' ');

  throw new Error(errMsg);
}

function assertUsage(condition: unknown, message: unknown): asserts condition {
  if (condition) return;
  throw new Error(`Wrong usage: ${message}`);
}
