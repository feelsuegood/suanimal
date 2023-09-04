const express = require("express");
const router = express.Router();
require("dotenv").config();

/* GET home page. */
router.get("/", function (req, res) {
  const title = "Welcome to Suanimal";
  res.render("index", { title });
});

module.exports = router;
