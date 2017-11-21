const isExistOnDBForEmail = function (Model, field, value, cb){
	Model.findOne( { [field]: value } ).populate('user').exec(function( err, result ){
		if(err){
			console.log( err )
		} else if (result) {
			cb(result)
		} else {
			cb(result)
		}
	} )
}

module.exports = isExistOnDBForEmail;