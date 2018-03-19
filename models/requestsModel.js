const mongoose = require('mongoose');

const requestSchema = mongoose.Schema({
	requestDate: {
		type: Date,
		default: Date.now(),
		required: true
	},
	status: {
		type: String,
		default: "pending",
		required: true
	},
	requestFrom: {
		type: mongoose.Schema.Types.ObjectId, //string with ID of rest
		ref: 'User',
		required: true
	},
	requestTo: {
		type: mongoose.Schema.Types.ObjectId, //string with ID of rest
		ref: 'User',
		required: true
	},
	requestedBook: {
		type: mongoose.Schema.Types.ObjectId, //string with ID of rest
		ref: 'Book',
		required: true
	},
	tradedBook: {
		type: mongoose.Schema.Types.ObjectId, //string with ID of rest
		ref: 'Book',
	},
});

const Request = mongoose.model('Request', requestSchema);

module.exports = {Request};