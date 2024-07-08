const { seeds } = require("../seeds"); // dont need .js extension here

function getRandomSeedServer() {
  return seeds[Math.floor(Math.random() * seeds.length)];
}

module.exports = { getRandomSeedServer };
