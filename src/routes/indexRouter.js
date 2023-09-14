const express = require("express");
const dotenv = require("dotenv");

const indexRouter = express.Router();

dotenv.config();

// separate later to controller
const handleHome = (req, res) => {
  const pageTitle = "Welcome to Suanimal";
  const year = new Date().getFullYear();

  // layout.hbs 안 쓰는 법
  res.render("index", { pageTitle, year, layout: false });
};
/* GET home page. */
indexRouter.get("/", handleHome);

module.exports = indexRouter;
