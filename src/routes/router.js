const express = require("express");
const Router = express.Router();
const {
  handleHome,
  handleAnimal,
  handleFeature,
  handleHabitat,
} = require("../controller/controller");

/* GET home page. */
Router.get("/", handleHome);
/* GET animal page. */
// animalRouter.get("/", handleAnimal);
Router.get("/animal", handleAnimal);
Router.get("/animal/feature", handleFeature);
Router.get("/animal/habitat", handleHabitat);

module.exports = Router;
