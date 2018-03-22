require('dotenv').load();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');

const {CLIENT_ORIGIN, PORT, DATABASE_URL} = require('./config');
const usersRouter = require('./routers/usersRouter');
const searchRouter = require('./routers/searchRouter');
const booksRouter = require('./routers/booksRouter');

app.use(morgan('common'));
app.use(bodyParser.json());
app.use(cors({origin: CLIENT_ORIGIN}));

//route all /restaurants to usersRouter.js
app.use('/api/users', usersRouter);
//route all /restaurants to searchRouter.js
app.use('/api/search', searchRouter);
//route all /restaurants to booksRouter.js
app.use('/api/books', booksRouter);
//any other endpoint, send a msg
app.use('*', (req,res)=>{
	res.send('Address not found. Please check your URL.');
});

let server;
mongoose.Promise = global.Promise;

//connects to the db and starts the server
function runServer(databaseUrl=DATABASE_URL, port=PORT){
    return new Promise ((resolve, reject) => {
        //connect to the db first
        mongoose.connect(databaseUrl, err => {
            //if there is an error connecting, return the promise
            //with reject and the error
            if(err){
                return reject(err);
            }
            //if not, move on to starting a server
            server = app.listen(port, () => {
                console.log(`The app is listening on ${port}.`);
                resolve();
            })
            //if there is an error, disconnect server and return a reject
            .on('error', err => {
                mongoose.disconnect();
                reject(err);
            });
        });
    });
}

//disconnects from the db and close the server
function closeServer(){
    return mongoose.disconnect().then(() => {
        return new Promise ((resolve, reject) => {
            console.log('Closing the server.');
            //closing the server
            server.close(err => {
                //if there is an error, return a reject
                if(err){
                    return reject(err);
                }
                //if not, return a resolve
                resolve();
            });
        });
    });
}

//if server.js is directly called from node, we will invoke runServer
if(require.main === module){
    //if any error, catch it and log
    runServer().catch(err => console.error(err));
}

//exporting our app and the run and close functions for testing*/
module.exports = {app, runServer, closeServer};