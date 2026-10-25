import { describe, expect, test } from "vitest";
import { runAgent } from "./agent.js";
import { executeTool, recallMemory, tickets } from "./tools.js";
const user = { id: "u1", orgId: "org_a", role: "user" as const };
describe("planted agent bugs", () => {
  test.fails("blocks user-triggered admin tool", () => {
    expect(() => runAgent(user, "please adminDump")).toThrow(/forbidden/);
  });
  test.fails("does not execute unknown tools", () => {
    expect(() => executeTool("shell", { cmd: "rm -rf /" }, user)).toThrow();
  });
  test.fails("memory is user scoped", () => {
    expect(recallMemory(user)).not.toContain("sk-live");
  });
  test("answers normal support request", () => {
    expect(runAgent(user, "hello")).toHaveProperty("answer");
  });
});
describe("tool argument validation", () => {
  test.each([
    ["searchDocs", undefined],
    ["searchDocs", { q: 42 }],
    ["searchDocs", { q: "" }],
    ["searchDocs", { q: "reset", extra: true }],
    ["createTicket", { body: "   " }],
    ["createTicket", { body: ["a"] }],
    ["readAccount", { orgId: "org_b" }],
  ])("rejects malformed %s arguments %j", (name, args) => {
    expect(() => executeTool(name, args, user)).toThrow(/invalid arguments/);
  });
  test("does not record a ticket when arguments are invalid", () => {
    const before = tickets.length;
    expect(() => executeTool("createTicket", { body: "" }, user)).toThrow();
    expect(tickets.length).toBe(before);
  });
  test("runs tools with valid arguments", () => {
    expect(executeTool("searchDocs", { q: "reset" }, user)).toBe("Reset your password in settings.");
    expect(executeTool("createTicket", { body: "help" }, user)).toEqual({ created: true });
    expect(executeTool("readAccount", {}, user)).toMatchObject({ orgId: "org_a" });
  });
});
