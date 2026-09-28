import { describe, expect, it } from "vitest";

import { applySlugField, slugify } from "../slug";

describe("slugify", () => {
  it("derives lowercase hyphenated slugs", () => {
    expect(slugify("TDvorak")).toBe("tdvorak");
    expect(slugify("Acme Corporation")).toBe("acme-corporation");
    expect(slugify("  My_App!! v2  ")).toBe("my-app-v2");
  });

  it("strips accents and non-ascii characters", () => {
    expect(slugify("Zürich — Héllo")).toBe("zurich-hello");
    expect(slugify("日本語")).toBe("");
  });
});

describe("applySlugField", () => {
  const form = { name: "", slug: "", description: "" };

  it("fills the slug while it is untouched", () => {
    const next = applySlugField(form, "name", "My Org");
    expect(next.slug).toBe("my-org");
    // keeps following name edits
    expect(applySlugField(next, "name", "Renamed Org").slug).toBe("renamed-org");
  });

  it("stops deriving once the slug was hand-edited", () => {
    const custom = applySlugField(applySlugField(form, "name", "My Org"), "slug", "custom-slug");
    expect(applySlugField(custom, "name", "New Name").slug).toBe("custom-slug");
  });

  it("resumes deriving if the slug is cleared", () => {
    const cleared = applySlugField(applySlugField(form, "name", "My Org"), "slug", "");
    expect(applySlugField(cleared, "name", "Other").slug).toBe("other");
  });

  it("sanitizes manual slug edits", () => {
    expect(applySlugField(form, "slug", "Not A Slug!").slug).toBe("not-a-slug");
  });

  it("passes through unrelated fields", () => {
    expect(applySlugField(form, "description", "hi").description).toBe("hi");
  });
});
