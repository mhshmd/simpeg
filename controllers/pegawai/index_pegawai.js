//====== MODUL ======//
//load framework express
var express = require('express');

//buat router khusus beranda/home
var index = express.Router();

//load model User
var User = require('../../model/User.model');
var NotifPangkat = require('../../model/NotifPangkat.model');
var NotifPangkatAtasan = require('../../model/NotifPangkatAtasan');
var NotifPangkatKepeg = require('../../model/NotifPangkatKepeg');

//load crypto utk hashing password
var crypto = require('crypto');

//Socket.io
index.connections = {};

index.io;

index.socket = function(io, connections, client){
	index.connections = connections;

	index.io = io;

	client.on('login_submit_pgw', function (user, cb) {
		var hash = crypto.createHmac('sha256', user.password)
                   .digest('hex');
		User.findOne({
			$and : [
		        { $or : [ { email : user.email }, { nip_lama : user.email } ] },
		        { 'password': hash }
		    ]
		}, function (err, user) {
			if(!user){
				cb( { valid: false, message: 'Email atau password salah.' } )
			} else {
				client.handshake.session.user = user;
        		client.handshake.session.save();
				cb( { valid: true } );
			}
		})
	});

}

index.get('/', function(req, res){
	if(req.session.user || req.cookies.user){
		if(!req.cookies.user){
			res.cookie('user', req.session.user);
		} else if (!req.session.user) {
			req.session.user = req.cookies.user;
		}
		res.render('blank', {nama: req.session.user.nama});
	} else {
		res.redirect('login');
	}
});

index.get('/beranda', function(req, res){
	res.render('pegawai/beranda_pegawai', {layout: false});
});

index.get('/biodata', function(req, res){
	res.render('pegawai/biodata_pegawai', {layout: false});
});

index.get('/status', function(req, res){
	res.render('pegawai/status_pegawai', {layout: false});
});

//login
index.get('/login', function(req, res){
	res.render('pegawai/login_pegawai', {layout: false});
});

index.get('/logout', function(req, res){
	res.clearCookie('user');
	req.session.destroy();
	res.redirect('/login');
});

index.get('/konfirmasi/:type/:token', function(req, res){
	console.log(req.params)
	if(req.params.type === 'pb'){
		NotifPangkat.update({unsubscribe_token: req.params.token}, {isConfirmed: new Date()}, function(err, status){
			if(status.nModified){
				res.render('pegawai/konfirmasi_notif_pegawai', {layout: false});
			} else {
				res.send('Link tidak berlaku.')
			}
		})
	} else if (req.params.type === 'pa') {
		NotifPangkatAtasan.update({unsubscribe_token: req.params.token}, {isConfirmed: new Date()}, function(err, status){
			if(status.nModified){
				res.render('pegawai/konfirmasi_notif_pegawai', {layout: false});
			} else {
				res.send('Link tidak berlaku.')
			}
		})
	} else if (req.params.type === 'pk') {
		NotifPangkatKepeg.update({unsubscribe_token: req.params.token}, {isConfirmed: new Date()}, function(err, status){
			if(status.nModified){
				res.render('pegawai/konfirmasi_notif_pegawai', {layout: false});
			} else {
				res.send('Link tidak berlaku.')
			}
		})
	}else {
		res.send('Link tidak dikenal.')
	}
});

module.exports = index;