const isExistOnDB = function (Model, field, value, cb){
	Model.findOne( { [field]: value }, '_id', function( err, result ){
		if(err){
			console.log( err )
		} else if (result) {
			cb(result)
		} else {
			cb(result)
		}
	} )
}

module.exports = isExistOnDB;