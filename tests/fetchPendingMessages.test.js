const { fetchPendingMessages } = require("../src/util/fetchPendingMessages");

// Mock cross-fetch
jest.mock("cross-fetch");
const fetch = require("cross-fetch");

// Mock seeds to control seed server list
jest.mock("../src/server/seeds", () => ({
  seeds: [
    { uri: "http://localhost:4000", user: "seed1" },
    { uri: "http://localhost:5000", user: "seed2" },
  ],
}));

describe("fetchPendingMessages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch and return messages from all seeds", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [{ id: "msg-1", from: "alice", message: "Hi", timestamp: 1000 }],
      }),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [{ id: "msg-2", from: "bob", message: "Hey", timestamp: 2000 }],
      }),
    });

    const messages = await fetchPendingMessages("charlie");

    expect(messages).toHaveLength(2);
    // Should be sorted by timestamp
    expect(messages[0].from).toBe("alice");
    expect(messages[1].from).toBe("bob");
  });

  it("should deduplicate messages with the same id stored on multiple seeds", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [
          { id: "msg-1", from: "alice", message: "Hi", timestamp: 1000 },
          { id: "msg-2", from: "bob", message: "Hey", timestamp: 2000 },
        ],
      }),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [
          { id: "msg-1", from: "alice", message: "Hi", timestamp: 1000 },
        ],
      }),
    });

    const messages = await fetchPendingMessages("charlie");

    // msg-1 appears on both seeds but should only be returned once
    expect(messages).toHaveLength(2);
    expect(messages.filter((m) => m.id === "msg-1")).toHaveLength(1);
  });

  it("should handle messages without an id (no dedup for legacy messages)", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [{ id: null, from: "alice", message: "Hi", timestamp: 1000 }],
      }),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [{ id: null, from: "alice", message: "Hi", timestamp: 1000 }],
      }),
    });

    const messages = await fetchPendingMessages("charlie");

    // Without an id, both messages are kept (cannot deduplicate)
    expect(messages).toHaveLength(2);
  });

  it("should return empty array when no seeds have messages", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    const messages = await fetchPendingMessages("charlie");

    expect(messages).toEqual([]);
  });

  it("should handle unreachable seeds gracefully", async () => {
    fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        messages: [{ id: "msg-1", from: "alice", message: "Hi", timestamp: 1000 }],
      }),
    });

    const messages = await fetchPendingMessages("charlie");

    expect(messages).toHaveLength(1);
    expect(messages[0].from).toBe("alice");
  });

  it("should include x-requesting-user header in requests", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    await fetchPendingMessages("charlie");

    for (const [, opts] of fetch.mock.calls) {
      expect(opts.headers["x-requesting-user"]).toBe("charlie");
    }
  });
});
