const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
//use ES6 promises
mongoose.Promise = global.Promise;
const {Book} = require('../models/booksModel');

const internalMsg = 'Internal server error occured.';
const cantFindMsg = 'Cant find books';

router.get('/', (req, res) => {
	Book.find({})
		.then(data => {res.status(200).json(data); console.log(data.length)})
		.catch(err => {
			console.log(err);
			res.status(400).send(err);
		});
});

router.get('/:isbn', (req, res) => {
	Book.find({isbn: req.params.isbn})
		.then(data => {
			if(!data.length){
				console.log('checking google');
				return axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${req.params.isbn}&key=AIzaSyC2NVsP7NrHPF6_lhNn_m7wK7WOi0wXYpk&maxResults=40`)
					.then(googleResult => {
						if(!googleResult.data.totalItems){
							res.status(404).json({message: cantFindMsg});
						}
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
			console.log('found in the collection');
			res.status(200).json(data); 
		})
		.catch(err => {
			console.log(err);
			res.status(400).send(internalMsg);
		});
});

module.exports = router;
