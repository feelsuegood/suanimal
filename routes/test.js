import express from "express";
import dotenv from "dotenv";

dotenv.config();

const testRouter = express.Router();

/* GET test page. */
testRouter.get("/", async (req, res, next) => {
  try {
    // Get animal name and threat from GBIF API
    const { name } = req.query;
    const gbifAPIUrl = `https://api.gbif.org/v1/species/search?q=${name}&threat=CRITICALLY_ENDANGERED`;
    const gbifResponse = await fetch(gbifAPIUrl);

    if (!gbifResponse.ok) {
      throw new Error("Failed to fetch data from GBIF API");
    }

    const gbifData = await gbifResponse.json();

    const animals = gbifData.results[0];

    const nameData = animals.vernacularNames.map(({ vernacularName }) => ({
      name: vernacularName,
    }));

    const threatData = animals.threatStatuses.map((threat) => ({
      threat: threat.replace("_", " "),
    }));

    // Get animal pictures from Flickr API
    const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
    const flickrResponse = await fetch(
      `https://api.flickr.com/services/rest?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&tags=${name}&per-page=50&format=json&nojsoncallback=1&media=photos`
    );

    if (!flickrResponse.ok) {
      throw new Error("Failed to fetch data from Flickr API");
    }

    const flickrData = await flickrResponse.json();
    const photos = flickrData.photos;

    const photoData = photos.photo.map((photo) => ({
      image: `http://farm${photo.farm}.static.flickr.com/${photo.server}/${photo.id}_${photo.secret}_t.jpg`,
      url: `http://www.flickr.com/photos/${photo.owner}/${photo.id}`,
      title: photo.title,
    }));

    // Data fetch test
    console.log(nameData, threatData, photoData);

    // Lastly render test page
    res.render("test", { threatData, nameData, photoData });
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

export default testRouter;
