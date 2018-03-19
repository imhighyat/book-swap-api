const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
//use ES6 promises
mongoose.Promise = global.Promise;

const {User} = require('../models/usersModel');
const {Book} = require('../models/booksModel');
const internalMsg = 'Internal server error occured.';

router.get('/', (req, res) => {
	//check which category is in the query
	let category = Object.keys(req.query);
	let searchValue;
	if(category.length === 0){
		console.log('empty search');
		return res.status(400).end();
	}
	else{
		if(category[0] === "isbn"){
			searchValue = req.query.isbn;
			if(searchValue === ""){
				return res.status(400).end();
			}
			//do a search in the books collection
			//if ISBN is not found, do a call to google's API
			axios.get('https://www.googleapis.com/books/v1/volumes?q=isbn:1409541673&key=AIzaSyC2NVsP7NrHPF6_lhNn_m7wK7WOi0wXYpk')
			.then(data => {
				//save it in books collection
				res.status(200).json(data.data.items[0].volumeInfo)
			})
			.catch(err => {
				console.log(err);
				res.status(500).send(err);
			});
		}
		else if(category[0] === "author"){
			searchValue = req.query.author;
			if(searchValue === ""){
				return res.status(400).end();
			}
			res.end();
		}
		else if(category[0] === "title"){
			searchValue = req.query.title;
			if(searchValue === ""){
				return res.status(400).end();
			}
			res.end();
		}
		else{
			console.log('unexpected category');
			return res.status(400).end();
		}
	}
});

module.exports = router;
