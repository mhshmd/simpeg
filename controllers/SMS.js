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
		receiver: process.env.SMS_DEV2 || to,
		encoding: '7bit',
	}

	if(!to){
		console.log('SMS: '+to+' tidak valid')
		return;
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

