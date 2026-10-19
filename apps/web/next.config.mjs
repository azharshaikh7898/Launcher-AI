const API_URL = process.env.API_URL ?? "http://localhost:4000";

// The browser only ever talks to the web app's own origin. Next forwards /api/* to the
// Express server, so the session cookie is first-party (no third-party cookie blocking).
export default {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};
