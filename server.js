'use strict';


// Bring in our dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const { response } = require('express');


// Environment Variables
require('dotenv').config();


// Setting up application
const app = express();
// Declare our port for our server to listen on
const PORT = process.env.PORT || 3000;
app.use(cors());
// Use CORS (cross origin resource sharing)
app.use(cors());


// Routes
//test route to ensure we are working
app.get('/', (request, response) => {
    response.send('Hello World');
});

// refactor for api 
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/trails', trailHandler);


// app.get('/restaurants', (request, response) => {
//     let data = require('./data/restaurants.json');
//     let restaurantArray = [];
//     data.nearby_restaurants.forEach(value => {
//         let restaurant = new Restaurant(value);
//         restaurantArray.push(restaurant);
//     })
//     console.log(restaurantArray);
//     response.send(restaurantArray);

// });

// app.get('/weather', (request, response) => {
//   let data = require('./data/weather.json');
//   let weatherArray = [];
//   data.data.forEach(value => {
//       let weather = new Weather(value);
//       weatherArray.push(weather);
//   })
//   console.log(weatherArray);
//   response.send(weatherArray);

// });

//Route Handlers
function locationHandler(request, response) {
    let city = request.query.city;
    let key = process.env.LOCATIONIQ_API_KEY;

    const URL = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json`;

    superagent.get(URL)
        .then(data => {
            let location = new Location(city, data.body[0]);
            response.status(200).json(location);
        })
        .catch((error) => {
            console.log('error', error);
            response.status(500).send('Your API call is not working?');
        })

}


function weatherHandler(request, response) {
    let city = request.query.search_query;
    let key = process.env.WEATHERBIT_API_KEY;

    const URL = (`http://api.weatherbit.io/v2.0/forecast/daily/current?city=${city}&country=United%20States&key=${key}&days=7`);

    superagent.get(URL)
        .then(data => {
            let weatherArray = data.body.data.map(day => {
                let stringDay = new Date(day.ts * 1000).toDateString();
                return new Weather(stringDay, day);
            });
            response.status(200).json(weatherArray);
            response.send(weatherArray)
        })
        .catch((error) => {
            console.log('error', error);
            response.status(500).send('Your API call is not working?');
        })
}

function trailHandler(request, response) {
    let lat = request.query.latitude;
    let lon = request.query.longitude;
    let key = process.env.TRAILS_API_KEY;

    const URL = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&key=${key}&days=10`;
    console.log(URL);
    superagent.get(URL)
        .then(data => {
            let eachTrail = data.body.trails.map(trail => {
                let timeDateSplit = trail.conditionDate.split(' ');
                return new Trails(trail, timeDateSplit);
            });
            response.status(200).json(eachTrail);
            response.send(eachTrail);
        })
        .catch((error) => {
            console.log('error', error);
            response.status(500).send('Your API call is not working? Trails');
        })
}
// Constructor to tailor our incoming raw data

function Location(query, obj) {
    this.latitude = obj.lat;
    this.longitude = obj.lon;
    this.search_query = query;
    this.formatted_query = obj.display_name;
}

function Weather(string, obj) {
    this.time = string;
    this.forecast = obj.weather.description;
}

function Trails(obj, timeDate) {
    this.name = obj.name;
    this.location = obj.location;
    this.length = obj.length;
    this.stars = obj.stars;
    this.star_votes = obj.starVotes;
    this.summary = obj.summary;
    this.trail_url = obj.url;
    this.conditions = obj.conditionStatus;
    this.condition_date = timeDate[0];
    this.condition_time = timeDate[1];

}


// Start our server!
app.listen(PORT, () => {
    console.log(`Server is now listening on port ${PORT}`);
});