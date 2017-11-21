// var modem = require('modem').Modem()

// modem.open('COM14', function(){
// 	console.log('Modem ready')

// 	modem.sms(msg, function(err, references){
// 		console.log('sendSMS', err, references)
// 	})

// 	//delivery
// 	modem.on('delivery', function(obj){
// 		console.log('SMS ke '+obj.sender+' (ref: '+obj.reference+') '+(obj.status==='00'?'berhasil':'gagal')+' dikirim.')
// 	})

// 	//receive sms
// 	modem.on('sms received', function(obj){
// 		console.log('receivedSMS', obj)
// 	})
// })

var SMS = {};

SMS.sendSMS = function( modem, to, msg, instance, Model, io ){
	var msg = {
		text: msg,
		receiver: to,//'082311897547' || '081802750960' || 
		encoding: '7bit',
	}

	modem.sms(msg, function(err, references){
		console.log('sendSMS to '+ msg.receiver, err, references)
		if(!err){
			if(references[0]){
				Model.update({_id: instance._id}, { isSent_sms: true }).exec(function(err, status){
					if(err){
						sendNotif(client, 'Server terganggu');
						console.log(err)
					} else {
						io.sockets.to('admin').emit('email notif sent', {'_id': instance._id});
					}
				})
			}
		}
	})

}

module.exports = SMS;

