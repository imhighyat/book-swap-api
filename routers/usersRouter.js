const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
//use ES6 promises
mongoose.Promise = global.Promise;

const {User} = require('../models/usersModel');
const internalMessage = 'Internal server error occured.';

//fetch users whether with queries or none
router.get('/', (req, res) => {
	console.log('Fetching users.');
	let userPromise;
	const active = req.query.active;
	if(typeof(active) === "undefined"){
		userPromise = User.find();
	}
	else if(typeof(active) === "string" && (active === "true" || active === "false")){
		userPromise = User.find({isActive: active});
	}
	else{
		const message = 'Query value unexpected.';
		return res.status(400).send(message);
	}

	userPromise
	.then(data => {
		//res.status(200).json({users: data.map(user => user.serialize())});
		res.status(200).json(data);
	})
	.catch(err => {
		console.log(err);
		res.status(500).send(internalMessage);
	});
});

router.get('/:id', (req, res) => {
	User.findById(req.params.id)
	.then(data => {
		//res.status(200).json(data.serialize());
		res.status(200).json(data);
	})
	.catch(err => {
		console.log(err);
		res.status(500).send(internalMessage);
	});
});

router.post('/', (req, res) => {
	const requiredFields = ['name', 'username', 'password', 'email', 'phoneNumber', 'address', 'library'];
	//use for loop to check if all required properties are in the req body
	for(let i=0; i<requiredFields.length; i++){
		const field = requiredFields[i];
		if(!(field in req.body)){
			const message = `Missing ${field} in request body.`;
			//console error the message if at least one is missing
			console.error(message);
			//return with a 400 staus and the error message
			return res.status(400).send(message);
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

router.put('/:id', (req, res) => {
	// ensure that the id in the request path and the one in request body match
	if(!(req.params.id === req.body.id)){
		const message = `The request path ID ${req.params.id} and request body ID ${req.body.id} should match.`;
		console.error(message);
		return res.status(400).send(message);
	}
	//we need something to hold what the updated data should be
	const toUpdate = {};
	//properties that client can update
	const canBeUpdated = ['email', 'password', 'phoneNumber', 'address'];
	//loop through the properties that can be updated
	//check if client sent in updated data for those
	for(let i=0; i<canBeUpdated.length;i++){
		const field = canBeUpdated[i];
		//if the property is in the req body and it is not null
		if(field in req.body && req.body.field !== null){
			//start adding the properties to the toUpdate object
			toUpdate[field] = req.body[field];
		}
	}
	//update the database by finding the id first using the id from req
	//then set the data to update
	User.findByIdAndUpdate(req.params.id, {$set: toUpdate})
	.then(()=>{
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
	.then(()=> res.status(200).send('Account disabled.'))
	.catch(err => {
		console.log(err);
		res.status(400).send(internalMsg)
	});
});

module.exports = router;