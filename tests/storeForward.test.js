const { storeMessage, getPendingMessages } = require("../src/routes/storeForward");
const { clearAllMessages } = require("../src/store/messageQueue");

// Mock express req/res objects
function mockReq(body = {}, query = {}, headers = {}) {
  return { body, query, headers };
}

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((data) => {
    res.body = data;
    return res;
  });
  return res;
}

describe("storeForward routes", () => {
  beforeEach(() => {
    clearAllMessages();
  });

  describe("POST /store-message", () => {
    it("should store a message and return 201", () => {
      const req = mockReq({ to: "alice", from: "bob", message: "Hello!" });
      const res = mockRes();

      storeMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      expect(res.body.status).toBe("queued");
      expect(res.body.timestamp).toBeDefined();
    });

    it("should store a message with a messageId", () => {
      const req = mockReq({ to: "alice", from: "bob", message: "Hello!", messageId: "msg-123" });
      const res = mockRes();

      storeMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body.status).toBe("queued");
    });

    it.each([
      ["to", { from: "bob", message: "Hello!" }],
      ["from", { to: "alice", message: "Hello!" }],
      ["message", { to: "alice", from: "bob" }],
    ])("should return 400 if '%s' is missing", (_field, body) => {
      const req = mockReq(body);
      const res = mockRes();

      storeMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.error).toContain("Missing required fields");
    });
  });

  describe("GET /pending-messages", () => {
    it("should return pending messages and clear the queue", () => {
      // First store a message
      const storeReq = mockReq({ to: "alice", from: "bob", message: "Stored msg" });
      const storeRes = mockRes();
      storeMessage(storeReq, storeRes);

      // Now retrieve with proper auth header
      const getReq = mockReq({}, { user: "alice" }, { "x-requesting-user": "alice" });
      const getRes = mockRes();
      getPendingMessages(getReq, getRes);

      expect(getRes.status).toHaveBeenCalledWith(200);
      expect(getRes.body.user).toBe("alice");
      expect(getRes.body.count).toBe(1);
      expect(getRes.body.messages[0].from).toBe("bob");
      expect(getRes.body.messages[0].message).toBe("Stored msg");

      // Retrieve again - should be empty
      const getReq2 = mockReq({}, { user: "alice" }, { "x-requesting-user": "alice" });
      const getRes2 = mockRes();
      getPendingMessages(getReq2, getRes2);

      expect(getRes2.body.count).toBe(0);
      expect(getRes2.body.messages).toEqual([]);
    });

    it("should return 400 if user query param is missing", () => {
      const req = mockReq({}, {}, {});
      const res = mockRes();

      getPendingMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.error).toContain("Missing required query parameter");
    });

    it("should return 403 if x-requesting-user header is missing", () => {
      const req = mockReq({}, { user: "alice" }, {});
      const res = mockRes();

      getPendingMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain("Forbidden");
    });

    it("should return 403 if x-requesting-user does not match requested user", () => {
      // Store a message for alice
      const storeReq = mockReq({ to: "alice", from: "bob", message: "Secret" });
      const storeRes = mockRes();
      storeMessage(storeReq, storeRes);

      // Eve tries to read alice's messages
      const req = mockReq({}, { user: "alice" }, { "x-requesting-user": "eve" });
      const res = mockRes();

      getPendingMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.body.error).toContain("Forbidden");
    });

    it("should return empty array for user with no pending messages", () => {
      const req = mockReq({}, { user: "nobody" }, { "x-requesting-user": "nobody" });
      const res = mockRes();

      getPendingMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.count).toBe(0);
      expect(res.body.messages).toEqual([]);
    });
  });
});
