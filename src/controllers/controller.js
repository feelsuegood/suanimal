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
  try {
    // * Fetch animal data
    const animalResponse = await axios.get(
      "https://api.api-ninjas.com/v1/animals",
      {
        params: { name },
        headers: {
          "X-Api-Key": X_API_KEY,
        },
      },
    );
    // res.json(animalResponse.data);
    // console.log(animalResponse.data[0]);

    // * Filter animals with scientific name
    const filteredAnimals = animalResponse.data.filter(
      (animal) => animal.taxonomy && animal.taxonomy.scientific_name,
    );
    // res.json(filteredAnimals);
    // console.log(filteredAnimals.length);
    // console.log(filteredAnimals.slice(0, 1));

    // * Fetch photo data and combine with animal data
    const animalDataWithImages = await Promise.all(
      filteredAnimals.map(async (animal) => {
        const flickrParams = {
          method: "flickr.photos.search",
          api_key: FLICKR_API_KEY,
          safe_search: 1,
          per_page: 1,
          sort: "relevance",
          format: "json",
          nojsoncallback: 1,
          media: "photos",
          text: animal.name,
        };
        const queryString = new URLSearchParams(flickrParams).toString();
        const flickrUrl = `https://api.flickr.com/services/rest?${queryString}`;
        console.log(animal.name);
        console.log(flickrUrl);
        // console.log(index + 1, "/", filteredAnimals.length);
        try {
          const flickrResponse = await fetch(flickrUrl);
          const filckrData = await flickrResponse.json();
          // res.json(filckrData);

          // array of photo data
          // _t.jpg: thumbnail
          const photoData = filckrData.photos.photo.map((photo) => ({
            animalName: animal.name,
            image: `http://farm${photo.farm}.static.flickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg`,
            url: `http://www.flickr.com/photos/${photo.owner}/${photo.id}`,
            title: photo.title,
          }));
          // console.log(photoData);
          return { ...animal, photoData: photoData[0] };
        } catch (error) {
          console.error(`Error fetching photo data for ${animal.name}:`, error);
          return { ...animal, photoData: null };
        }
      }),
    );
    // res.json(animalDataWithImages);
    res.render("animal", {
      pageTitle: `🐨 Search | Suanimal 🦘`,
      animalDataWithImages,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).render("error", {
      title: "🐨 Error: Nothing Found | Suanimal 🦘",
      message: "Nothing Found",
      description: "Error fetching data",
    });
  }
};

// * Feature page: show detail information about a specific animal with threat status
// threat status info: https://gbif.github.io/gbif-api/apidocs/org/gbif/api/vocabulary/ThreatStatus.html
const handleFeature = async (req, res, next) => {
  try {
    const animalName = req.query.name;
    const scientificName = req.query.sci_name;
    const locationString = req.query.location;
    const locationArray = locationString.split(",");

    // * fetch threat data
    const fetchThreatStatus = async (scientificName) => {
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
      // if threatData is null, assign "NO RESULT"
      if (threatData === null) {
        threatData = "NO RESULT";
      }
      return threatData;
    };
    const threatData = await fetchThreatStatus(scientificName);
    // res.json(threatData);

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
    // res.json(animalResponse.data);
    // console.log(animalResponse.data[0]);

    // * Filter animals with scientific name
    // const filteredAnimals = animalResponse.data.filter(
    //   (animal) =>
    //     animal.taxonomy && animal.taxonomy.scientific_name === scientificName,
    // );
    // res.json(filteredAnimals);
    // console.log(filteredAnimals.length);
    // console.log(filteredAnimals.slice(0, 1));

    // const featuredAnimal = filteredAnimals[0];
    // res.json(featuredAnimal);

    const featuredAnimal = animalResponse.data.find(
      (animal) =>
        animal.taxonomy && animal.taxonomy.scientific_name === scientificName,
    );

    // * Fetch Flickr photo data
    const flickrParams = {
      method: "flickr.photos.search",
      api_key: FLICKR_API_KEY,
      safe_search: 1,
      per_page: 1,
      sort: "relevance",
      format: "json",
      nojsoncallback: 1,
      media: "photos",
      text: featuredAnimal.name,
    };
    const queryString = new URLSearchParams(flickrParams).toString();
    const flickrUrl = `https://api.flickr.com/services/rest?${queryString}`;

    const flickrResponse = await fetch(flickrUrl);
    const filckrData = await flickrResponse.json();

    // array of photo data
    // _t.jpg: thumbnail
    const photoData = filckrData.photos.photo.map((photo) => ({
      animalName: featuredAnimal.name,
      image: `http://farm${photo.farm}.static.flickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg`,
      url: `http://www.flickr.com/photos/${photo.owner}/${photo.id}`,
      title: photo.title,
    }))[0];
    // res.json(photoData);

    // * Get news data for featured animal
    const newsOptions = {
      method: "GET",
      url: "https://news67.p.rapidapi.com/v2/topic-search",
      params: {
        languages: "en",
        search: featuredAnimal.name,
        batchSize: MAX_ITEM.toString(),
      },
      headers: {
        "X-RapidAPI-Key": process.env.X_RAPID_API_KEY,
        "X-RapidAPI-Host": "news67.p.rapidapi.com",
      },
    };
    const newsResponse = await axios.request(newsOptions);
    const newsData = newsResponse.data;
    // res.json(newsData);

    // * Render the page
    res.render("feature", {
      pageTitle: `🐨 Feature | Suanimal 🦘`,
      threatData: threatData.replace("_", " "),
      featuredAnimal,
      photoData,
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
