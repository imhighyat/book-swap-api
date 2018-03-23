const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
//use ES6 promises
mongoose.Promise = global.Promise;
const {Book} = require('../models/booksModel');

const internalMsg = 'Internal server error occured.';
const cantFindMsg = 'Cant find books';
const {GOOGLE_API} = require('../config');

//fetch all books in the collection
router.get('/', (req, res) => {
	Book.find({})
		.then(data => res.status(200).json(data))
		.catch(err => {
			console.log(err);
			res.status(400).send(err);
		});
});

//fetch a book info using isbn
router.get('/:isbn', (req, res) => {
	//check the books collection first
	Book.find({isbn: req.params.isbn})
		.then(data => {
			//if collection cant find a match
			if(!data.length){
				//make api call to google
				return axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${req.params.isbn}&key=${GOOGLE_API}&maxResults=40`)
					.then(googleResult => {
						//if found no results, send a msg that we cant find it
						if(!googleResult.data.totalItems){
							res.status(404).json({message: cantFindMsg});
						}
						//else, save the result to our collection first before returning it
						else{
							let searchResult = googleResult.data.items[0].volumeInfo;
							let isbn, images, summary;
							searchResult.hasOwnProperty('industryIdentifiers') ?
								isbn = searchResult.industryIdentifiers.map(obj => obj.identifier) : 
									isbn = [];
							searchResult.hasOwnProperty('imageLinks') ?
								images = searchResult.imageLinks : 
									images = { };
							searchResult.hasOwnProperty('description') ?
								summary = searchResult.description : 
									summary = 'No summary provided for this book.';
							let bookInfoToStore = {
									isbn: isbn,
									images: images,
									summary: summary,
									authors: searchResult.authors,
									title: searchResult.title
							};
							Book.create(bookInfoToStore)
								.then(() => Promise.resolve())
								.catch(err => {
									console.log(err);
									res.status(500).json({ message: internalMsg });
								});
							res.status(200).json(searchResult);
						}
					})
					.catch(err => {
						console.log(err);
						res.status(400).json(internalMsg);
					});
			}
			res.status(200).json(data); 
		})
		.catch(err => {
			console.log(err);
			res.status(400).send(internalMsg);
		});
});

module.exports = router;
