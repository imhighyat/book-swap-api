const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
	name: {
		firstName: {type: String, required: true},
		lastName: {type: String, required: true}
	},
	email: {
		type: String,
		required: true
	},
	username: {
		type: String,
		required: true
	},
	password: {
		type: String,
		required: true
	},
	phoneNumber: {
		type: String,
		required: true
	},
	address: {
		street: {type: String, required: true},
		city: {type: String, required: true},
		state: {type: String, required: true},
		zip: {type: String, required: true}
	},
	memberSince: {
		type: Date,
		required: true,
		default: Date.now
	},
	isActive: {
		type: Boolean,
		required: true,
		default: true
	}
});

userSchema.virtual('fullName').get(function(){
	return `${this.name.firstName} ${this.name.lastName}`;
});
userSchema.virtual('fullAddress').get(function(){
	return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zip}`;
});

userSchema.methods.serialize = function() {
  return {
    id: this._id,
    name: this.fullName,
    address: this.fullAddress,
    username: this.username,
    password: this.password,
    email: this.email,
    phoneNumber: this.phoneNumber
  };
}

const User = mongoose.model('User', userSchema);

module.exports = {User};