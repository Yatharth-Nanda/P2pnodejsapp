const { Request, Response } = require("express");

async function message(req, res) {
  // console.log("bdoy", req.body);
  console.log(`${req.body.from}: ${req.body.message}`);
  res.json({ message: "success" });
}

module.exports = { message };
