const express = require("express");
const { handleHome } = require("../controllers/controller");
const rootRouter = express.Router();

rootRouter.get("/", handleHome);

module.exports = rootRouter;
