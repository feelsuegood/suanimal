const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

const FLICKR_API_KEY = process.env.FLICKR_API_KEY;
const X_API_KEY = process.env.X_API_KEY;

// 그러면 사용자가 검색한 후 해당 동물을 클릭을 하면 학명으로 바꿔서 위험 상태를 나타낼 수 있게 해야겠다.
// https://api.gbif.org/v1/species/search?q=Marmota%20vancouverensis%20Swarth&threat=CRITICALLY_ENDANGERED&nametype=SCIENTIFIC
// https://gbif.github.io/gbif-api/apidocs/org/gbif/api/vocabulary/ThreatStatus.html threat status info
//       nameData.slice(0, MAX_ITEM), array 자르는 명령어

// 계속 쓰이는 변수

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
    const searchedAnimal = animalResponse.data; // 검색된 동물 데이터를 얻습니다.

    // Flickr API
    const flickrAPIBaseUrl = `https://api.flickr.com/services/rest?method=flickr.photos.search&api_key=${FLICKR_API_KEY}&safe_search=1&per_page=1&format=json&nojsoncallback=1&media=photos`;
    const flickrAPIUrls = searchedAnimal.map((animal) => {
      const animalName = animal.name.toLowerCase();
      const flickrAPIUrl = `${flickrAPIBaseUrl}&tags=${animalName}`;
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

    console.log(searchedAnimal, photoData);
    res.render("animal", {
      pageTitle: "Animal",
      searchedAnimal,
      photoData,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
};

const handleAnimal = async (req, res, next) => {
  // in case there are so many result use max item number
  console.log("❗️", req.params.scientificName);
  const MAX_ITEM = 3;
  const scientificName = req.params.scientificName.replace(" ", "%20");
  // const searchName = name.replace(" ", "%20");
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
  // get threat status data
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

    return {
      scientific_name: scientificName, // scientificName을 사용합니다.
      threatStatuses: threatData,
    };
  }
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

    res.render("animal-threat", {
      pageTitle: "Threat",
      threatData: threatData.threatStatuses.replace("_", " "),
      // nameData: combinedResults[0].results[0].vernacularNames.reduce(
      //   (uniqueNames, item) => {
      //     const normalizedItem = item.vernacularName.toLowerCase(); // 문자열을 소문자로 통일
      //     if (
      //       item.language === "eng" &&
      //       !uniqueNames.includes(normalizedItem)
      //     ) {
      //       uniqueNames.push(normalizedItem);
      //     }
      //     return uniqueNames;
      //   },
      //   []
      // ),
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
};
module.exports = { handleAnimal, handleAnimalSearch };
