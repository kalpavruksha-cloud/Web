import type { Request, Response } from "express";
import { appsScriptService } from "../services/appsScriptService.js";
import type { PortalAd } from "../types/domain.js";

export async function ads(req: Request, res: Response) {
  const placement = typeof req.query.placement === "string" ? req.query.placement : "";
  const result = await appsScriptService.action<PortalAd[]>(
    "getAds",
    { placement },
    req.requestId,
    "GET",
    true
  );
  res.status(result.success ? 200 : 502).json(result);
}
