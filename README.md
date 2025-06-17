# 🦧 Suanimal

Developed a web application that provides information about animals, including their taxonomy, features, habitat, and news.

## 🌟 Main Features

- **Animal Search**: Search for animals by name and view related information
- **Animal Details**: View taxonomy, features, and threat status
- **Habitat Information**: Visualize habitat using a map and climate data
- **Related News**: Provide the latest news related to the animal
- **Visitor Counter**: Track visitor count using AWS S3

## 🛠 Tech Stack

### Backend
- **Node.js** + **Express.js**: Web server framework
- **Handlebars (HBS)**: Template engine
- **AWS S3**: Store visitor counter data

### Frontend
- **Bootstrap 5**: UI framework
- **Font Awesome**: Icons
- **Mapbox GL JS**: Map visualization
- **D3.js**: Climate data chart

### APIs
- **API-NINJAS Animals API**: Animal information
- **Flickr API**: Animal images
- **GBIF API**: Threat status
- **News67 API**: Related news
- **Meteostat API**: Climate data
- **Geocoding API**: Location information

## 📁 Project Structure

```
suanimal/
├── src/
│   ├── app.js                    # Express app setup
│   ├── bin/
│   │   └── www                   # Server start point
│   ├── controllers/
│   │   ├── controller.js         # Main controller
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── javascripts/
│   │   └── stylesheets/
│   ├── routes/
│   │   ├── animalRouter.js       # Animal related routes
│   │   └── rootRouter.js         # Root routes
│   ├── services/
│   │   └── aws-s3.js            # AWS S3 service
│   └── views/                    # Handlebars templates
│       ├── layout.hbs
│       ├── index.hbs            # Homepage
│       ├── animal.hbs           # Animal list
│       ├── feature.hbs          # Animal details
│       ├── habitat.hbs          # Habitat information
│       └── error.hbs
├── Dockerfile                    # Docker setup
├── vercel.json                   # Vercel deployment setup
├── package.json
└── README.md
```

## 🐳 Run Docker

```bash
# Build Docker image
docker build -t suanimal .

# Run Docker container
docker run -p 3000:3000 --env-file .env suanimal
```

## 🌐 Deployment

### Vercel deployment
1. Connect project to Vercel
2. Set environment variables
3. Check `vercel.json` setup
4. Automatic deployment

## 📋 Main pages

### 1. Homepage
- Animal search interface
- Visitor counter

### 2. Animal list
- Card-style list of searched animals
- Basic information and images of each animal

### 3. Animal details
- Taxonomy information
- Threat status
- Related news

### 4. Habitat information
- Habitat

## 🔧 Main features

### AWS S3 counter
- Store visitor count in JSON file in AWS S3
- Automatically increase counter on each visit

### API integration
- Combine multiple APIs to provide rich animal information
- Implement error handling and fallback mechanism

## 📝 License

This project is licensed under the MIT License.

## 📚 References

- [API-NINJAS Animals API](https://api-ninjas.com/api/animals)
- [Flickr API Documentation](https://www.flickr.com/services/api/)
- [GBIF API Documentation](https://www.gbif.org/developer/summary)
- [Threat Status Information](https://gbif.github.io/gbif-api/apidocs/org/gbif/api/vocabulary/ThreatStatus.html)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/)
- [D3.js Documentation](https://d3js.org/)