const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
//use ES6 promises
mongoose.Promise = global.Promise;

const {User} = require('../models/usersModel');
const {Book} = require('../models/booksModel');
const internalMsg = 'Internal server error occured.';
const emptySearchMsg = 'Empty search requested.';
const unexpectedQueryMsg = 'Unexpected query key.';

router.get('/', (req, res) => {
	let queryKey = Object.keys(req.query);
	let searchValue;
	let bookPromise;
	let category;
	const cantFindMsg = 'Cant find books';
	if(queryKey.length === 0){
		return res.status(400).json({ message: emptySearchMsg });
	}
	else{
		if(queryKey[0] === "isbn"){
			searchValue = req.query.isbn;
			category = "isbn";
			bookPromise = Book.find({ isbn: req.query.isbn });
		}
		else if(queryKey[0] === "author"){
			searchValue = req.query.author;
			console.log(searchValue);
			category = "inauthor";
			bookPromise = Book.find({ authors: { $regex: searchValue, $options: "i"} });
		}
		else if(queryKey[0] === "title"){
			searchValue = req.query.title;
			category = "intitle";
			bookPromise = Book.find({ title: { $regex: searchValue, $options: "i"} });
		}
		else{
			return res.status(400).json({ message: unexpectedQueryMsg });
		}

		if(searchValue === ""){
			return res.status(400).json({ message: emptySearchMsg });
		}
		bookPromise
		.then(results => {
			if(results.length){
				console.log('checking book collection');
				return res.status(200).json(results);
			}
			console.log('checking google');
			axios.get(`https://www.googleapis.com/books/v1/volumes?q=${category}:${searchValue}&key=AIzaSyC2NVsP7NrHPF6_lhNn_m7wK7WOi0wXYpk&maxResults=40`)
				.then(googleResults => {
					if(!googleResults.data.totalItems){
						res.status(404).json({message: cantFindMsg});
					}
					else{
						let searchResults = googleResults.data.items.map(bookResult => bookResult.volumeInfo);
						for(let i = 0; i < searchResults.length; i++){
							let isbn, images, summary;
							searchResults[i].hasOwnProperty('industryIdentifiers') ?
								isbn = searchResults[i].industryIdentifiers.map(obj => obj.identifier) : 
									isbn = [];
							searchResults[i].hasOwnProperty('imageLinks') ?
								images = searchResults[i].imageLinks : 
									images = { };
							searchResults[i].hasOwnProperty('description') ?
								summary = searchResults[i].description : 
									summary = 'No summary provided for this book.';
							let bookInfoToStore = {
									isbn: isbn,
									images: images,
									summary: summary,
									authors: searchResults[i].authors,
									title: searchResults[i].title
							};
							Book.create(bookInfoToStore)
								.then(() => Promise.resolve())
								.catch(err => {
									console.log(err);
									res.status(500).json({ message: internalMsg });
								});
						}
						res.status(200).json(searchResults);
					}
				})
				.catch(err => {
					console.log(err);
					res.status(500).send(internalMsg);
				});
		})
		.catch(err => {
			console.log(err);
			res.status(500).send(internalMsg);
		});
	}
});

module.exports = router;
