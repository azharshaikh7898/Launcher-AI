import { createApp } from "./app.js";
import { env } from "./lib/env.js";

createApp().listen(env.PORT, () => console.log(`LaunchBoard API listening on :${env.PORT}`));
