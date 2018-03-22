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

//fetch requests depending on the queries
router.get('/:userId', (req, res) => {
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
						console.log(filteredStatusArray[0] === undefined);
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
router.post('/', (req, res) => {
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