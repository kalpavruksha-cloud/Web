import { describe, expect, it } from "vitest";
import { analyzeSchema, buildHeaderMap } from "../src/services/spreadsheetMapper.js";

describe("spreadsheet mapper", () => {
  it("matches client id header variations", () => {
    const map = buildHeaderMap(["CLIENT_ID", "Full Name"], { clientId: ["Client ID", "clientId", "client_id"], fullName: ["Full Name"] });
    expect(map.get("clientId")).toBe("CLIENT_ID");
    expect(map.get("fullName")).toBe("Full Name");
  });

  it("reports unresolved and missing columns", () => {
    const schema = analyzeSchema({
      spreadsheetId: "sheet",
      sheets: [{ name: "Investment", headers: ["Investment ID", "Mystery Column"], recordCount: 1 }],
      warnings: []
    });
    const investment = schema.warnings.find((warning) => warning.sheet === "Investment");
    expect(investment?.missingRequiredColumns).toContain("clientId");
    expect(investment?.unresolvedColumns).toContain("Mystery Column");
  });
});
