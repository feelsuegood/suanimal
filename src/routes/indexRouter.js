const express = require("express");
const dotenv = require("dotenv");

const indexRouter = express.Router();
dotenv.config();
const homeController = (req, res) => {
  const title = "Welcome to Suanimal";
  console.log("hi");
  res.render("index", { title });
};
/* GET home page. */
indexRouter.get("/", homeController);

module.exports = indexRouter;
