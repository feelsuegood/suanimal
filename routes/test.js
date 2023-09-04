const express = require("express");
const router = express.Router();
require("dotenv").config();

/* GET test page. */
router.get("/", async function (req, res, next) {
  try {
    console.log(req.query);
    const { name } = req.query;

    // console.log(req.body)
    // const name = req.body.name;
    const response = await fetch(
      `https://api.gbif.org/v1/species/search?q=${name}&threat=CRITICALLY_ENDANGERED`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch data from GBIF API");
    }

    const data = await response.json();
    const animals = data.results[0];

    const nameData = [];
    const threatData = [];

    for (let i = 0; i < animals.threatStatuses.length; i++) {
      // eg. CRITICALLY ENDANGERED
      const threat = animals.threatStatuses[i].replace("_", " ");
      // eg. Critically endangered
      // animals.threatStatuses[i].charAt(0).toUpperCase() +
      // animals.threatStatuses[i].replace("_", " ").slice(1).toLowerCase();
      threatData.push({ threat });
    }

    for (let i = 0; i < animals.vernacularNames.length; i++) {
      const name = animals.vernacularNames[i].vernacularName;
      nameData.push({ name });
    }

    console.log(nameData, threatData);
    res.render("test", { threatData, nameData });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Error fetching data from GBIF API");
  }
});

module.exports = router;
