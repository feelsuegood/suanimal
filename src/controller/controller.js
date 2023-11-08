const axios = require("axios");
const dotenv = require("dotenv");
const AWS = require("aws-sdk");

dotenv.config();

const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
const X_API_KEY = process.env.X_API_KEY;
const X_RAPID_API_KEY = process.env.X_RAPID_API_KEY;

const MAX_ITEM = 3;

// * index page
const handleHome = async (req, res) => {
  const pageTitle = "Suanimal";

  AWS.config.update({
    region: "ap-southeast-2",
  });

  // Now you can use AWS SDK services without specifying credentials explicitly
  const s3 = new AWS.S3();

  // Specify the S3 bucket and object key
  const bucketName = "suanimal-s3";
  const objectKey = "counter.json";

  // JSON data to be written to S3
  const jsonData = {
    counter: 0,
  };

  // Create the S3 bucket if it doesn't exist
  async function createS3bucket() {
    try {
      await s3.createBucket({ Bucket: bucketName }).promise();
      console.log(`Created bucket: ${bucketName}`);
    } catch (err) {
      if (err.statusCode === 409) {
        console.log(`Bucket already exists: ${bucketName}`);
      } else {
        console.log(`Error creating bucket: ${err}`);
      }
    }
  }

  // Upload the JSON data to S3 only if the object doesn't exist
  async function uploadJsonToS3() {
    const params = {
      Bucket: bucketName,
      Key: objectKey,
    };

    try {
      // Check if the object with the same key already exists
      await s3.headObject(params).promise();
      console.log(
        `Object with key ${objectKey} already exists in bucket ${bucketName}. Skip uploading.`
      );
    } catch (err) {
      if (err.statusCode === 404) {
        // Object doesn't exist, so upload it
        const uploadParams = {
          Bucket: bucketName,
          Key: objectKey,
          Body: JSON.stringify(jsonData), // Convert JSON to string
          ContentType: "application/json", // Set content type
        };
        await s3.putObject(uploadParams).promise();
        console.log("JSON file uploaded successfully.");
      } else {
        // Handle other errors
        console.error("Error checking object existence:", err);
      }
    }
  }

  // Retrieve the object from S3, increment counter, and upload it back
  async function getObjectAndUpdateCounter() {
    const params = {
      Bucket: bucketName,
      Key: objectKey,
    };

    try {
      const data = await s3.getObject(params).promise();
      // Parse JSON content
      const parsedData = JSON.parse(data.Body.toString("utf-8"));

      // Increment the counter
      parsedData.counter++;

      // Upload the updated JSON back to S3
      const updatedParams = {
        Bucket: bucketName,
        Key: objectKey,
        Body: JSON.stringify(parsedData), // Convert JSON to string
        ContentType: "application/json", // Set content type
      };

      await s3.putObject(updatedParams).promise();
      console.log("Updated JSON file with incremented counter:", parsedData);

      // Return the updated counter value
      return parsedData.counter;
    } catch (err) {
      console.error("Error:", err);
      // Return an error value or handle the error as needed
    }
  }

  // Call the create, upload, and update functions
  try {
    await createS3bucket();
    await uploadJsonToS3();
    const updatedCounter = await getObjectAndUpdateCounter();
    // Now you have the updated counter value
    console.log("Updated counter:", updatedCounter);

    // Render the response inside the try block
    res.render("index", { pageTitle, layout: false, counter: updatedCounter });
  } catch (err) {
    // Handle any errors that occur during the process
    console.error("Error:", err);
    res.status(500).send("Internal Server Error");
  }
};

// * animal page: show animal list and a user can choose a specific animal
const handleAnimal = async (req, res, next) => {
  const name = req.query.name;
  try {
    // animal API: get name, scientific name
    const animalResponse = await axios.get(
      "https://api.api-ninjas.com/v1/animals",
      {
        params: { name },
        headers: {
          "X-Api-Key": X_API_KEY,
        },
      }
    );
    if (animalResponse.status !== 200) {
      console.error(
        "Error from Animal API:",
        animalResponse.status,
        animalResponse.statusText
      );
      res.render("error", { error: "Error from Animal API" });
      return;
    }
    const searchedAnimal = animalResponse.data.filter(
      (animal) => animal.taxonomy && animal.taxonomy.scientific_name
    );

    // Flickr API
    const flickrAPIBaseUrl = `https://api.flickr.com/services/rest?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&safe_search=1&per_page=1&sort=relevance&format=json&nojsoncallback=1&media=photos`;
    const flickrAPIUrls = searchedAnimal.map((animal) => {
      const animalName = animal.taxonomy.scientific_name.toLowerCase();
      const flickrAPIUrl = `${flickrAPIBaseUrl}&text=${animalName}`;
      return flickrAPIUrl;
    });

    const flickrResponses = await Promise.all(
      flickrAPIUrls.map(async (url) => {
        const response = await axios.get(url);
        if (!response.data) {
          throw new Error("Failed to fetch data from Flickr API");
        }
        return response.data.photos;
      })
    );

    // _t.jpg: thumbnail
    const photoData = flickrResponses
      .map((flickrData) =>
        flickrData.photo.map((photo) => ({
          image: `http://farm${photo.farm}.static.flickr.com/${photo.server}/${photo.id}_${photo.secret}.jpg`,
          url: `http://www.flickr.com/photos/${photo.owner}/${photo.id}`,
          title: photo.title,
        }))
      )
      .flat();

    // combine photo data, scientific name 한개만 추출, 학명 없는애 거르기
    const animalData = searchedAnimal.map((animal, index) => ({
      ...animal,
      photoData: photoData[index],
      first_scientific_name: animal.taxonomy.scientific_name.split(", ")[0],
      locationString: animal.locations.join(","),
    }));
    console.log(animalData);
    res.render("animal", {
      pageTitle: `🐨 Search | Suanimal 🦘`,
      animalData,
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
      }
    );

    if (animalResponse.status !== 200) {
      console.error(
        "Error from Animal API:",
        animalResponse.status,
        animalResponse.statusText
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
