const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
//use ES6 promises
mongoose.Promise = global.Promise;

const {User} = require('../models/usersModel');

//fetch users whether with queries or none
router.get('/', (req, res) => {
	console.log('Fetching users.');
	User.find({})
	.then(data => {
		res.status(200).json({users: data.map(user => user.serialize())});
	})
	.catch(err => {
		console.log(err);
		res.status(500).send(err);
	});
});

router.get('/:id', (req, res) => {
	User.findById(req.params.id)
	.then(data => {
		res.status(200).json(data.serialize());
	})
});

// router.post();
// router.put();
// router.delete();

module.exports = router;