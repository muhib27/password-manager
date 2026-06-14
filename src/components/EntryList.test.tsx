import { describe, expect, it } from "vitest";
import { filterEntries } from "../lib/filterEntries";
import type { Entry } from "../lib/ipc";

const sample: Entry[] = [
  {
    id: "1",
    title: "GitHub",
    username: "dev",
    password: "secret",
    url: "https://github.com",
    notes: "work account",
  },
  {
    id: "2",
    title: "Bank",
    username: "personal",
    password: "secret2",
    url: "https://bank.example",
    notes: "savings",
  },
];

describe("filterEntries", () => {
  it("returns all entries for an empty query", () => {
    expect(filterEntries(sample, "")).toHaveLength(2);
  });

  it("matches substrings across fields", () => {
    expect(filterEntries(sample, "work")).toHaveLength(1);
    expect(filterEntries(sample, "bank")).toHaveLength(1);
  });
});
