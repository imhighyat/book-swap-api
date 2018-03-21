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
const cantFindMsg = 'Cant find books';

router.get('/', (req, res) => {
	//store the query in an array
	let queryKey = Object.keys(req.query);
	let searchValue, bookPromise, category;
	//if there is no query passed, send a warning msg
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
		//if no input received from client about the value of query, send a warning msg
		if(searchValue === ""){
			return res.status(400).json({ message: emptySearchMsg });
		}
		//query the books collection first
		bookPromise
		.then(results => {
			//if we have search results
			if(results.length){
				//return with the results
				return res.status(200).json(results);
			}
			//else, make an API call to google book using category and searchValue from client
			axios.get(`https://www.googleapis.com/books/v1/volumes?q=${category}:${searchValue}&key=AIzaSyC2NVsP7NrHPF6_lhNn_m7wK7WOi0wXYpk&maxResults=40`)
				.then(googleResults => {
					//if no results found by API, send a msg that we cant find the book
					if(!googleResults.data.totalItems){
						res.status(404).json({message: cantFindMsg});
					}
					//if results found
					else{
						//in the background, we're storing the search results from the API call
						//this makes for faster load times in the future if we have them in the collection already
						//store the results in an array
						let searchResults = googleResults.data.items.map(bookResult => bookResult.volumeInfo);
						//loop thru the array
						for(let i = 0; i < searchResults.length; i++){
							let isbn, images, summary;
							//check for the fields we need to update the collection
							searchResults[i].hasOwnProperty('industryIdentifiers') ?
								isbn = searchResults[i].industryIdentifiers.map(obj => obj.identifier) : 
									isbn = [];
							searchResults[i].hasOwnProperty('imageLinks') ?
								images = searchResults[i].imageLinks : 
									images = { };
							searchResults[i].hasOwnProperty('description') ?
								summary = searchResults[i].description : 
									summary = 'No summary provided for this book.';
							//create an obj to pass when creating new book
							let bookInfoToStore = {
									isbn: isbn,
									images: images,
									summary: summary,
									authors: searchResults[i].authors,
									title: searchResults[i].title
							};
							//create a new book with the data gathered
							Book.create(bookInfoToStore)
							//then resolve this promise
								.then(() => Promise.resolve())
								.catch(err => {
									console.log(err);
									res.status(500).json({ message: internalMsg });
								});
						}
						//return the search results to client
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

router.get('/deepsearch', (req, res) => {
	//store the query in an array
	let queryKey = Object.keys(req.query);
	let searchValue, category;
	//if there is no query passed, send a warning msg
	if(queryKey.length === 0){
		return res.status(400).json({ message: emptySearchMsg });
	}
	else{
		if(queryKey[0] === "isbn"){
			searchValue = req.query.isbn;
			category = "isbn";
		}
		else if(queryKey[0] === "author"){
			searchValue = req.query.author;
			category = "inauthor";
		}
		else if(queryKey[0] === "title"){
			searchValue = req.query.title;
			category = "intitle";
		}
		else{
			return res.status(400).json({ message: unexpectedQueryMsg });
		}
		//if no input received from client about the value of query, send a warning msg
		if(searchValue === ""){
			return res.status(400).json({ message: emptySearchMsg });
		}
		//make an API call to google book using category and searchValue from client
		axios.get(`https://www.googleapis.com/books/v1/volumes?q=${category}:${searchValue}&key=AIzaSyC2NVsP7NrHPF6_lhNn_m7wK7WOi0wXYpk&maxResults=40`)
			.then(googleResults => {
				//if no results found by API, send a msg that we cant find the book
				if(!googleResults.data.totalItems){
					res.status(404).json({message: cantFindMsg});
				}
				//if results found
				else{
					//in the background, we're storing the search results from the API call
					//this makes for faster load times in the future if we have them in the collection already
					//store the results in an array
					let searchResults = googleResults.data.items.map(bookResult => bookResult.volumeInfo);
					//loop thru the array
					for(let i = 0; i < searchResults.length; i++){
						let isbn, images, summary;
						//check for the fields we need to update the collection
						searchResults[i].hasOwnProperty('industryIdentifiers') ?
							isbn = searchResults[i].industryIdentifiers.map(obj => obj.identifier) : 
								isbn = [];
						searchResults[i].hasOwnProperty('imageLinks') ?
							images = searchResults[i].imageLinks : 
								images = { };
						searchResults[i].hasOwnProperty('description') ?
							summary = searchResults[i].description : 
								summary = 'No summary provided for this book.';
						//create an obj to pass when creating new book
						let bookInfoToStore = {
								isbn: isbn,
								images: images,
								summary: summary,
								authors: searchResults[i].authors,
								title: searchResults[i].title
						};
						//create a new book with the data gathered
						Book.create(bookInfoToStore)
						//then resolve this promise
							.then(() => Promise.resolve())
							.catch(err => {
								console.log(err);
								res.status(500).json({ message: internalMsg });
							});
					}
					//return the search results to client
					res.status(200).json(searchResults);
				}
			})
			.catch(err => {
				console.log(err);
				res.status(500).send(internalMsg);
			});
	}
});

module.exports = router;
