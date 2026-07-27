/// <reference path="../server/src/types/express.d.ts" />

import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/src/app.js";

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req, res);
}
