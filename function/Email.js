const nodemailer = require('nodemailer'),
	EmailClient = require('email-templates');

var Email = function( to, template, instance, Model, io, attachments ){
	var try_count = 0;
	var transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user:  process.env.EMAIL_USERNAME, 
			pass:  process.env.EMAIL_PASS
		}
	});
	var email = new EmailClient({
		message: {
			from: process.env.EMAIL_FROM
		},
		send: true,
		transport: transporter,
		views: {
		    options: {
		      	extension: 'handlebars'
		    }
		},
	});


	function sendEmail(){
		email.send({
			template: template,
			message: {
				to: to, //'13.7741@stis.ac.id' || 'rifka.hakim@stis.ac.id' || 
				attachments: attachments,
			},
			locals: instance,
		}).then(function(param){
			Model.update({_id: instance._id}, { isSent_email: true }).exec(function(err, status){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
				} else {
					io.sockets.to('admin').emit('email notif sent', {'_id': instance._id});
				}

			})
		}).catch(function(err){
			console.error(err)
			console.log('Gagal mengirim ke '+to)
			console.log('Mencoba mengirim kembali ke '+to);
			if( try_count === 3){
				transporter = nodemailer.createTransport({
					service: 'gmail',
					auth: {
						user:  process.env.EMAIL_USERNAME2, 
						pass:  process.env.EMAIL_PASS2
					}
				});
				email = new EmailClient({
					message: {
						from: process.env.EMAIL_FROM2
					},
					send: true,
					transport: transporter,
					views: {
					    options: {
					      	extension: 'handlebars'
					    }
					},
				});
			}
			sendEmail();
			try_count++;
			console.log(try_count)
		})
	}

	sendEmail();
}

module.exports = Email;