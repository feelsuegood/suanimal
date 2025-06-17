const express = require("express");
const {
  handleAnimal,
  handleFeature,
  handleHabitat,
} = require("../controllers/controller");

const animalRouter = express.Router();

// GET /animal/*
animalRouter.get("/", handleAnimal);
animalRouter.get("/feature", handleFeature);
animalRouter.get("/habitat", handleHabitat);

module.exports = animalRouter;
