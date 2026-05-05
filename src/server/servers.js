const { loadPeers, savePeers } = require("../store");

// Load persisted peers on module initialization
const servers = loadPeers();

function getAllNodes() {
  return [...servers];
}

function addNode(newnode) {
  // newnode is an object
  const existing = servers.find((node) => newnode.user === node.user);

  if (existing) {
    // Update URI if it has changed (e.g., peer restarted on a different port)
    if (existing.uri !== newnode.uri) {
      existing.uri = newnode.uri;
      savePeers(servers);
      console.log(`${newnode.user} updated uri to ${newnode.uri}`);
    }
    return;
  }
  servers.push(newnode);
  savePeers(servers);

  console.log(`${newnode.user} registered to uri ${newnode.uri}`);
}

function getnodebyuser(user) {
  //user is a string
  return servers.find((node) => node.user === user);
}

module.exports = { getAllNodes, addNode, getnodebyuser, servers };
