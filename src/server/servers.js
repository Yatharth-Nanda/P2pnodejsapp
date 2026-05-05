const { loadPeers, savePeers } = require("../store");

// Load persisted peers on module initialization
const servers = loadPeers();

function getAllNodes() {
  return [...servers];
}

function addNode(newnode) {
  // newnode is an object
  const isalreadyadded = servers.find((node) => newnode.user === node.user);

  if (isalreadyadded) return; // truthy value
  servers.push(newnode);
  savePeers(servers);

  console.log(`${newnode.user} registered to uri ${newnode.uri}`);
}

function getnodebyuser(user) {
  //user is a string
  return servers.find((node) => node.user === user);
}

module.exports = { getAllNodes, addNode, getnodebyuser, servers };
