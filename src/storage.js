/**
 * In-memory file registry mapping download tokens to stored file metadata.
 * Replace with a persistent store (DB, Redis) in production.
 */
const registry = new Map();

/**
 * @param {string} token  UUID issued at upload time
 * @param {{ storedName: string, originalName: string, mimeType: string }} meta
 */
function register(token, meta) {
  registry.set(token, meta);
}

/**
 * @param {string} token
 * @returns {{ storedName: string, originalName: string, mimeType: string } | undefined}
 */
function lookup(token) {
  return registry.get(token);
}

module.exports = { register, lookup };
