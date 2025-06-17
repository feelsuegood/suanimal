const axios = require("axios");
const {
  createS3bucket,
  uploadJsonToS3,
  getObjectAndUpdateCounter,
} = require("../services/aws-s3");

const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
const X_API_KEY = process.env.X_API_KEY;
const X_RAPID_API_KEY = process.env.X_RAPID_API_KEY;

const MAX_ITEM = 3;

/**
 * Initialize counter in aws s3 bucket
 */
const initializeCounter = async () => {
  try {
    await createS3bucket();
    await uploadJsonToS3();
    //increase counter
    const updatedCounter = await getObjectAndUpdateCounter();
    console.log("📣 Updated counter:", updatedCounter);
    return updatedCounter;
  } catch (err) {
    console.error("❌ Error initializing counter:", err);
    return null;
  }
};

/**
 * index page
 */
const handleHome = async (req, res) => {
  try {
    const pageTitle = "🐨 Home | Suanimal 🦘";
    const updatedCounter = await initializeCounter();
    res.render("index", { pageTitle, layout: false, counter: updatedCounter });
  } catch (err) {
    console.error("❌ Error in handleHome:", err);
    // res.status(500).send("Internal Server Error");
    res.render("error", {
      pageTitle: "Error: Internal Server Error",
      layout: false,
      error: err.message,
    });
  }
};

/**
 * animal page: show animal list and a user can choose a specific animal
 */
const handleAnimal = async (req, res, next) => {
  const name = req.query.name;
  const animalResponse = await axios.get(
    "https://api.api-ninjas.com/v1/animals",
    {
      params: { name },
      headers: {
        "X-Api-Key": X_API_KEY,
      },
    },
  );
  // console.log("✅",animalResponse.data);
  if (animalResponse.status !== 200) {
    console.error(
      "Error from Animal API:",
      animalResponse.status,
      animalResponse.statusText,
    );
  }
  const animalResultList = animalResponse.data.filter(
    (animal) => animal.taxonomy && animal.taxonomy.scientific_name,
  );
  const animalName = searchedAnimal[0].taxonomy.scientific_name
    .toLowerCase()
    .split(" ")[0];
  console.log(animalName);

  // Flickr API
  const flickrParams = {
    method: "flickr.photos.search",
    api_key: FLICKR_API_KEY,
    safe_search: 1,
    per_page: 1,
    sort: "relevance",
    format: "json",
    nojsoncallback: 1,
    media: "photos",
  };

  const queryString = new URLSearchParams(flickrParams).toString();
  const flickrUrl = `https://api.flickr.com/services/rest?${queryString}&text=${animalName}`;
  // console.log("🔗 Flickr URL:", flickrUrl);

  // TODO: use map() later

  const flickrResponse = await fetch(flickrUrl);
  const data = await flickrResponse.json();
  //✅ console.log(data);

  // _t.jpg: thumbnail
  // array of photo data
  const photoData = data.photos.photo.map((photo) => ({
    animalName: animalName,
    image: `http://farm${photo.farm}.static.flickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg`,
    url: `http://www.flickr.com/photos/${photo.owner}/${photo.id}`,
    title: photo.title,
  }));
  // .flat();

  res.json(photoData);

  // combine photo data, scientific name
  // Extract only one, filter out those without scientific names
  const animalData = searchedAnimal.map((animal, index) => ({
    ...animal,
    photoData: photoData[index],
    first_scientific_name: animal.taxonomy.scientific_name.split(", ")[0],
    locationString: animal.locations.join(","),
  }));
  console.log(animalData);
  res.json(animalData);
  // res.render("animal", {
  //   pageTitle: `🐨 Search | Suanimal 🦘`,
  //   animalData,
  // });
  // } catch (error) {
  //   console.error("Error fetching data:", error);
  //   const title = "Error: Nothing Found";
  //   res.status(500).render("error", {
  //     title,
  //     message: "Nothing Found",
  //     description: "Error fetching data",
  //   });
  // }
};

