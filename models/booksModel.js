const mongoose = require('mongoose');

const bookSchema = mongoose.Schema({
	isbn: {
		type: Array, 
		required: true
	},
	images: {
		type: Array,
		required: true
	},
	summary: {
		type: String,
		required: true
	},
	authors: {
		type: Array,
		required: true
	},
	title: {
		type: String, 
		required: true
	},
});

const Book = mongoose.model('Book', bookSchema);

module.exports = {Book};