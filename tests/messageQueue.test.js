const { enqueueMessage, dequeueMessages, clearAllMessages } = require("../src/store/messageQueue");

describe("messageQueue", () => {
  beforeEach(() => {
    clearAllMessages();
  });

  describe("enqueueMessage", () => {
    it("should queue a message for a user", () => {
      const entry = enqueueMessage("alice", "bob", "Hello Alice!");
      expect(entry).toHaveProperty("from", "bob");
      expect(entry).toHaveProperty("message", "Hello Alice!");
      expect(entry).toHaveProperty("timestamp");
      expect(typeof entry.timestamp).toBe("number");
    });

    it("should include the messageId when provided", () => {
      const entry = enqueueMessage("alice", "bob", "Hello!", "msg-123");
      expect(entry.id).toBe("msg-123");
    });

    it("should set id to null when no messageId is provided", () => {
      const entry = enqueueMessage("alice", "bob", "Hello!");
      expect(entry.id).toBeNull();
    });

    it("should queue multiple messages for the same user", () => {
      enqueueMessage("alice", "bob", "Message 1");
      enqueueMessage("alice", "charlie", "Message 2");
      enqueueMessage("alice", "bob", "Message 3");
      const messages = dequeueMessages("alice");
      expect(messages).toHaveLength(3);
    });

    it("should queue messages for different users independently", () => {
      enqueueMessage("alice", "bob", "For Alice");
      enqueueMessage("bob", "alice", "For Bob");
      expect(dequeueMessages("alice")).toHaveLength(1);
      expect(dequeueMessages("bob")).toHaveLength(1);
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
      expect(dequeueMessages("alice")).toEqual([]);
    });

    it("should return empty array for user with no pending messages", () => {
      const messages = dequeueMessages("nonexistent");
      expect(messages).toEqual([]);
    });
  });

  describe("clearAllMessages", () => {
    it("should clear all messages for all users", () => {
      enqueueMessage("alice", "bob", "Msg 1");
      enqueueMessage("bob", "alice", "Msg 2");

      clearAllMessages();

      expect(dequeueMessages("alice")).toEqual([]);
      expect(dequeueMessages("bob")).toEqual([]);
    });
  });
});
