// In-memory message queue for store-and-forward
// Maps recipient username -> array of pending messages
const pendingMessages = {};

/**
 * Queue a message for a recipient who is currently offline.
 * @param {string} to - recipient username
 * @param {string} from - sender username
 * @param {string} message - message content
 * @returns {object} the stored message object
 */
function enqueueMessage(to, from, message) {
  if (!pendingMessages[to]) {
    pendingMessages[to] = [];
  }
  const entry = {
    from,
    message,
    timestamp: Date.now(),
  };
  pendingMessages[to].push(entry);
  console.log(`[store-and-forward] Queued message for offline user "${to}" from "${from}"`);
  return entry;
}

/**
 * Retrieve and clear all pending messages for a recipient.
 * @param {string} user - the recipient username
 * @returns {Array} array of pending message objects (empty if none)
 */
function dequeueMessages(user) {
  const messages = pendingMessages[user] || [];
  delete pendingMessages[user];
  if (messages.length > 0) {
    console.log(`[store-and-forward] Delivering ${messages.length} pending message(s) to "${user}"`);
  }
  return messages;
}

/**
 * Peek at pending messages without removing them.
 * @param {string} user - the recipient username
 * @returns {Array} array of pending message objects (empty if none)
 */
function peekMessages(user) {
  return pendingMessages[user] || [];
}

/**
 * Get the count of pending messages for a user.
 * @param {string} user - the recipient username
 * @returns {number}
 */
function getPendingCount(user) {
  return (pendingMessages[user] || []).length;
}

module.exports = { enqueueMessage, dequeueMessages, peekMessages, getPendingCount };