// * Feature page: show detail information about a specific animal with threat status
// https://gbif.github.io/gbif-api/apidocs/org/gbif/api/vocabulary/ThreatStatus.html threat status info
const handleFeature = async (req, res, next) => {
  try {
    const animalName = req.query.name;
    const scientificName = req.query.sci_name;
    const locationString = req.query.location;
    const locationArray = locationString.split(",");

    // * fetch threat data
    async function fetchThreatStatus(scientificName) {
      const baseUrl = `https://api.gbif.org/v1/species/search?q=${scientificName}&nametype=SCIENTIFIC`;
      const threatTypes = [
        "EXTINCT",
        "EXTINCT_IN_THE_WILD",
        "CRITICALLY_ENDANGERED",
        "ENDANGERED",
        "VULNERABLE",
        "NEAR_THREATENED",
        "LEAST_CONCERN",
      ];

      let threatData = null;

      for (const threat of threatTypes) {
        const url = baseUrl + `&threat=${threat}`;
        console.log(url);

        const response = await axios.get(url);

        if (response.status !== 200) {
          throw new Error(`Error fetching data: ${response.status}`);
        }

        const data = response.data;

        if (data.count !== 0) {
          threatData = data.results[0].threatStatuses[0];
          break;
        }
      }

      // threatData가 null인 경우 "NO RESULT"를 할당합니다.
      if (threatData === null) {
        threatData = "NO RESULT";
      }

      return threatData;
    }
    // ! 1) threat Data
    const threatData = await fetchThreatStatus(scientificName);

    // * Fetch animal data
    const animalResponse = await axios.get(
      "https://api.api-ninjas.com/v1/animals",
      {
        params: { name: animalName },
        headers: {
          "X-Api-Key": X_API_KEY,
        },
      },
    );

    if (animalResponse.status !== 200) {
      console.error(
        "Error from Animal API:",
        animalResponse.status,
        animalResponse.statusText,
      );
      res.render("error", { error: "Error from Animal API" });
      return;
    }

    const featuredAnimal = animalResponse.data;

    // * Fetch Flickr photo data
    const flickrAPIBaseUrl = `https://api.flickr.com/services/rest?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&safe_search=1&per_page=1&sort=relevance&format=json&nojsoncallback=1&media=photos`;
    const animalNameLower =
      featuredAnimal[0].taxonomy.scientific_name.toLowerCase();
    const flickrAPIUrl = `${flickrAPIBaseUrl}&text=${animalNameLower}`;

    const response = await axios.get(flickrAPIUrl);

    if (!response.data) {
      throw new Error("Failed to fetch data from Flickr API");
    }

    // _t.jpg: thumbnail
    const photoData = response.data.photos.photo.map((photo) => ({
      image: `http://farm${photo.farm}.static.flickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg`,
      url: `http://www.flickr.com/photos/${photo.owner}/${photo.id}`,
      title: photo.title,
    }));

    // ! 2) animal Data with picture
    const animalData = featuredAnimal.map((animal, index) => ({
      ...animal,
      photoData: photoData[index],
      first_scientific_name: animal.taxonomy.scientific_name.split(", ")[0],
      locationString: animal.locations.join(","),
    }));

    // * Get news data
    const newsOptions = {
      method: "GET",
      url: "https://news67.p.rapidapi.com/v2/topic-search",
      params: {
        languages: "en",
        search: animalName,
        batchSize: MAX_ITEM.toString(),
      },
      headers: {
        "X-RapidAPI-Key": process.env.X_RAPID_API_KEY,
        "X-RapidAPI-Host": "news67.p.rapidapi.com",
      },
    };
    const newsResponse = await axios.request(newsOptions);

    // ! 3) news Data
    const newsData = newsResponse.data;

    // * Render the page
    res.render("feature", {
      pageTitle: `🐨 Feature | Suanimal 🦘`,
      animalData,
      threatData: threatData.replace("_", " "),
      newsData,
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
};

// https://rapidapi.com/meteostat/api/meteostat/ : climate api
// * Habitat page: show location information of each animal with map API and climate API
const handleHabitat = async (req, res, next) => {
  const animalName = req.query.name;
  const locationString = req.query.location.replace(/,/g, ", ");
  const locationArray = locationString.split(",");
  console.log(locationArray);
  try {
    // * get lon, lat info
    const geoPromises = locationArray.map((location) => {
      const geoOptions = {
        method: "GET",
        url: "https://forward-reverse-geocoding.p.rapidapi.com/v1/search",
        params: {
          q: location,
          "accept-language": "en",
          polygon_threshold: "0.0",
        },
        headers: {
          "X-RapidAPI-Key": X_RAPID_API_KEY,
          "X-RapidAPI-Host": "forward-reverse-geocoding.p.rapidapi.com",
        },
      };

      // Return the axios promise for this location
      return axios(geoOptions);
    });

    // Wait for all geoPromises to complete
    const geoResponses = await Promise.all(geoPromises);

    const geoData = geoResponses
      .map((response) => response.data)
      .map((subArray) => subArray[0]);

    const requests = geoData.map((data) => {
      const temOptions = {
        method: "GET",
        url: "https://meteostat.p.rapidapi.com/point/normals",
        params: {
          lat: data.lat,
          lon: data.lon,
          alt: "26",
          start: "1991",
          end: "2020",
        },
        headers: {
          "X-RapidAPI-Key": X_RAPID_API_KEY,
          "X-RapidAPI-Host": "meteostat.p.rapidapi.com",
        },
      };

      return axios.request(temOptions);
    });

    // Perform parallel requests and await the results
    const temResponses = await Promise.all(requests);
    const temData = temResponses.map((response, index) => {
      return {
        index: index,
        data: response.data.data,
      };
    });

    const combinedData = geoData.map((geo, index) => {
      return {
        index: index,
        location: locationArray[index],
        geo: geo,
        tem: temData[index],
      };
    });
    // * Render the page
    res.render("habitat", {
      pageTitle: `🐨 Habitat | Suanimal 🦘`,
      geoData,
      temData,
      combinedData,
      animalName,
      locationString,
      locationArray,
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
};

module.exports = { handleHome, handleAnimal, handleFeature, handleHabitat };
