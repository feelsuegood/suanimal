const express = require("express");
const {
  handleAnimal,
  handleAnimalSearch,
} = require("../controller/animalController");

const animalRouter = express.Router();

/* GET animal page. */
// animalRouter.get("/", handleAnimal);
animalRouter.get("/", handleAnimalSearch);
animalRouter.get("/threat", handleAnimal);

module.exports = animalRouter;
