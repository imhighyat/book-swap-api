const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
//use ES6 promises
mongoose.Promise = global.Promise;
const {Book} = require('../models/booksModel');

router.get('/', (req, res) => {
	Book.find({})
		.then(data => {res.status(200).json(data.length); console.log(data.length)})
		.catch(err => {
			console.log(err);
			res.status(400).send(err);
		});
});

module.exports = router;
