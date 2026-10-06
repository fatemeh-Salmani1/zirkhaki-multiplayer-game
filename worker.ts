import handler from "vinext/server/fetch-handler";
// Initialize the empty game database on its first API request. Existing rooms
// remain untouched. A failed initialization can be retried on the next request.
let initialized: Promise<unknown> | undefined;
export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    if (new URL(request.url).pathname === "/api/game") {
      initialized ??= env.DB.prepare("CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY NOT NULL, state TEXT NOT NULL, version INTEGER DEFAULT 0 NOT NULL, updated_at INTEGER NOT NULL)").run().catch(error => { initialized = undefined; throw error; });
      await initialized;
    }
    return handler.fetch(request, env, ctx);
  }
};
