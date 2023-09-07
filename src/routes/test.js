const express = require("express");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const testRouter = express.Router();
const MAX_ITEM = 3;

/* GET test page. */
testRouter.get("/", async (req, res, next) => {
  try {
    // Get animal name and threat from GBIF API
    const { name } = req.query;
    // change threat to req.query or req.body or req.params
    const threat = "CRITICALLY_ENDANGERED";
    const gbifAPIUrl = `https://api.gbif.org/v1/species/search?q=${name}&threat=${threat}`;

    // Use Axios to make the GET request
    const gbifResponse = await axios.get(gbifAPIUrl);

    if (!gbifResponse.data) {
      throw new Error("Failed to fetch data from GBIF API");
    }

    const gbifData = gbifResponse.data.results[0];

    const nameData = gbifData.vernacularNames.map(({ vernacularName }) => ({
      name: vernacularName,
    }));

    const threatData = gbifData.threatStatuses.map((threat) => ({
      threat: threat.replace("_", " "),
    }));

    // Get animal pictures from Flickr API
    const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
    const flickrAPIUrl = `https://api.flickr.com/services/rest?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&tags=${name}&per-page=50&format=json&nojsoncallback=1&media=photos`;

    // Use Axios to make the GET request
    const flickrResponse = await axios.get(flickrAPIUrl);

    if (!flickrResponse.data) {
      throw new Error("Failed to fetch data from Flickr API");
    }

    const flickrData = flickrResponse.data.photos;

    const photoData = flickrData.photo.map((photo) => ({
      image: `http://farm${photo.farm}.static.flickr.com/${photo.server}/${photo.id}_${photo.secret}_t.jpg`,
      url: `http://www.flickr.com/photos/${photo.owner}/${photo.id}`,
      title: photo.title,
    }));

    // Data fetch test
    console.log(
      nameData.slice(0, MAX_ITEM),
      threatData.slice(0, MAX_ITEM),
      photoData.slice(0, MAX_ITEM)
    );

    // Lastly render test page, max number items pass
    res.render("test", {
      threatData: threatData.slice(0, MAX_ITEM),
      nameData: nameData.slice(0, MAX_ITEM),
      photoData: photoData.slice(0, MAX_ITEM),
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    const title = "Error: Nothing Found";
    res.status(500).render("error", {
      title,
      message: "Nothing Found",
      description: "Error fetching data",
    });
  }
});

module.exports = testRouter;
