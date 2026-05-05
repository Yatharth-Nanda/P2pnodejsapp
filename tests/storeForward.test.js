const { storeMessage, getPendingMessages } = require("../src/routes/storeForward");

// Mock express req/res objects
function mockReq(body = {}, query = {}) {
  return { body, query };
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
  // Clear the message queue module between tests
  beforeEach(() => {
    // Reset the queue by requiring fresh
    const { dequeueMessages } = require("../src/store/messageQueue");
    dequeueMessages("alice");
    dequeueMessages("bob");
  });

  describe("POST /store-message", () => {
    it("should store a message and return 201", async () => {
      const req = mockReq({ to: "alice", from: "bob", message: "Hello!" });
      const res = mockRes();

      await storeMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      expect(res.body.status).toBe("queued");
      expect(res.body.timestamp).toBeDefined();
    });

    it("should return 400 if 'to' is missing", async () => {
      const req = mockReq({ from: "bob", message: "Hello!" });
      const res = mockRes();

      await storeMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.error).toContain("Missing required fields");
    });

    it("should return 400 if 'from' is missing", async () => {
      const req = mockReq({ to: "alice", message: "Hello!" });
      const res = mockRes();

      await storeMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should return 400 if 'message' is missing", async () => {
      const req = mockReq({ to: "alice", from: "bob" });
      const res = mockRes();

      await storeMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("GET /pending-messages", () => {
    it("should return pending messages and clear the queue", async () => {
      // First store a message
      const storeReq = mockReq({ to: "alice", from: "bob", message: "Stored msg" });
      const storeRes = mockRes();
      await storeMessage(storeReq, storeRes);

      // Now retrieve
      const getReq = mockReq({}, { user: "alice" });
      const getRes = mockRes();
      await getPendingMessages(getReq, getRes);

      expect(getRes.status).toHaveBeenCalledWith(200);
      expect(getRes.body.user).toBe("alice");
      expect(getRes.body.count).toBe(1);
      expect(getRes.body.messages[0].from).toBe("bob");
      expect(getRes.body.messages[0].message).toBe("Stored msg");

      // Retrieve again - should be empty
      const getReq2 = mockReq({}, { user: "alice" });
      const getRes2 = mockRes();
      await getPendingMessages(getReq2, getRes2);

      expect(getRes2.body.count).toBe(0);
      expect(getRes2.body.messages).toEqual([]);
    });

    it("should return 400 if user query param is missing", async () => {
      const req = mockReq({}, {});
      const res = mockRes();

      await getPendingMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.error).toContain("Missing required query parameter");
    });

    it("should return empty array for user with no pending messages", async () => {
      const req = mockReq({}, { user: "nobody" });
      const res = mockRes();

      await getPendingMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.count).toBe(0);
      expect(res.body.messages).toEqual([]);
    });
  });
});
