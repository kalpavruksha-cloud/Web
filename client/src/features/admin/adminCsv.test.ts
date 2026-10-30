import { afterEach, describe, expect, it, vi } from "vitest";
import { exportCsv } from "./adminUtils";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("admin financial CSV export", () => {
  it("escapes formula-like text without changing signed numeric amounts", async () => {
    let captured: Blob | undefined;
    const NativeUrl = URL;
    vi.stubGlobal("URL", class extends NativeUrl {
      static createObjectURL(blob: Blob) { captured = blob; return "blob:test-export"; }
      static revokeObjectURL = vi.fn();
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    exportCsv("payout-history.csv", [{ Name: '=HYPERLINK("bad")', Reference: "  +SUM(1,2)", Amount: -50, Notes: 'Quoted "reference"' }]);
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsText(captured!);
    });
    expect(content).toContain("'=HYPERLINK");
    expect(content).toContain("'  +SUM(1,2)");
    expect(content).toContain('"-50"');
    expect(content).toContain('"Quoted ""reference"""');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-export");
  });
});
