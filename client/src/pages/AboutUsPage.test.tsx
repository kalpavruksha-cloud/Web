import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AboutUsPage } from "./AboutUsPage";

afterEach(cleanup);

const logos = [
  ["Kalpavruksha Wealth", "group-kalpavruksha-wealth"],
  ["Kalpavruksha Real Estate", "group-kalpavruksha-real-estate"],
  ["KV Constructions", "kv-constructions-logo"],
  ["Kalpavruksha Developers", "group-kalpavruksha-developers"],
  ["Rudraksh Enterprises", "group-rudraksh-enterprises"],
  ["Brindavan Resto", "group-brindavan-resto"]
] as const;

describe("About Us company logo contrast", () => {
  it("keeps the six original company logos, without duplicates or replacements", () => {
    render(<AboutUsPage />);
    expect(screen.getAllByRole("img")).toHaveLength(6);
    for (const [company, asset] of logos) {
      const logo = screen.getByRole("img", { name: `${company} logo` });
      expect(logo.getAttribute("src")).toContain(asset);
      expect(logo).toHaveClass("object-contain");
    }
  });

  it("adds a white edge and shadow while retaining each dark logo background", () => {
    render(<AboutUsPage />);
    for (const logo of screen.getAllByRole("img")) {
      expect(logo.className).toContain("drop-shadow(0_0_1px_rgba(255,255,255,0.95))");
      expect(logo.className).toContain("drop-shadow(0_0_4px_rgba(255,255,255,0.65))");
      expect(logo.parentElement!.className).toContain("#040b1d,#08152f_54%,#0b2f25");
    }
  });
});
