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
const {GOOGLE_API} = require('../config');

//performs a search based on the queries
//can only search one category at a time
router.get('/', (req, res) => {
	//obtain the query key and store it
	let queryKey = Object.keys(req.query);
	let searchValue, bookPromise, category;
	//if there is no query passed, send a warning msg
	if(queryKey.length === 0){
		return res.status(400).json({ message: emptySearchMsg });
	}
	else{
		if(queryKey[0] === 'isbn'){
			searchValue = req.query.isbn;
			category = 'isbn';
			bookPromise = Book.find({ isbn: req.query.isbn });
		}
		else if(queryKey[0] === 'author'){
			searchValue = req.query.author;
			category = 'inauthor';
			bookPromise = Book.find({ $text: { $search: searchValue }});
			//bookPromise = Book.find({ author: { $in: searchValue.split(" ") }});
		}
		else if(queryKey[0] === 'title'){
			searchValue = req.query.title;
			category = 'intitle';
			//bookPromise = Book.find({ title: { $in: searchValue.split(" ") }});
			bookPromise = Book.find({ $text: { $search: searchValue }});
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
			console.log('checking collection', results.length);
			//if we have search results
			if(results.length){
				//since we now have the total number of results
				//limit the results to 10 and use pagination
				bookPromise.limit(10).skip(10 * (req.query.page - 1 || 0))
					.then(limitedResults => {
						//return with the limited results plus the total number of items
						return res.status(200).json({ results: limitedResults, totalItems: results.length });
					})
					.catch(err => {
						console.log(err);
						res.status(500).json({ message: internalMsg });
					});
			}
			//else, make an API call to google book using category and searchValue from client
			else{
				axios.get(`https://www.googleapis.com/books/v1/volumes?q=${category}:${searchValue.split(' ').join('+')}&key=${GOOGLE_API}&maxResults=10&startIndex=${req.query.page - 1 || 0}`)
					.then(googleResults => {
						console.log('checking google', googleResults.data.totalItems);
						//if no results found by google API, send a msg that we cant find the book
						if(!googleResults.data.totalItems){
							res.status(404).json({ message: cantFindMsg });
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
								//industryIdentifiers, imageLinks and summary is not always present in the results
								//we make sure to assign default values to these
								searchResults[i].hasOwnProperty('industryIdentifiers') ?
									isbn = searchResults[i].industryIdentifiers.map(obj => obj.identifier) : 
										isbn = [];
								searchResults[i].hasOwnProperty('imageLinks') ?
									images = searchResults[i].imageLinks : 
										images = { };
								searchResults[i].hasOwnProperty('description') ?
									summary = searchResults[i].description : 
										summary = 'No summary provided for this book.';
								//create an obj to pass when creating new book on each loop
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
							res.status(200).json({ data: searchResults, totalItems: googleResults.data.totalItems });
						}
					})
					.catch(err => {
						console.log(err);
						res.status(500).json({ message: internalMsg });
					});
			}
		})
		.catch(err => {
			console.log(err);
			res.status(500).json({ message: internalMsg });
		});
	}
});

//will make a search call straight to google
//needed when books collection results are not satisfying the client's search
router.get('/deepsearch', (req, res) => {
	//store the query in an array
	let queryKey = Object.keys(req.query);
	let searchValue, category;
	//if there is no query passed, send a warning msg
	if(queryKey.length === 0){
		return res.status(400).json({ message: emptySearchMsg });
	}
	else{
		if(queryKey[0] === 'isbn'){
			searchValue = req.query.isbn;
			category = 'isbn';
		}
		else if(queryKey[0] === 'author'){
			searchValue = req.query.author;
			category = 'inauthor';
		}
		else if(queryKey[0] === 'title'){
			searchValue = req.query.title;
			category = 'intitle';
		}
		else{
			return res.status(400).json({ message: unexpectedQueryMsg });
		}
		//if no input received from client about the value of query, send a warning msg
		if(searchValue === ''){
			return res.status(400).json({ message: emptySearchMsg });
		}
		//make an API call to google book using category and searchValue from client
		axios.get(`https://www.googleapis.com/books/v1/volumes?q=${category}:${searchValue.split(' ').join('+')}&key=${GOOGLE_API}&maxResults=10&startIndex=${req.query.page - 1 || 0}`)
			.then(googleResults => {
				//if no results found by API, send a msg that we cant find the book
				if(!googleResults.data.totalItems){
					res.status(404).json({ message: cantFindMsg });
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
					res.status(200).json({ data: searchResults, totalItems: googleResults.data.totalItems });
				}
			})
			.catch(err => {
				console.log(err);
				res.status(500).json({ message: internalMsg });
			});
	}
});

module.exports = router;
