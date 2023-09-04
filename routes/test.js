const express = require("express");
const router = express.Router();
require("dotenv").config();

/* GET test page. */
router.get("/", async function (req, res, next) {
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

    const nameData = [];
    const threatData = [];

    for (let i = 0; i < animals.vernacularNames.length; i++) {
      const name = animals.vernacularNames[i].vernacularName;
      nameData.push({ name });
    }
    // nameData Json: [
    //   { name: 'Southwest Bornean Orangutan' },
    //   { name: 'Central Bornean Orangutan' },
    //   { name: 'Southwest Bornean Orangutan' },
    //   { name: 'Central Bornean orangutan' }
    // ]
    // // 3번째 항목 호출
    // const thirdItem = data[2];

    // // 3번째 항목의 "name" 속성 출력
    // console.log(thirdItem.name);

    for (let i = 0; i < animals.threatStatuses.length; i++) {
      // eg. CRITICALLY ENDANGERED
      const threat = animals.threatStatuses[i].replace("_", " ");
      // eg. Critically endangered
      // animals.threatStatuses[i].charAt(0).toUpperCase() +
      // animals.threatStatuses[i].replace("_", " ").slice(1).toLowerCase();
      threatData.push({ threat });
    }
    // threatData Json: [ { threat: 'CRITICALLY ENDANGERED' } ]

    //Get animal pictures from Flickr API
    const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
    const flickrResponse = await fetch(
      `https://api.flickr.com/services/rest?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&tags=${name}&per-page=50&format=json&nojsoncallback=1&media=photos`
    );

    if (!flickrResponse.ok) {
      throw new Error("Failed to fetch data from Flickr API");
    }

    const flickrData = await flickrResponse.json();
    const photos = flickrData.photos;

    photoData = [];

    const photo = photos.photo[0];
    const image = `http://farm${photo.farm}.static.flickr.com/${photo.server}/${photo.id}_${photo.secret}_t.jpg`;
    const url = `http://www.flickr.com/photos/${photo.owner}/${photo.id}`;
    const title = photo.title;
    photoData.push({ image, url, title });
    //     phtoData Json: [
    //   {
    //     image: 'http://farm66.static.flickr.com/65535/53157185002_d060f17597_t.jpg',
    //     url: 'http://www.flickr.com/photos/62428675@N03/53157185002',
    //     title: 'Cell Service Orangutan'
    //   }
    // ]
    // "url" 속성 호출
    // const url = data[0].url;
    // "url" 값 출력
    // console.log(url);

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

module.exports = router;
