const { sendMessage } = require("../src/util/sendMessage");

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

describe("sendMessage with store-and-forward", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should deliver directly when recipient is online", async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ message: "success" }) });

    const result = await sendMessage("bob", "Hello!", "http://localhost:3001", "alice");

    expect(result.status).toBe("delivered");
    expect(result.uri).toBe("http://localhost:3001");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("http://localhost:3001/message", expect.any(Object));
  });

  it("should fall back to store-and-forward when recipient is offline", async () => {
    // Direct send fails
    fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    // Store on seed1 succeeds
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "queued" }) });
    // Store on seed2 succeeds
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "queued" }) });

    const result = await sendMessage("bob", "Hello!", "http://localhost:3001", "alice");

    expect(result.status).toBe("queued");
    expect(result.storedOn).toContain("http://localhost:4000");
    expect(result.storedOn).toContain("http://localhost:5000");
    // 1 direct attempt + 2 seed store attempts
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("should store on available seeds even if some are unreachable", async () => {
    // Direct send fails
    fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    // Store on seed1 fails
    fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    // Store on seed2 succeeds
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "queued" }) });

    const result = await sendMessage("bob", "Hello!", "http://localhost:3001", "alice");

    expect(result.status).toBe("queued");
    expect(result.storedOn).toEqual(["http://localhost:5000"]);
  });

  it("should throw if recipient is offline and no seed servers are reachable", async () => {
    // Direct send fails
    fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    // Both seeds fail
    fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(
      sendMessage("bob", "Hello!", "http://localhost:3001", "alice")
    ).rejects.toThrow("no seed servers are reachable");
  });

  it("should throw if recipient is offline and no toUser provided", async () => {
    fetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(
      sendMessage("bob", "Hello!", "http://localhost:3001")
    ).rejects.toThrow("no username provided for store-and-forward");
  });

  it("should fall back to store-and-forward on non-OK response from recipient", async () => {
    // Recipient returns 500
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });
    // Store on seeds succeeds
    fetch.mockResolvedValueOnce({ ok: true });
    fetch.mockResolvedValueOnce({ ok: true });

    const result = await sendMessage("bob", "Hello!", "http://localhost:3001", "alice");

    expect(result.status).toBe("queued");
  });
});
