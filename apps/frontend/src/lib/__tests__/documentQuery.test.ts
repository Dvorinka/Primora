import { describe, expect, it } from "vitest";
import type { Document } from "@primora/api-client";

import { documentQueryError, queryDocuments } from "../documentQuery";

const docs: Document[] = [
  {
    id: "doc-1",
    collection_id: "col-1",
    data: { title: "Hello Primora", status: "published", views: 1240, meta: { city: "Prague" } },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "doc-2",
    collection_id: "col-1",
    data: { title: "Draft: storage guide", status: "draft", views: 0 },
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  },
  {
    id: "doc-3",
    collection_id: "col-1",
    data: { title: "Untitled" },
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
];

function ids(filter: string, order: string): string[] {
  const result = queryDocuments(docs, filter, order);
  if ("error" in result) throw new Error(result.error);
  return result.items.map((doc) => doc.id);
}

describe("queryDocuments", () => {
  it("filters, orders, and rejects the same grammar the API documents", () => {
    expect(ids("status.eq.published", "")).toEqual(["doc-1"]);
    expect(ids("views.gt.100", "views.asc")).toEqual(["doc-1"]);
    expect(ids("status.in.draft|published", "title.asc")).toEqual(["doc-2", "doc-1"]);
    expect(ids("title.like.%GUIDE%", "")).toEqual(["doc-2"]);
    expect(ids("meta.city.eq.Prague", "")).toEqual(["doc-1"]);
    expect(ids("status.neq.published", "")).toEqual(["doc-2"]);
    expect(ids("status.is.null", "")).toEqual(["doc-3"]);
    expect(ids("", "")).toEqual(["doc-3", "doc-2", "doc-1"]);
    expect(ids("", "views.desc")[0]).toBe("doc-1");

    expect(documentQueryError("nope", "")).toMatch(/expected field.op.value/);
    expect(documentQueryError("views.gt.lots", "")).toMatch(/numeric value/);
    expect(documentQueryError("views.gt.", "")).toMatch(/numeric value/);
  });
});
