var sendNotif = require('./sendNotif')

const handleCallback = function (err, errMsg, respond, successMsg, client, cb) {
  	if( err ){ 
		errMsg&&sendNotif(client, errMsg);
		console.log(err);
		cb(false);
	}else{
		successMsg&&sendNotif(client, successMsg);
		cb( respond );
	}
}

module.exports = handleCallback;