import type { User } from "./domain.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: User;
    }
  }
}

export {};
