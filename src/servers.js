const servers = []; //every seed server has its own copy of this ?

function getAllNodes() {
  return [...servers];
}

function addNode(newnode) {
  // newnode is an object
  const isalreadyadded = servers.find((node) => newnode.user === node.user);

  if (isalreadyadded) return; // truthy value
  servers.push(newnode);

  console.log(`${newnode.user} registered to uri ${newnode.uri}`);
}

function getnodebyuser(user) {
  //user is a string
  return servers.find((node) => node.user === user);
}

module.exports = { getAllNodes, addNode, getnodebyuser, servers }; //remove server import later
