function getCurrentUri() {
  return `http://localhost:${process.env.PORT}`;
}

module.exports = { getCurrentUri };
