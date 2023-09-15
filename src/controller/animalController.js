// * https://rapidapi.com/meteostat/api/meteostat/ : temperature api

const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
const X_API_KEY = process.env.X_API_KEY;
const X_RAPID_API_KEY = process.env.X_RAPID_API_KEY;
const MAPBOX_API_KEY = process.env.MAPBOX_API_KEY;

// https://gbif.github.io/gbif-api/apidocs/org/gbif/api/vocabulary/ThreatStatus.html threat status info
//       nameData.slice(0, MAX_ITEM), array 자르는 명령어

// 먼저 동물 이름을 검색하게 하고 맞는 이름을 선택하면 그 학명과 정보들을 상세 페이지로 넘기자.
// 맨 처음에 가져올 것은 동물의 이름과 사진 학명 위험상태 가져오자
const handleAnimalSearch = async (req, res, next) => {
  const { name } = req.query;

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

    // _t: thumbnail
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

// * Animal Detail page
const handleAnimal = async (req, res, next) => {
  const scientificName = req.query.name;
  const locationString = req.query.location;
  const locationArray = locationString.split(",");
  // .map((item) => item.trim());

  console.log("Name:", scientificName);
  console.log("🦕 Location Array:", locationArray);

  // in case there are so many result use max item number
  const MAX_ITEM = 3;

  // get animal data
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

  // * get threat status data
  async function fetchThreatStatus(scientificName) {
    const baseUrl = `https://api.gbif.org/v1/species/search?q=${scientificName}&nametype=SCIENTIFIC`;
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
    // scientificName을 사용합니다.
    return {
      scientific_name: scientificName,
      threatStatuses: threatData,
    };
  }

  // * get lon, lat info
  // const geoPromises = locationArray.map((location) => {
  //   const geoOptions = {
  //     method: "GET",
  //     url: "https://forward-reverse-geocoding.p.rapidapi.com/v1/search",
  //     params: {
  //       q: location,
  //       "accept-language": "en",
  //       polygon_threshold: "0.0",
  //     },
  //     headers: {
  //       "X-RapidAPI-Key": X_RAPID_API_KEY,
  //       "X-RapidAPI-Host": "forward-reverse-geocoding.p.rapidapi.com",
  //     },
  //   };

  //   // Return the axios promise for this location
  //   return axios(geoOptions);
  // });

  // get news data
  // const options = {
  //   method: "GET",
  //   url: "https://news67.p.rapidapi.com/v2/topic-search",
  //   params: {
  //     languages: "en",
  //     search: "giant panda",
  //     // change to string needed
  //     batchSize: MAX_ITEM.toString(),
  //   },
  //   headers: {
  //     "X-RapidAPI-Key": process.env.X_RAPID_API_KEY,
  //     "X-RapidAPI-Host": "news67.p.rapidapi.com",
  //   },
  // };

  try {
    // 각 동물에 대해 threat status를 검색하는 비동기 함수를 실행합니다.
    const threatData = await fetchThreatStatus(scientificName);
    // 검색 결과가 없으면 threatData 객체에 "no data"를 설정합니다.
    if (!threatData) {
      threatData = {
        scientific_name: scientificName,
        threatStatuses: "NO RESULT",
      };
    }

    console.log(threatData);

    // Get animal pictures from Flickr API
    // const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
    // const flickrAPIUrl = `https://api.flickr.com/services/rest?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&tags=${scientificName}&per_page=1&format=json&nojsoncallback=1&media=photos`;

    // // Use Axios to make the GET request
    // const flickrResponse = await axios.get(flickrAPIUrl);
    // if (!flickrResponse.data) {
    //   throw new Error("Failed to fetch data from Flickr API");
    // }
    // const flickrData = flickrResponse.data.photos;
    // const photoData = flickrData.photo.map((photo) => ({
    //   image: `http://farm${photo.farm}.static.flickr.com/${photo.server}/${photo.id}_${photo.secret}_t.jpg`,
    //   url: `http://www.flickr.com/photos/${photo.owner}/${photo.id}`,
    //   title: photo.title,
    // }));
    // // News api
    // // const response = await axios.request(options);

    // // Process and use combinedResults as needed - animal information
    // // console.log(combinedResults[0].results[0], response.data);
    // // Send the combinedResults as a response if needed
    // // res.json(
    // //   combinedResults[0].results[0].vernacularNames.reduce(
    // //     (uniqueNames, item) => {
    // //       const normalizedItem = item.vernacularName.toLowerCase(); // 문자열을 소문자로 통일
    // //       if (
    // //         item.language === "eng" &&
    // //         !uniqueNames.includes(normalizedItem)
    // //       ) {
    // //         uniqueNames.push(normalizedItem);
    // //       }
    // //       return uniqueNames;
    // //     },
    // //     []
    // //   )
    // // );

    // // Lastly render test page, max number items pass
    // * lon, lat 정보 불러오는 api

    // // Send the API request for this location
    // const response = await axios(geoOptions);

    // // Handle the response for this location
    // console.log(`Location: ${location}`);
    // console.log(response.data);
    // console.log("===================");

    res.render("threat", {
      pageTitle: "Threat",
      MAPBOX_API_KEY,
      threatData: threatData.threatStatuses.replace("_", " "),
      // photoData: photoData.slice(0, MAX_ITEM),
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
  // // Use Promise.all to execute all requests in parallel
  // Promise.all(geoPromises)
  //   .then((responses) => {
  //     // Handle the responses here (responses may contain null values for failed requests)
  //   })
  //   .catch((error) => {
  //     // Handle any errors here
  //     console.error("Promise.all Error:", error);
  //   });
};

const handleMap = async (req, res, next) => {
  mapboxgl.accessToken = process.env.MAPBOX_API_KEY;
  const map = new mapboxgl.Map({
    container: "map", // container ID
    style: "mapbox://styles/mapbox/streets-v12", // style URL
    center: [-74.5, 40], // starting position [lng, lat]
    zoom: 9, // starting zoom
  });
};
module.exports = { handleAnimal, handleAnimalSearch, handleMap };
