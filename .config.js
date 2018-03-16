//configure values for the Mongo database URL and the port the application will run on

exports.DATABASE_URL = process.env.DATABASE_URL ||
                       global.DATABASE_URL ||
                      'mongodb://localhost/bookSwap'; //edit for the name of the db

exports.PORT = process.env.PORT || 8080;

//for testing
exports.TEST_DATABASE_URL = process.env.DATABASE_URL ||
                      'mongodb://localhost/test-bookSwap';

//only enable our client app to use the api
exports.CLIENT_ORIGIN = "https://sharp-panini-de0004.netlify.com";