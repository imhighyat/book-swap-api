const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
//use ES6 promises
mongoose.Promise = global.Promise;

const {User} = require('../models/usersModel');
const {Book} = require('../models/booksModel');
const {Request} = require('../models/requestsModel');
const internalMessage = 'Internal server error occured.';
const queryUnexpected = 'Query value unexpected.';
const emptySearchMsg = 'Empty search requested.';

//fetch users whether with queries or none
router.get('/', (req, res) => {
	let userPromise;
	const active = req.query.active;
	//if no query was sent, fetch all user accounts
	if(typeof(active) === "undefined"){
		userPromise = User.find();
	}
	//if query value is a string and value is either true/false,
	//assign the db query parameter to the value of req.query
	else if(typeof(active) === "string" && (active === "true" || active === "false")){
		userPromise = User.find({isActive: active});
	}
	//send a warning msg if query is unexpected
	else{
		return res.status(400).json({ message: queryUnexpected });
	}
	//query db based on the value of userPromise
	userPromise
		.then(data => {
			res.status(200).json(data);
		})
		.catch(err => {
			console.log(err);
			res.status(500).json({ message: internalMessage });
		});
});

//fetch user account with an id
router.get('/:id', (req, res) => {
	User.findById(req.params.id).populate('book')
		.then(data => {
			res.status(200).json(data);
		})
		.catch(err => {
			console.log(err);
			res.status(500).json({ message: internalMessage });
		});
});

//create a user account
router.post('/', (req, res) => {
	//add all the required fields to an array
	const requiredFields = ['name', 'username', 'password', 'email', 'phoneNumber', 'address', 'library'];
	//loop through the array and check if all required properties are in the req body
	for(let i=0; i<requiredFields.length; i++){
		const field = requiredFields[i];
		if(!(field in req.body)){
			//if any of the field is missing
			const message = `Missing ${field} in request body.`;
			return res.status(400).json({message});
		}
	}
	//if all properties are in the request body
	User.create({
		name: req.body.name,
		username: req.body.username,
		password: req.body.password,
		email: req.body.email,
		phoneNumber: req.body.phoneNumber,
		address: req.body.address,
		library: req.body.library
	})
	.then(user => res.status(201).json(user))
	.catch(err => {
		console.log(err);
		res.status(500).send(internalMsg);
	});
});

//update a user account
router.put('/:id', (req, res) => {
	// ensure that the id in the request path and the one in request body match
	if(!(req.params.id === req.body.id)){
		const message = `The request path ID ${req.params.id} and request body ID ${req.body.id} should match.`;
		return res.status(400).json({message});
	}
	//we need something to hold what the updated data should be
	const toUpdate = {};
	//properties that client can update
	const canBeUpdated = ['email', 'password', 'phoneNumber', 'address'];
	//loop through the properties that can be updated
	//check if client sent in data for those
	for(let i=0; i<canBeUpdated.length;i++){
		const field = canBeUpdated[i];
		//if the property is in the req body and it is not null
		if(field in req.body && req.body.field !== null){
			//start adding the properties to the toUpdate object
			toUpdate[field] = req.body[field];
		}
	}
	//update the database
	User.findByIdAndUpdate(req.params.id, {$set: toUpdate})
	.then(()=>{
		//make sure to return the update account
		return User.findById(req.params.id)
			.then(data => res.status(200).json(data));
	})
	.catch(err => {
		console.log(err);
		res.status(400).send(internalMsg)
	});
});

//disable a specific restaturant profile/account by setting isActive to false
router.delete('/:id', (req, res) => {
	User.findByIdAndUpdate(req.params.id, {$set: {isActive: "false"}})
	.then(()=> {
		const message = 'Account has been disabled.';
		res.status(200).json({message});
	})
	.catch(err => {
		console.log(err);
		res.status(400).send(internalMsg)
	});
});

//get a users library
router.get('/:id/books', (req, res) => {
	User.findById(req.params.id).populate('book')
		.then(user => {
			res.status(200).json(user.library);
		})
		.catch(err => {
			console.log(err);
			res.status(500).send(err);
		});
});

