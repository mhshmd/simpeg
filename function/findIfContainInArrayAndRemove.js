const findIfContainInArrayAndRemove = function (Model, field, value, cb){
	Model.update( { }, { $pull: { [field]: value } }, { multi: true }, function( err, result ){
		if(err){
			console.log( err )
		} else if (result) {
			cb(result)
		} else {
			cb(result)
		}
	} )
}

module.exports = findIfContainInArrayAndRemove;