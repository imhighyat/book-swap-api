const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const axios = require('axios');
//use ES6 promises
mongoose.Promise = global.Promise;
const {Book} = require('../models/booksModel');
const {User} = require('../models/usersModel');

const internalMsg = 'Internal server error occured.';
const cantFindMsg = 'Cant find books';
const {GOOGLE_API} = require('../config');

//fetch all books in the collection
router.get('/', (req, res) => {
	Book.find({})
		.then(data => {
			Book.find({}).limit(10).skip(10 * (req.query.page - 1 || 0))
				.then(limitedResult => res.status(200).json({data: limitedResult, totalItems: data.length}))
				.catch(err => {
					console.log(err);
					res.status(400).json({ message: internalMsg});
				});
		})
		.catch(err => {
			console.log(err);
			res.status(400).json({ message: internalMsg});
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
				return axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${req.params.isbn}&key=${GOOGLE_API}`)
					.then(googleResult => {
						//if found no results, send a msg that we cant find it
						if(!googleResult.data.totalItems){
							res.status(404).json({ message: cantFindMsg });
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
						res.status(400).json({ message: internalMsg});
					});
			}
			res.status(200).json(data); 
		})
		.catch(err => {
			console.log(err);
			res.status(400).json({ message: internalMsg});
		});
});

//fetch the users that are offering a specific book
router.get('/:isbn/users', (req, res) => {
	//get the object id of the isbn from Books
	Book.find({ isbn: req.params.isbn })
		.then(bookResults => {
			//get the object id of the book entry
			if(!bookResults.length){
				return res.status(200).json({ message: 'Sorry, the book you are looking for is not being offered at this time.' });
			}
			//store the obj id of the book
			//check the user's library who has the book for offering
			const bookId = bookResults[0].id;
			User.find({ library: { $elemMatch: { book: bookId, hasPendingRequest: 'false' }}}).populate('library.book')
				.then(userResults => {
					//if no results, send a msg
					if(!userResults.length){
						return res.status(200).json({message: 'Sorry, none of our users offers this book for swap at the moment.'});
					}
					//loop through the result and take the id of the users
					const usersOffering = userResults.map(element => {
						return element;
					});
					res.status(200).json(usersOffering);
				})
				.catch(err => {
					console.log(err);
					res.status(400).json({ message: internalMsg });
				});
		})
		.catch(err => {
			console.log(err);
			res.status(400).json({ message: internalMsg });
		});
});

module.exports = router;
