'use strict';


// Bring in our dependencies
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');//postgres
const { response } = require('express');


// Environment Variables
require('dotenv').config();


// Setting up application
const app = express();
// Declare our port for our server to listen on
const PORT = process.env.PORT || 4000;
// Use CORS (cross origin resource sharing)
app.use(cors());

//creating postgres client
const client = new pg.Client(process.env.DATABASE_URL);

// Routes test
//test route to ensure we are working
// app.get('/', (request, response) => {
//     response.send('Hello World');
// });

// Route Handlers 
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/trails', trailHandler);
app.get('/movies', movieHandler);
app.get('/yelp', restaurantHandler);


//Route Handlers

function locationHandler(request, response) {
    let city = request.query.city;
    let key = process.env.LOCATIONIQ_API_KEY;

    const SQL = 'SELECT * FROM citylocations WHERE search_query=$1';
    const safeValue = [city];
    client.query(SQL, safeValue)
        .then(results => {
            if (results.rows.length > 0) {
                // console.log('DATABASE WAS USED');
                response.status(200).json(results.rows[0]);
            } else {
                const URL = `https://us1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json`;

                superagent.get(URL)
                    .then(data => {
                        let location = new Location(city, data.body[0]);
                        let cityQuery = location.search_query;
                        let lat = location.latitude;
                        let lon = location.longitude;
                        const SQL = `INSERT INTO cityLocations (search_query, formatted_query, latitude, longitude) VALUES ($1, $2, $3) RETURNING *`;
                        const safeValue = [cityQuery, cityQuery, lat, lon];
                        client.query(SQL, safeValue)
                            .then(results => {
                                // console.log('new additon to the database ', results.rows)
                            })
                            .catch(error => {
                                // console.log('Error', error);
                                response.status(500).send('Something went wrong.');
                            });

                        response.status(200).json(location);
                    })
                    .catch((error) => {
                        // console.log('error1', error);
                        response.status(500).send('Your API call is not working?');
                    })
            }
        })
        .catch((error) => {
            response.status(500).send('error');
        });
}



function movieHandler(request, response) {
    let city = request.query.search_query;
    let key = process.env.MOVIE_API_KEY;
    const URL = `https://api.themoviedb.org/3/search/movie?api_key=${key}&language=en-US&query=${city}&page=1&include_adult=false`;


    superagent.get(URL)
        .then(data => {
            // console.log(data.body.results[0])
            let eachMovie = data.body.results.map(movies => {
                let imgToUse = '';
                if (movies.poster_path === null && movies.backdrop_path === null) {
                    imgToUse = 'No Picture';
                }
                else if (movies.poster_path) {
                    imgToUse = `https://image.tmdb.org/t/p/w500${movies.poster_path}`;
                }
                else if (movies.backdrop_path) {
                    imgToUse = `https://image.tmdb.org/t/p/w500${movies.backdrop_path}`;
                }
                return new Movies(movies, imgToUse);
            });
            eachMovie = eachMovie.slice(0, 20);
            response.status(200).json(eachMovie);
        })
        .catch((error) => {
            console.log('error', error);
            response.status(500).send('Your Movie API call is not working?');
        });

}

function restaurantHandler(request, response) {
    let city = request.query.search_query;
    let key = process.env.YELP_API_KEY
    const numPerPage = 5;
    const page = request.query.page || 1;
    const start = ((page - 1) * numPerPage);

    const API = `https://api.yelp.com/v3/businesses/search?location=${city}&term=restaurants&limit=5&offset=${start}`;

    superagent.get(API)
        .set('Authorization', `Bearer ${key}`)
        .then(data => {
            console.log(data.body.businesses[0]);
            let eachRestaurant = data.body.businesses.map(restaurant => {
                return new Restaurant(restaurant);
            });
            response.status(200).json(eachRestaurant);
        })
        .catch((error) => {
            console.log('error', error);
            response.status(500).send('Your Yelp API call is not working?');
        });
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
            // console.log('error', error);
            response.status(500).send('Your API call is not working?');
        })
}

function trailHandler(request, response) {
    let lat = request.query.latitude;
    let lon = request.query.longitude;
    let key = process.env.TRAILS_API_KEY;

    const URL = `https://www.hikingproject.com/data/get-trails?lat=${lat}&lon=${lon}&key=${key}&days=10`;
    // console.log(URL);
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
            // console.log('error', error);
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

function Restaurant(obj) {
    this.name = obj.name;
    this.image_url = obj.image_url;
    this.price = obj.price;
    this.rating = obj.rating;
    this.url = obj.url;
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

function Movies(obj, img) {
    this.title = obj.title;
    this.overview = obj.overview;
    this.average_votes = obj.vote_average;
    this.total_votes = obj.vote_count;
    this.popularity = obj.popularity;
    this.released_on = obj.release_date;
    this.image_url = img;
}

// function Restaurant(entry){
//     this

// }

// Start our server!


client.connect()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is now listening on port ${PORT}`);
        });
    })
    .catch(err => {
        console.log('error', err);
    });
