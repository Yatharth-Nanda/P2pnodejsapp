const { addNode } = require("../server/servers"); // used destrcutured imports for functions
function register(req, res) {
  const { user, uri } = req.body;

  try {
    addNode({ user, uri });
  } catch (err) {
    console.log(err);
  }

  res.json({ message: "success is here " });
}

module.exports = { register };
