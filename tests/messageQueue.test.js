const { enqueueMessage, dequeueMessages, peekMessages, getPendingCount } = require("../src/store/messageQueue");

describe("messageQueue", () => {
  beforeEach(() => {
    // Clear the queue between tests by dequeuing everything
    dequeueMessages("testuser");
    dequeueMessages("alice");
    dequeueMessages("bob");
  });

  describe("enqueueMessage", () => {
    it("should queue a message for a user", () => {
      const entry = enqueueMessage("alice", "bob", "Hello Alice!");
      expect(entry).toHaveProperty("from", "bob");
      expect(entry).toHaveProperty("message", "Hello Alice!");
      expect(entry).toHaveProperty("timestamp");
      expect(typeof entry.timestamp).toBe("number");
    });

    it("should queue multiple messages for the same user", () => {
      enqueueMessage("alice", "bob", "Message 1");
      enqueueMessage("alice", "charlie", "Message 2");
      enqueueMessage("alice", "bob", "Message 3");
      expect(getPendingCount("alice")).toBe(3);
    });

    it("should queue messages for different users independently", () => {
      enqueueMessage("alice", "bob", "For Alice");
      enqueueMessage("bob", "alice", "For Bob");
      expect(getPendingCount("alice")).toBe(1);
      expect(getPendingCount("bob")).toBe(1);
    });
  });

  describe("dequeueMessages", () => {
    it("should return all pending messages and clear the queue", () => {
      enqueueMessage("alice", "bob", "Msg 1");
      enqueueMessage("alice", "charlie", "Msg 2");

      const messages = dequeueMessages("alice");
      expect(messages).toHaveLength(2);
      expect(messages[0].from).toBe("bob");
      expect(messages[0].message).toBe("Msg 1");
      expect(messages[1].from).toBe("charlie");
      expect(messages[1].message).toBe("Msg 2");

      // Queue should be empty now
      expect(getPendingCount("alice")).toBe(0);
      expect(dequeueMessages("alice")).toEqual([]);
    });

    it("should return empty array for user with no pending messages", () => {
      const messages = dequeueMessages("nonexistent");
      expect(messages).toEqual([]);
    });
  });

  describe("peekMessages", () => {
    it("should return pending messages without removing them", () => {
      enqueueMessage("alice", "bob", "Peek test");

      const peeked = peekMessages("alice");
      expect(peeked).toHaveLength(1);
      expect(peeked[0].message).toBe("Peek test");

      // Should still be there
      expect(getPendingCount("alice")).toBe(1);
    });

    it("should return empty array for user with no messages", () => {
      expect(peekMessages("nobody")).toEqual([]);
    });
  });

  describe("getPendingCount", () => {
    it("should return 0 for user with no messages", () => {
      expect(getPendingCount("nobody")).toBe(0);
    });

    it("should return correct count", () => {
      enqueueMessage("alice", "bob", "1");
      enqueueMessage("alice", "bob", "2");
      expect(getPendingCount("alice")).toBe(2);
    });
  });
});