//add a book to user's library
router.post('/:id/books', (req, res) => {
	//params id needs to be matching the user id that we are posting to
	//if not matching return a warning message
	if(!(req.params.id === req.body.id)){
		const message = `The request path ID ${req.params.id} and request body ID ${req.body.id} should match.`;
		return res.status(400).json({message});
	}	
	//make sure that the book field is passed on to the req.body
	//if not return a warning message
	if(!('book' in req.body)){
		const message = 'Missing the book id in request body.';
		return res.status(400).json({message});
	}
	//check on the books collection first using the isbn from req body
	Book.find({ isbn: req.body.book })
		.then(result => {
			//if we have a result
			if(result.length){
				//assign the Obj id to an obj
				const bookObj = {book: result[0].id};
				//check if user already registered the book in the library
				User.findById(req.params.id)
					.then(user => {
						//assign the whole library to a variable
						const userLibrary = user.library;
						//loop through the elements and compare if we already have that book obj id
						for(let i=0; i<userLibrary.length; i++){
							//if it exists, return a warning msg
							if(userLibrary[i].book.toString() === bookObj.book){
								const message = 'Book already exists in the library.';
								return res.status(200).json({message})
							}
						}
						//otherwise add the book obj to the user's library using push
						User.findByIdAndUpdate(req.params.id, {$push: {library: bookObj}})
							.then(()=> {
								//then make sure that the updated info is returned
								User.findById(req.params.id)
									.then((user) => {
										res.status(200).json(user);
									})
									.catch(err => {
									console.log(err);
									res.status(500).json({ message: internalMsg });
								});
							})
							.catch(err => {
								console.log(err);
								res.status(500).json({ message: internalMsg });
							});
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
});

//removes the book from user library
//uses the object id of the current book entry that is being deleted
router.delete('/:id/books/:bookEntryId', (req, res) => {
	User.findById(req.params.id).populate('book')
		.then(user => {
			//assigns the library to a variable
			const userLibrary = user.library;
			let index;
			//loop through the array and get  the index of the element
			//that has the value of id equal to the bookEntryId
			for(let i=0; i<userLibrary.length; i++){
				if(userLibrary[i].id === req.params.bookEntryId){
					index = i;
				}
			}
			//remove the book in that index and create a new updated library
			const removedBook = userLibrary.splice(index, 1);
			User.findByIdAndUpdate(req.params.id, { $set: { library: userLibrary } })
				.then(() => res.status(200).json({ message: 'Book has been deleted.' }))
				.catch(err => {
					console.log(err);
					res.status(500).json({ message: internalMsg });
				});
		})
		.catch(err => {
			console.log(err);
			res.status(500).json({ message: internalMsg });
		});
});

//fetch requests depending on the queries
router.get('/:userId/requests', (req, res) => {
	let requestPromise;
	let userId = req.params.userId;
	//store the query object
	const userQueries = Object.keys(req.query);
	//first find all the requests with the userId in requestFrom or requestTo
	Request.find({ $or: [{ requestFrom: userId }, { requestTo: userId }]})
		.then(results => {
			//store the result to an array that we can filter later
			const requestResults = results;
			//if userQueries is empty, send all requests
			if(!userQueries.length){
				return res.status(400).json(requestResults);
			}
			else{
				//check if there is only one query in the array
				if(userQueries.length === 1){
					//if status is in the query
					if(userQueries[0] === 'status'){
						//filter the requestResults array
						//only return elements with the same status as the query
						const filteredStatusArray = requestResults.map(element => {
							if(element.status === req.query.status){
								return element;
							}
						});
						//return and send filtered data
						if(filteredStatusArray[0] === undefined){
							return res.status(200).json({ message: 'No request found with your criteria.' });
						}
						return res.status(200).json(filteredStatusArray);
					}
					//if origin is in the query
					else{
						//check if origin value is "me"
						if(req.query.origin === "me"){
							console.log('origin is me');
							//filter the requestResults array
							//only return elements with the userId in the requestFrom key
							const filteredStatusArray = requestResults.map(element => {
								if(element.requestFrom.toString() === userId){
									return element;
								}
							});
							//return and send filtered data
							return res.status(200).json(filteredStatusArray);
						}
						//else
						else{
							console.log('origin is not me');
							//filter the requestResults array
							//only return elements with the userId in the requestTo key
							const filteredStatusArray = requestResults.map(element => {
								if(element.requestTo.toString() === userId){
									return element;
								}
							});
							//return and send filtered data
							return res.status(200).json(filteredStatusArray);
						}
					}
				}
				//else if both status and origin is present
				else{
					console.log(userQueries);
					const status = req.query.status;
					const origin = req.query.origin;
					//if origin is me
					if(origin === "me"){
						//filter and return elements matching the query
						const filteredStatusArray = requestResults.map(element => {
							if(element.requestFrom.toString() === userId && element.status === status){
								return element;
							}
						});
						//return and send filtered data
						return res.status(200).json(filteredStatusArray);
					}
					else{
						//filter and return elements matching the query
						const filteredStatusArray = requestResults.map(element => {
							if(element.requestTo.toString() === userId && element.status === status){
								return element;
							}
						});
						//return and send filtered data
						return res.status(200).json(filteredStatusArray);
					}
				}
			}
		})
		.catch(err => {
			console.log(err);
			res.status(500).send(internalMsg);
		});
});

//create a new request
router.post('/:userId/requests', (req, res) => {
	//add all the required fields to an array
	const requiredFields = ['requestFrom', 'requestTo'];
	//loop through the array and check if all required properties are in the req body
	for(let i=0; i<requiredFields.length; i++){
		const field = requiredFields[i];
		if(!(field in req.body)){
			//if any of the field is missing
			const message = `Missing ${field} in request body.`;
			return res.status(400).json({message});
		}
	}
	//if all properties are in the request body
	//console.log('creating request');
	Request.create({
		requestFrom: req.body.requestFrom,
		requestTo: req.body.requestTo,
		requestedBook: req.body.requestedBook })
		.then(newRequest => {
			//find  the user we need to update the library using requestTo
			// console.log('request created', newRequest);
			// console.log('finding requestTo user account');
			User.findById(newRequest.requestTo)
				.then(user => {
					//console.log('found user account', user);
					//store the user's library to a variable
					const userLibrary = user.library;
					//console.log('storing library for modification', userLibrary);
					//loop through the library to check the id of the book we need to update
					for(let i=0; i<userLibrary.length; i++){
						//once the match as been found
						if(userLibrary[i].id === newRequest.requestedBook.toString()){
							//change the hasPendingRequest value to true
							userLibrary[i].hasPendingRequest = true;
							//update the user's library
							User.findByIdAndUpdate(newRequest.requestTo, {$set: {library: userLibrary}})
								.then(()=> {
									//then make sure that the updated info is returned
									User.findById(newRequest.requestTo)
										.then((user) => {
											 return res.status(200).json(user);
										})
										.catch(err => {
											console.log(err);
											res.status(500).json({ message: internalMsg });
										});
								})
								.catch(err => {
									console.log(err);
									res.status(500).send(internalMsg);
								});
						}
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
});


module.exports = router;