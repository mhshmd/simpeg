const _ = require("underscore");

const sendNotification = function (client, message){
	if(_.isString(message)){
		client.emit('messages', message)
	} else{
		console.log('Message [to client error]: Invalid User ID or Message : ', message)
	}
}

module.exports = sendNotification;