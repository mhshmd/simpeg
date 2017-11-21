//====== MODUL ======//
//load framework express
var express = require('express');
var fs = require('fs');

//buat router khusus admin
var admin = express.Router();

var formidable = require('formidable');

//Flow control
var async = require('async');
var uuid = require('uuid');

//load model User
var User = require('../../model/User.model');
var Berita = require('../../model/Berita.model');
var Jabatan = require('../../model/Jabatan.model');
var NotifPangkat = require('../../model/NotifPangkat.model');
var StatusNotif = require('../../model/StatusNotif');
var NotifPangkatAtasan = require('../../model/NotifPangkatAtasan');
var NotifPangkatKepeg = require('../../model/NotifPangkatKepeg');
var NoNotif = require('../../model/NoNotif');

var levenshtein = require('fast-levenshtein');
var _ = require("underscore");

//sendNotif
var sendNotif = require('../../function/sendNotif')
var isExistOnDB = require('../../function/isExistOnDB')
var isExistOnDBForEmail = require('../../function/isExistOnDBForEmail')
var handleCallback = require('../../function/handleCallback')
var findIfContainInArrayAndRemove = require('../../function/findIfContainInArrayAndRemove')
var Email = require('../../function/Email')
var SMS = require('../SMS')
// var PangkatChecker = require('../../function/PangkatChecker')

var modem = require('modem').Modem()

// modem.open('COM17', function(err){
// 	console.log(err)
// 	console.log('Modem ready')
// })

//load crypto utk hashing password
var crypto = require('crypto');

var ObjectId = require('mongoose').Types.ObjectId;

var moment = require('moment');
moment.locale('id');

//cron like
const schedule = require('node-schedule');

var every = require('schedule').every;


//Socket.io
admin.connections = {};

admin.io;

admin.socket = function(io, connections, client){
	admin.connections = connections;

	admin.io = io;

	client.on('login_submit', function (user, cb) {
		var hash = crypto.createHmac('sha256', user.password)
                   .digest('hex');
		User.findOne({
			$and : [
		        { $or : [ { email : user.email }, { nip_lama : user.email } ] },
		        { $and : [ {'password': hash}, {isAdmin: true} ] }
		    ]
		}, function (err, user) {
			if(!user){
				cb( { valid: false, message: 'Email atau password salah.' } )
			} else {
				client.handshake.session.user = user;
        		client.handshake.session.save();
        		client.join('admin');
				cb( { valid: true } );
			}
		})
	});

	client.on('get_all_pgw', function (param, cb) {		

		User.find({}).populate('jbt_nama').exec(function(err, users){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
				} else if(users){
					cb(users)
				} else{
					cb([])
				}
			}

		})

	});

	client.on('get_pgw_byId', function (_id, cb) {		

		User.findOne({_id: _id}).populate('jbt_nama').exec(function(err, user){
			handleCallback (err, 'Server terganggu', user, null, client, cb)
		})

	});

	client.on('get_pgw_with_filter', function (q, cb) {
		q = q.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, "\\$&");

		User.find({"nama": new RegExp(q, "i")}, 'nama jbt_nama email nip_lama', function(err, matched_pegs){
    		_.each(matched_pegs, function(item, index, list){
    			matched_pegs[index].d = levenshtein.get(q, item.nama);
    		})
    		matched_pegs = _.sortBy(matched_pegs, function(o) { return o.d; })
    		cb(matched_pegs);
    	})

	});

	client.on('get_pgw_admin', function (calonAdmin, cb) {
		User.find({"isAdmin": true}, 'nama jbt_nama email nip_lama', function(err, all_admins){
    		cb(all_admins);
    	})
	});

	client.on('add_admin', function (calonAdmin, cb) {
		User.update({_id: calonAdmin._id}, {isAdmin: true}, function (err, status) {
			if(err){ 
				sendNotif(client, 'Server gangguan.');
				console.log(err);
				cb(false);
			}else{
				if(status.nModified){
					sendNotif(client, 'Admin berhasil ditambahkan');
				} else{
					sendNotif(client, 'Admin berhasil ditambahkan');
				}
				cb(true);
			}
		})
	});

	client.on('hapus_admin', function (id_admin, cb) {
		User.update({_id: id_admin}, {isAdmin: false}, function (err, status) {
			if(err){ 
				sendNotif(client, 'Server gangguan.');
				console.log(err);
				cb(false);
			}else{
				if(status.nModified){
					sendNotif(client, 'Admin berhasil dihapus');
				} else{
					sendNotif(client, 'Admin berhasil dihapus');
				}
				cb(true);
			}
		})
	});

	client.on('saveEditingPgw', function (newEditedDataPgw, cb) {
		if(newEditedDataPgw.data.password){
			newEditedDataPgw.data.password = crypto.createHmac('sha256', newEditedDataPgw.data.password).digest('hex');
		}else{
			delete newEditedDataPgw.data.password;
		}
		newEditedDataPgw.data.pkt_tmt = saveDatetoDB(newEditedDataPgw.data.pkt_tmt)
		newEditedDataPgw.data.tmt_cpns = saveDatetoDB(newEditedDataPgw.data.tmt_cpns)
		newEditedDataPgw.data.tmt_pns = saveDatetoDB(newEditedDataPgw.data.tmt_pns)
		newEditedDataPgw.data.pensiun = saveDatetoDB(newEditedDataPgw.data.pensiun)
		newEditedDataPgw.data.ttl_t = saveDatetoDB(newEditedDataPgw.data.ttl_t)
		newEditedDataPgw.data.periode_kgb = saveDatetoDB(newEditedDataPgw.data.periode_kgb)
		User.update( { _id: newEditedDataPgw._id }, newEditedDataPgw.data, function(err, status){
			if(err){ 
				sendNotif(client, 'Server gangguan.');
				console.log(err);
				cb(false);
			}else{
				if(status.nModified){
					sendNotif(client, 'Berhasil diedit');
				} else{
					sendNotif(client, 'Tidak ada perubahan');
				}
				User.findOne({_id: newEditedDataPgw._id}).populate('jbt_nama').exec(function(err, user){
					handleCallback (err, 'Server terganggu', user, null, client, cb)
					if(err) createUserPktNotif(user);
				})
			}
		} )
	});

	function saveDatetoDB(date){
		if(date){
			return moment(date, 'DD/MM/YYYY').format();
		} else {
			return null;
		}
	}

	client.on('addPgw', function (newPgw, cb) {
		console.log(newPgw)
		newPgw.data.password = crypto.createHmac('sha256', newPgw.data.password).digest('hex');
		newPgw.data.pkt_tmt = saveDatetoDB(newPgw.data.pkt_tmt)
		newPgw.data.tmt_cpns = saveDatetoDB(newPgw.data.tmt_cpns)
		newPgw.data.tmt_pns = saveDatetoDB(newPgw.data.tmt_pns)
		newPgw.data.pensiun = saveDatetoDB(newPgw.data.pensiun)
		newPgw.data.ttl_t = saveDatetoDB(newPgw.data.ttl_t)
		newPgw.data.periode_kgb = saveDatetoDB(newPgw.data.periode_kgb)
		console.log(newPgw.data)
		// newPgw.data.hkm_tmt = saveDatetoDB(newPgw.data.hkm_tmt)
		User.create( newPgw.data, function(err, status){
			if(err){ 
				sendNotif(client, 'Server gangguan.');
				console.log(err);
				cb(false);
			}else{
				sendNotif(client, 'Pegawai berhasil ditambahkan');
				User.findOne({_id: status._id}).populate('jbt_nama').exec(function(err, user){
					handleCallback (err, 'Server terganggu', user, null, client, cb)
					if(newPgw.current_photo_name !== 'nochange'){
						newPgw.data.photo = newPgw.current_photo_name;
						var photo = user._id+newPgw.current_photo_name.match(/\.\w*$/i)[0]
				    	fs.rename(__dirname + "/../../img/profile/"+newPgw.current_photo_name, __dirname + "/../../img/profile/"+photo, function(err) {
						    if ( err ) {
						    	console.log('ERROR: ' + err);
						    } else {
						    	User.update({_id: user._id}, {'photo': photo}, function(err, status){
						    		console.log('Photo berhasil diupdate');
						    	})
						    }
						    console.log('renamed')
						});
					}
				})
			}
		} )
	});

	client.on('addJabatan', function (newJbt, cb) {
		isExistOnDB( Jabatan, 'jbt_nama', newJbt.jbt_nama, function(isExist){
			if(!isExist){
				Jabatan.create( newJbt, function(err, newJbtDoc){
					if(err){ 
						sendNotif(client, 'Server gangguan.');
						console.log(err);
						cb(false);
					}else{
						sendNotif(client, 'Pejabat berhasil ditambahkan');
						Jabatan.findOne({_id: newJbtDoc._id}).populate('daftar_bawahan').exec(function( err, newJbtWithPopulate ){
							if( err ){ 
								sendNotif(client, 'Server gangguan.');
								console.log(err);
								cb(false);
							}else{
								cb( newJbtWithPopulate );
							}
						})
					}
				} )
			} else {
				sendNotif(client, 'Pejabat sudah ada');
				cb(false)
			}
		} )
	});

	client.on('editJabatan', function (newEditedJbt, cb) {
		const _id = newEditedJbt._id;
		delete newEditedJbt._id;
		Jabatan.update( {_id: _id}, newEditedJbt, function(err, status){
    		handleCallback(err, 'Server gangguan.', status, 'Berhasil diupdate.', client, cb);
		} )
	});

	client.on('hapusJabatan', function (_id, cb) {
		Jabatan.remove({_id: _id}, function(err, status){
			if( err ){ 
				sendNotif(client, 'Server gangguan.');
				console.log(err);
				cb(false);
			}else{
				sendNotif(client, 'Berhasil dihapus.');
				findIfContainInArrayAndRemove(Jabatan, 'daftar_bawahan', _id, function(status2){
					console.log(status2)
					cb( status )
				})
			}
    	})
	});

	client.on('getAllJabatan', function (raw, cb) {
		Jabatan.find({}).populate('daftar_bawahan').sort('jbt_nama').exec(function( err, all_jbt ){
			if( err ){ 
				sendNotif(client, 'Server gangguan.');
				console.log(err);
				cb(false);
			}else{
				cb( all_jbt );
			}
		})
	});

	client.on('filter_jbt', function (q, cb){
    	if(q.query == ''){
    		cb([]);
    		return;
    	}

    	q.query = q.query.replace(/[-[\]{}()*+?.,\\/^$|#\s]/g, "\\$&");

    	q.not_in.push(q.selected)
    	Jabatan.find({"jbt_nama": new RegExp(q.query, "i"), "_id": { $nin: q.not_in }}, 'jbt_nama', function(err, filtered_jbt){
    		if( err ){ 
				sendNotif(client, 'Server gangguan.');
				console.log(err);
				cb(false);
			}else{
				_.each(filtered_jbt, function(item, index, list){
	    			filtered_jbt[index].d = levenshtein.get(q.query, item.jbt_nama);
	    		})
	    		filtered_jbt = _.sortBy(filtered_jbt, function(o) { return o.d; })
	    		cb(filtered_jbt);
			}
    	})
    })

	client.on('get all pangkat notif', function (param, cb) {		

		NotifPangkat.find({}).populate({path: 'user', populate: { path: 'jbt_nama' }}).sort('time').exec(function(err, all_pkt_notif){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
				} else if(all_pkt_notif){
					cb(all_pkt_notif)
				} else{
					cb([])
				}
			}

		})

	});

	client.on('get all pangkat atasan notif', function (param, cb) {

		NotifPangkatAtasan.find({}).populate([{path: 'user', populate: { path: 'jbt_nama' }}, {path: 'stafNotif', populate: { path: 'user' }}]).sort('time').exec(function(err, all_pkt_atasan_notif){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
				} else if(all_pkt_atasan_notif){
					cb(all_pkt_atasan_notif)
				} else{
					cb([])
				}
			}

		})

	});

	client.on('get all pangkat no notif', function (param, cb) {		

		NoNotif.find({type: param}).populate([{path: 'user', populate: { path: 'jbt_nama' }}]).exec(function(err, all_pkt_no_notif){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
				} else if(all_pkt_no_notif){
					cb(all_pkt_no_notif)
				} else{
					cb([])
				}
			}

		})

	});

	client.on('get all pangkat kepeg notif', function (param, cb) {

		NotifPangkatKepeg.find({}).populate([{path: 'user', populate: { path: 'jbt_nama' }}, {path: 'stafNotif', populate: { path: 'user' }}]).exec(function(err, all_pkt_kepeg_notif){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
				} else if(all_pkt_kepeg_notif){
					cb(all_pkt_kepeg_notif)
				} else{
					cb([])
				}
			}

		})

	});

	client.on('konfirmasi notif kenaikan pangkat', function (notif, cb) {

		var Model;

		if(notif.type === 'staf'){
			Model = NotifPangkat
		} else if (notif.type === 'atasan') {
			Model = NotifPangkatAtasan;
		} else if (notif.type === 'kepeg') {
			Model = NotifPangkatKepeg;
		}	

		Model.update({_id: notif._id}, { isConfirmed: new Date() }).exec(function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					if(notif.type === 'staf'){
						all_email_kenaikan_pangkat[notif.schedule_Id]&&all_email_kenaikan_pangkat[notif.schedule_Id].cancel();
					} else if (notif.type === 'atasan') {
						all_email_kenaikan_pangkat_atasan[notif.schedule_Id]&&all_email_kenaikan_pangkat_atasan[notif.schedule_Id].cancel();
					} else if (notif.type === 'kepeg') {
						all_email_kenaikan_pangkat_pgw[notif.schedule_Id]&&all_email_kenaikan_pangkat_pgw[notif.schedule_Id].cancel();
					}
					console.log(status)
					sendNotif(client, 'Berhasil dikonfirmasi.');
					cb(new Date())
				}
			}

		})

	});

	client.on('batal konfirmasi notif kenaikan pangkat', function (notif, cb) {

		var Model;

		if(notif.type === 'staf'){
			Model = NotifPangkat
		} else if (notif.type === 'atasan') {
			Model = NotifPangkatAtasan;
		} else if (notif.type === 'kepeg') {
			Model = NotifPangkatKepeg;
		}	

		Model.update({_id: notif._id}, { $unset: {isConfirmed: 1} }).exec(function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					if(notif.type === 'staf'){
						createPktBwhanSchedule(notif, null);
					} else if (notif.type === 'atasan') {
						createAtasanPktSchedule(notif, null);
					} else if (notif.type === 'kepeg') {
						createPegPktSchedule(notif, null);
					}
					sendNotif(client, 'Berhasil dikembalikan.');
					cb(status)
				}
			}

		})

	});


	client.on('hapus notif kenaikan pangkat', function (notif, cb) {

		var Model;

		if(notif.type === 'staf'){
			Model = NotifPangkat
		} else if (notif.type === 'atasan') {
			Model = NotifPangkatAtasan;
		} else if (notif.type === 'kepeg') {
			Model = NotifPangkatKepeg;
		}

		Model.update({_id: notif._id}, { active: false }).exec(function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					if(notif.type === 'staf'){
						all_email_kenaikan_pangkat[notif.schedule_Id]&&all_email_kenaikan_pangkat[notif.schedule_Id].cancel();
					} else if (notif.type === 'atasan') {
						all_email_kenaikan_pangkat_atasan[notif.schedule_Id]&&all_email_kenaikan_pangkat_atasan[notif.schedule_Id].cancel();
					} else if (notif.type === 'kepeg') {
						all_email_kenaikan_pangkat_pgw[notif.schedule_Id]&&all_email_kenaikan_pangkat_pgw[notif.schedule_Id].cancel();
					}
					sendNotif(client, 'Berhasil dimatikan.');
					cb(status)
				}
			}

		})

	});


	client.on('restore notif kenaikan pangkat', function (notif, cb) {

		var Model;

		if(notif.type === 'staf'){
			Model = NotifPangkat
		} else if (notif.type === 'atasan') {
			Model = NotifPangkatAtasan;
		} else if (notif.type === 'kepeg') {
			Model = NotifPangkatKepeg;
		}

		Model.update({_id: notif._id}, { active: true }).exec(function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					if(notif.type === 'staf'){
						createPktBwhanSchedule(notif, null);
					} else if (notif.type === 'atasan') {
						createAtasanPktSchedule(notif, null);
					} else if (notif.type === 'kepeg') {
						createPegPktSchedule(notif, null);
					}
					sendNotif(client, 'Berhasil dihidupkan.');
					cb(status)
				}
			}

		})

	});

	client.on('ganti status', function (notif, cb) {

		NotifPangkat.update({_id: notif._id}, { $push: {status: { time: new Date(), label_id: notif.label_id, label: notif.label }} }).exec(function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					if(notif.label_id !== 'Belum ada'){
						all_email_kenaikan_pangkat[notif.schedule_Id]&&all_email_kenaikan_pangkat[notif.schedule_Id].cancel();
						var msg = `Status usulan kenaikan pangkat Anda: `+notif.label.replace(/\d*\.\s/g, "")+`.\n-Kepegawaian STIS-`;
						console.log(msg)
						modem&&SMS.sendSMS( modem, notif.data.user.telp, msg, notif.data, NotifPangkat, admin.io );
					}
					sendNotif(client, 'Berhasil diubah.');
					console.log(status)
					cb(status)
				}
			}

		})

	});


	client.on('tambah status notif', function (newStatus, cb) {
		isExistOnDB(StatusNotif, 'jenis', newStatus.jenis, function(isExist){
			if(!isExist){
				StatusNotif.create(newStatus,function(err, instance){
					if(cb){
						if(err){
							sendNotif(client, 'Server terganggu');
							console.log(err)
							cb(false)
						} else{
							sendNotif(client, 'Berhasil ditambah.');
							cb(instance)
						}
					}
				})
			} else{
				StatusNotif.findOne({jenis: newStatus.jenis, 'status.posisi': newStatus.target_posisi}, function(err, result){
					if(err){
						sendNotif(client, 'Server terganggu');
						console.log(err)
						cb(false)
					} else if(result){
						StatusNotif.update({jenis: newStatus.jenis, 'status.posisi': newStatus.target_posisi}, {'status.$.posisi': newStatus.status[0].posisi, 'status.$.label': newStatus.status[0].label}, 
			                function(err, status){
			                	if(err){
									sendNotif(client, 'Server terganggu');
									console.log(err)
									cb(false)
								} else{
									sendNotif(client, 'Berhasil dupdate.');
									cb(status)
								}
			            })
					} else {
						StatusNotif.update({jenis: newStatus.jenis}, {$push: {"status": {posisi: newStatus.status[0].posisi, label: newStatus.status[0].label}}}, 
			                function(err, status){
			                	if(err){
									sendNotif(client, 'Server terganggu');
									console.log(err)
									cb(false)
								} else{
									sendNotif(client, 'Berhasil ditambah.');
									cb(status)
								}
			            })
					}
				})
			}
		})

	});

	client.on('ambil semua status', function (jenis_notif, cb) {

		StatusNotif.findOne({jenis: jenis_notif}, function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					cb(status)
				}
			}

		})

	});

	client.on('hapus status jenis notif', function (status, cb) {

		StatusNotif.update({jenis: status.jenis}, { $pull: { status: { _id: status._id } } }, function(err, status){
            if(err){
				sendNotif(client, 'Server terganggu');
				console.log(err)
				cb(false)
			} else{
				cb(status)
			}
        })

	});

	client.on('hapus pegawai', function (_id, cb) {

		User.remove({_id: _id}, function(err, status){
            if(err){
				sendNotif(client, 'Server terganggu');
				console.log(err)
				cb(false)
			} else{
				cb(true)
			}
        })

	});

	client.on('ganti waktu kirim pkt', function (instance, cb) {

		NotifPangkat.update({_id: instance._id}, { time: instance.time }).exec(function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					if(createPktBwhanSchedule(instance, null)){
						cb(true)
						sendNotif(client, 'Berhasil diubah.');
					} else {
						cb(false)
					}
				}
			}

		})

	});

	client.on('ganti waktu kirim atasan pkt', function (instance, cb) {

		NotifPangkatAtasan.update({_id: instance._id}, { time: instance.time }).exec(function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					if(createAtasanPktSchedule(instance, null)){
						cb(true)
						sendNotif(client, 'Berhasil diubah.');
					} else {
						cb(false)
					}
				}
			}

		})

	});

	client.on('ganti waktu kirim kepeg pkt', function (instance, cb) {

		NotifPangkatKepeg.update({_id: instance._id}, { time: instance.time }).exec(function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					if(createPegPktSchedule(instance, null)){
						cb(true)
						sendNotif(client, 'Berhasil diubah.');
					} else {
						cb(false)
					}
				}
			}

		})

	});


	client.on('buat berita baru', function (newBerita, cb) {

		newBerita.penulis = client.handshake.session.user?client.handshake.session.user.nama:'Admin';

		console.log(newBerita)

		Berita.create(newBerita, function(err, berita){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					cb(berita)
				}
			}
		})

	});


	client.on('edit berita', function (packet, cb) {

		packet.data.penulis = client.handshake.session.user?client.handshake.session.user.nama:'Admin';
		packet.data.createdAt = new Date();

		Berita.update({_id: packet._id}, packet.data, function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					packet.data._id = packet._id
					cb(packet.data)
				}
			}
		})

	});


	client.on('get all berita', function (raw, cb) {
		async.parallel({
			berita: function(berita_cb){
					Berita.find({type: 'Berita'}, function(err, beritas){
						if(err){
							sendNotif(client, 'Server terganggu');
							console.log(err)
							berita_cb(err, null)
						} else{
							berita_cb(null, beritas)
						}
					})
				},
			artikel: function(artikel_cb){
					Berita.find({type: 'Artikel'}, function(err, artikels){
						if(err){
							sendNotif(client, 'Server terganggu');
							console.log(err)
							artikel_cb(err, null)
						} else{
							artikel_cb(null, artikels)
						}
					})
				}
			}, function(err, finish){
				cb(finish)
		})
	});


	client.on('hapus berita', function (_id, cb) {

		Berita.remove({_id: _id}, function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					cb(true)
				}
			}
		})

	});

	client.on('get all status', function (type, cb) {
		var Model;
		if(type === 'pangkat'){
			Model = NotifPangkat;
		}

		Model.find({user: client.handshake.session.user._id}).populate('user').exec(function(err, status){
			if(cb){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					cb(status)
				}
			}
		})

	});

}

//init schedule
var all_email_kenaikan_pangkat = {}
var all_email_kenaikan_pangkat_atasan = {}
var all_email_kenaikan_pangkat_pgw = {}

var pangkat_pkt_gol_increment = {
	'I/a': 'I/b',
	'I/b': 'I/c',
	'I/c': 'I/d',
	'I/d': 'II/a',

	'II/a': 'II/b',
	'II/b': 'II/c',
	'II/c': 'II/d',
	'II/d': 'III/a',

	'III/a': 'III/b',
	'III/b': 'III/c',
	'III/c': 'III/d',
	'III/d': 'IV/a',

	'IV/a': 'IV/b',
	'IV/b': 'IV/c',
	'IV/c': 'IV/d',
	'IV/d': 'IV/e',
}
var transformGol = {
	'I/a': '1',
	'I/b': '2',
	'I/c': '3',
	'I/d': '4',

	'II/a': '5',
	'II/b': '6',
	'II/c': '7',
	'II/d': '8',

	'III/a': '9',
	'III/b': '10',
	'III/c': '11',
	'III/d': '12',

	'IV/a': '13',
	'IV/b': '14',
	'IV/c': '15',
	'IV/d': '16',
	'IV/e': '17',
}
var transformGolCW = {
    '1':'I/a',
    '2':'I/b',
    '3':'I/c',
    '4':'I/d',

    '5':'II/a',
    '6':'II/b',
    '7':'II/c',
    '8':'II/d',

    '9':'III/a',
    '10':'III/b',
    '11':'III/c',
    '12':'III/d',

    '13':'IV/a',
    '14':'IV/b',
    '15':'IV/c',
    '16':'IV/d',
    '17':'IV/e',
}

var transformIjz = {
    '1':'SD',
    '2':'SLTP',
    '3':'SLTA',
    '4':'DIII',

    '5':'DIV',
    '6':'S1',
    '7':'S2',
    '8':'S3'
}

function isBisaNaikPkt(user, pangkat_cb){
	//validasi umum
	if(!user.pkt_gol && !user.pkt_tmt){
		NoNotif.findOne({user: user._id, type: 'pangkat'}, function(err, nonotif){
			if(!nonotif){
				var ket = 'Angka kredit tidak mencukupi.'
				NoNotif.create({user: user._id, type: 'pangat', ket: ket}, function(err, instance){
					if(err) console.log(err);
				})
			}
		})
		return false;
	}

	//validasi dosen/fungsional
	if(user.jbt_nama.type === 'Fungsional'){
		if(user.pkt_gol<9 && user.ak>=100){
			return true;
		} else if(user.pkt_gol<10 && user.ak>=150){
			return true;
		} else if(user.pkt_gol<11 && user.ak>=200){
			return true;
		} else if(user.pkt_gol<12 && user.ak>=300){
			return true;
		} else if(user.pkt_gol<13 && user.ak>=400){
			return true;
		} else if(user.pkt_gol<14 && user.ak>=550){
			return true;
		} else if(user.pkt_gol<15 && user.ak>=700){
			return true;
		} else if(user.pkt_gol<16 && user.ak>=850){
			return true;
		} else if(user.pkt_gol<17 && user.ak>=1050){
			return true;
		} else{
			NoNotif.findOne({user: user._id, type: 'pangkat'}, function(err, nonotif){
				if(!nonotif){
					var ket = 'Angka kredit tidak mencukupi.'
					NoNotif.create({user: user._id, type: 'pangkat', ket: ket}, function(err, instance){
						if(err) console.log(err);
						pangkat_cb&&pangkat_cb(null, 'Angka kredit tidak mencukupi')
						return false;
					})
				} else {
					pangkat_cb&&pangkat_cb(null, 'Angka kredit tidak mencukupi')
					return false;
				}
			})
		}
	} else {
		//validasi non fungsional
		if (user.jbt_nama.eselon === '2' && +user.pkt_gol<16 ) {
			return true
		} else if (user.jbt_nama.eselon === '3' && +user.pkt_gol<14 ) {
			return true
		} else if (user.jbt_nama.eselon === '4' && +user.pkt_gol<13 ) {
			return true
		} else if (user.pdk_ijazah === '8' && +user.pkt_gol<14 ) {
			return true
		} else if (user.pdk_ijazah === '7' && +user.pkt_gol<13 ) {
			return true
		} else if ((user.pdk_ijazah === '6' || user.pdk_ijazah === '5') && +user.pkt_gol<12 ) {
			return true
		} else if (user.pdk_ijazah === '3' && +user.pkt_gol<10 ) {
			return true
		} else if (user.pdk_ijazah === '2' && +user.pkt_gol<7 ) {
			return true
		} else if (user.pdk_ijazah === '1' && +user.pkt_gol<5 ) {
			return true
		} else{
			NoNotif.findOne({user: user._id, type: 'pangkat'}, function(err, nonotif){
				if(!nonotif){
					var ket = 'Pangkat sudah maksimal berdasarkan pendidikan/jabatan.'
					NoNotif.create({user: user._id, type: 'pangkat', ket: ket}, function(err, instance){
						if(err) console.log(err);
						pangkat_cb&&pangkat_cb(null, 'Pangkat sudah maksimal berdasarkan pendidikan/jabatan')
						return false;
					})
				} else {
					pangkat_cb&&pangkat_cb(null, 'Pangkat sudah maksimal berdasarkan pendidikan/jabatan')
					return false;
				}
			})
		}
	}
}

function createUserPktNotif(user, pangkat_cb){
	//1. cek kelayakan naik pangkat
	if(isBisaNaikPkt(user, pangkat_cb)){
		var lama_menunggu;
		var time;
		var send_time;
		var now = moment();
		var periode_kirim = 1;

		//HITUNG TMT GOL BERIKUTNYA
		//2. jika fungsional/ tdk sedang TB, email > 2 tahun
		if (user.jbt_nama.type === 'Fungsional' && !user.isTb) { //Jika Fungsional
			lama_menunggu = 2;
			time = moment(user.pkt_tmt).add(lama_menunggu, 'y');
			//3. apakah kurang dari saat ini
			if( time.isBefore(now.format()) ){
				//jika kurang ubah tahunnya jd tahun ini dan periode I
				time = moment( now.year()+'-04-01' )
				//apakah masih kurang
				if( time.isBefore(now.format()) ){
					//jika masih kurang ubah ke periode 2
					time = moment( now.year()+'-10-01' )
					//apakah kurang
					if( time.isBefore(now.format()) ){
						//jika masih kurang juga, ubah ke tahun depan periode I
						time = moment( (now.year()+1) +'-04-01' )
					}
				}
			} else{
				if(time.month() <= 3){
					time = moment( time.year() +'-10-01' )
				} else if( time.month() > 3 ) {
					time = moment( (time.year()+1) +'-04-01' )
				}
				//apakah kurang
				if( time.isBefore(now.format()) ){
					//jika masih kurang juga, ubah ke tahun depan periode I
					time = moment( (now.year()+1) +'-04-01' )
				}
			}
		} else {
			lama_menunggu = 4;
			time = moment(user.pkt_tmt).add(lama_menunggu, 'y');
			//3. apakah kurang dari saat ini
			if( time.isBefore(now.format()) ){
				//jika kurang ubah tahunnya jd tahun ini dan periode I
				time = moment( time.year() +'-04-01' )
				//apakah masih kurang
				if( time.isBefore(now.format()) ){
					//jika masih kurang ubah ke periode 2
					time = moment( time.year() +'-10-01' )
					//apakah kurang
					if( time.isBefore(now.format()) ){
						//jika masih kurang juga, ubah ke tahun depan periode I
						time = moment( (now.year()+1) +'-04-01' )
					}
				}
			} else {
				if(time.month() <= 3 ){
					time = moment( time.year() +'-04-01' )
				} else if( time.month() > 3 && time.month() <= 9 ) {
					time = moment( time.year() +'-10-01' )
				} else {
					time = moment( (time.year()+1) +'-04-01' )
				}
				//apakah kurang
				if( time.isBefore(now.format()) ){
					//jika masih kurang juga, ubah ke tahun depan periode I
					time = moment( (now.year()+1) +'-04-01' )
				}
			}
		}

		//BUAT SCHEDULE ID
		var schedule_Id = user._id

		//CEK IS EXIST IN DB
		isExistOnDBForEmail(NotifPangkat, 'schedule_Id', schedule_Id, function(data){
			// JIKA BLM ADA ==> BUAT
			if(!data){
				// HITUNG WKT KIRIM
				//1st week
				send_time = moment(time.format()).subtract(4, 'M').hour(7).minute(30);
				// apakah wkt kirim sdh lewat utk notif pertama
				if( send_time.isBefore(now.format()) ){
					//jika lewat, set periode ke 2
					send_time.add(1, 'w')
					periode_kirim = 2;
					if( send_time.isBefore(now.format()) ){
						//jika lewat, set periode ke 3
						send_time.add(1, 'w')
						periode_kirim = 3
						if( send_time.isBefore(now.format()) ){
							//jika lewat, set periode ke 4
							send_time.add(1, 'w')
							periode_kirim = 4;
						}
					}
				}

				//CEK APAKAH WAKTU KIRIM FEASIBLE
				//jk tidak feasible
				if( send_time.isBefore(now.format()) ){
					//jika masih sblm 3 bln
					if( now.isBetween( moment(time.format()).subtract(4, 'M').format(), moment(time.format()).subtract(3, 'M').format() ) ){
						//set ke 1 jam lagi
						send_time = moment().add(1, 'h').hour(7).minute(30);
					} else {
						//jika masih lewat, ubah ke periode berikutnya
						time.add(6, 'M');
						send_time = moment(time.format()).subtract(4, 'M').hour(7).minute(30);
					}
				}

				// HITUNG DEADLINE BPS & STIS
				batas_usulan_bps = moment(time.format()).subtract(2, 'M')
				batas_usulan_stis = moment(time.format()).subtract(3, 'M')

				//FOR TEST ###############################################
				// send_time = moment().add(5, 's').format();
				//simpan di db
				NotifPangkat.create({'schedule_Id': schedule_Id, 'periode_kirim': periode_kirim, 'periode_tmt': time.format(), 
					'gol_target': transformGol[pangkat_pkt_gol_increment[transformGolCW[user.pkt_gol]]], 
					'gol_now': user.pkt_gol, template: 'pangkat', 'time': send_time.format(), 'bu_stis': batas_usulan_stis.format(), 
					'bu_bps': batas_usulan_bps.format(), 'user': user._id}, function( err, instance ) {
					if( err ){ 
						console.log(err);
					}else{
						//buat objek schedule nya
						isExistOnDBForEmail(NotifPangkat, '_id', instance._id, function(data){
							createPktBwhanSchedule(data, pangkat_cb)
						})						
					}
				})
			} else { //jk sdh ada di db, cek apakah sdh ada objeknya, jika blm buat
				//adjust pkt_gol
				data.user.pkt_gol = pangkat_pkt_gol_increment[data.user.pkt_gol]
				//jika blm ada object schedule nya, buat
				if(!all_email_kenaikan_pangkat[schedule_Id] && !data.isConfirmed && data.active){
					createPktBwhanSchedule(data, pangkat_cb);
				} else {
					pangkat_cb&&pangkat_cb(null, 'notif dibuat atau sdh dikonfirmasi/tdk aktif')
				}
			}
		})
	}
}

function createPktBwhanSchedule(instance, pangkat_cb){
	// //buat objek schedule nya
	all_email_kenaikan_pangkat[instance.schedule_Id]&&all_email_kenaikan_pangkat[instance.schedule_Id].cancel();
	all_email_kenaikan_pangkat[instance.schedule_Id] = schedule.scheduleJob(instance.time, function(){
		console.log('Sending email pangkat to '+instance.user.nama+' ('+instance.user.email+')')
		instance.user.jk = instance.user.jk === 'L'?'Bapak':'Ibu';
		instance.user.pkt_gol = transformGolCW[instance.user.pkt_gol];
		instance.user.gol_target = transformGolCW[instance.gol_target]
		instance.user.periode_usul = moment(instance.periode_tmt).format('MMMM YYYY', 'id')
		instance.user.batas_usul_ke_stis = moment(instance.bu_stis).format('MMMM YYYY', 'id')
		instance.unsubscribe_token = uuid.v4()
		NotifPangkat.update({_id: instance._id}, {unsubscribe_token: instance.unsubscribe_token}, function(err, status){
			if(err) console.log(err);
		})
		var msg = `Kenaikan pangkat ke gol `+instance.user.gol_target+` dapat dilakukan di `+instance.user.periode_usul+`. Lengkapi berkas, diserahkan paling lambat 1 `+instance.user.batas_usul_ke_stis+`. Terima Kasih.\n-Kepegawaian STIS-`;
		modem&&SMS.sendSMS( modem, instance.user.telp, msg, instance, NotifPangkat, admin.io );
		new Email( instance.user.email, 'pangkat', instance, NotifPangkat, admin.io)
	});
	addPktAtasanSchedule(instance, pangkat_cb)
	return true;
}

function addPktAtasanSchedule(instance, pangkat_cb){
	//cari atasan
	Jabatan.findOne({'daftar_bawahan': instance.user.jbt_nama}, function(err, jbt){
		if(err){
			console.log(err)
			pangkat_cb&&pangkat_cb(err, null);
		} else if(jbt){
			//jika ada atasan, ambil id atasan utk buat notif baru
			User.findOne({ jbt_nama: jbt._id }, function( err, atasan ){
				//cek apakah sdh ada notif utk periode tmt
				NotifPangkatAtasan.findOne({schedule_Id: jbt._id+moment(instance.periode_tmt).unix(), 'periode_tmt': instance.periode_tmt }, function( err, scheduleAtasan ){
					if(err){
						console.log(err)
						pangkat_cb&&pangkat_cb(err, null)
					} else if (!scheduleAtasan) {
						//jk blm ada, buat
						NotifPangkatAtasan.create({'schedule_Id': jbt._id+moment(instance.periode_tmt).unix(), 'template': 'pangkat_atasan', 'time': instance.time, 'periode_kirim': instance.periode_kirim, 
							'periode_tmt': instance.periode_tmt, stafNotif: [instance._id], user: atasan._id }, function( err, atasanInstance ) {
							if( err ){ 
								console.log(err);
							}
							// pangkat_cb&&pangkat_cb(err, 'atasan notif baru dibuat');
							createAtasanPktSchedule(atasanInstance, instance, pangkat_cb)
						})
					} else { 
						//jika sdh ada, update staff
						//cek apakah sdh pernah ditambahkan
						NotifPangkatAtasan.findOne({_id: scheduleAtasan._id, stafNotif: instance._id}, function(err, notif){
							if( err ){ 
								console.log(err);
								pangkat_cb&&pangkat_cb(err, null)
							}else if(!notif){
								NotifPangkatAtasan.update({_id: scheduleAtasan._id}, { $push: {stafNotif: instance._id} }).exec(function(err, status){
									if(err){
										console.log(err)
									}
									// pangkat_cb&&pangkat_cb(err, 'atasan notif diupdate')
									createAtasanPktSchedule({'_id': scheduleAtasan._id, 'schedule_Id': jbt._id+moment(instance.periode_tmt).unix(),
											'time': instance.time, 'periode_tmt': instance.periode_tmt }, instance, pangkat_cb)
								})
							} else {
								createAtasanPktSchedule(notif, instance, pangkat_cb);
							}
						})
					}
				})
			})
		} else {
			// pangkat_cb&&pangkat_cb(err, 'tdk ada atasan')
			addPktPegawaianSchedule(instance, pangkat_cb)
		}
	})

	return true;
}

function addPktPegawaianSchedule(instance, pangkat_cb){
	//1. ambil semua jabatan
	Jabatan.find({"jbt_nama": new RegExp('kepeg', "i")}, function(err, kepeg_jabat){
		var jab = []
		_.each(kepeg_jabat, function(jbt, index, list){
			jab.push(function(jab_cb){
				User.findOne({jbt_nama: jbt._id}, function(err, staf_kepeg){
					NotifPangkatKepeg.findOne({schedule_Id: staf_kepeg._id+moment(instance.periode_tmt).unix()}, function(err, notif){
						if(!notif){
							NotifPangkatKepeg.create({'schedule_Id': staf_kepeg._id+moment(instance.periode_tmt).unix(), 'template': 'pangkat_kepeg', 'time': instance.time, 'periode_kirim': instance.periode_kirim, 
								'periode_tmt': instance.periode_tmt, stafNotif: [instance._id], user: staf_kepeg._id }, function( err, kepegInstance ) {
								if( err ){ 
									console.log(err);
								}
								!instance.periode_tmt&&console.log(instance)
								jab_cb&&jab_cb(err, 'NotifPangkatKepeg tdk diupdate')
								// pangkat_cb&&pangkat_cb(err, 'atasan notif baru dibuat');
								// createAtasanPktSchedule(atasanInstance, pangkat_cb)
							})
						} else {
							NotifPangkatKepeg.findOne({_id: notif._id, stafNotif: instance._id}, function(err, pktKepegnotif){
								if( err ){ 
									console.log(err);
								}else if(!pktKepegnotif){
									NotifPangkatKepeg.update({_id: notif._id}, { $push: {stafNotif: instance._id} }).exec(function(err, status){
										if(err){
											console.log(err)
										}
										jab_cb&&jab_cb(err, 'NotifPangkatKepeg diupdate')
										// pangkat_cb&&pangkat_cb(err, 'atasan notif diupdate')
										// createAtasanPktSchedule({'_id': scheduleAtasan._id, 'schedule_Id': jbt._id+moment(instance.periode_tmt).unix(),
												// 'time': instance.time }, pangkat_cb)
									})
								} else {
									jab_cb&&jab_cb(err, 'NotifPangkatKepeg tdk diupdate')
									// createAtasanPktSchedule(notif, pangkat_cb);
								}
							})
						}
					})
				})
			})
		})

		async.series(jab, function(err, finish){
			pangkat_cb&&pangkat_cb(null, 'kepeg pkt notif dibuat')
			return true
		})
	})
}

function createPegPktSchedule(instance, pangkat_cb){
	// //buat objek schedule nya
	all_email_kenaikan_pangkat_pgw[instance.schedule_Id]&&all_email_kenaikan_pangkat_pgw[instance.schedule_Id].cancel();
	all_email_kenaikan_pangkat_pgw[instance.schedule_Id] = schedule.scheduleJob(instance.time, function(){
		NotifPangkatKepeg.findOne({_id: instance._id}).populate([{path: 'user', populate: { path: 'jbt_nama' }}, {path: 'stafNotif', 
			populate: { path: 'user' }}]).exec(function(err, notif){
				_.each(notif.stafNotif, function(stafNotif, index, list){
					stafNotif.gol_now = transformGolCW[stafNotif.gol_now];
					stafNotif.gol_target = transformGolCW[stafNotif.gol_target]
				})
				console.log('Sending email pegawai pangkat to '+notif.user.nama+' ('+notif.user.email+')')
				notif.user.jk = notif.user.jk === 'L'?'Bapak':'Ibu';
				notif.periode_usul = moment(notif.periode_tmt).format('MMMM YYYY');
				notif.batas_usul_ke_stis = moment(notif.stafNotif[0].bu_stis).format('MMMM YYYY')
				notif.unsubscribe_token = uuid.v4()
				NotifPangkatKepeg.update({_id: instance._id}, {unsubscribe_token: notif.unsubscribe_token}, function(err, status){
					if(err) console.log(err);
				})
				new Email( notif.user.email, 'pangkat_kepeg', notif, NotifPangkatKepeg, admin.io)
		})
	});
	pangkat_cb&&pangkat_cb(null, 'pegawai pangkat schedule created')
	return true;
}

function createAtasanPktSchedule(instance, instance_bwhn, pangkat_cb){
	// //buat objek schedule nya
	all_email_kenaikan_pangkat_atasan[instance.schedule_Id]&&all_email_kenaikan_pangkat_atasan[instance.schedule_Id].cancel();
	all_email_kenaikan_pangkat_atasan[instance.schedule_Id] = schedule.scheduleJob(instance.time, function(){
		NotifPangkatAtasan.findOne({_id: instance._id}).populate([{path: 'user', populate: { path: 'jbt_nama' }}, {path: 'stafNotif', 
			populate: { path: 'user' }}]).exec(function(err, notif){
				_.each(notif.stafNotif, function(stafNotif, index, list){
					stafNotif.gol_now = transformGolCW[stafNotif.gol_now];
					stafNotif.gol_target = transformGolCW[stafNotif.gol_target]
				})
				console.log('Sending email atasan pangkat to '+notif.user.nama+' ('+notif.user.email+')')
				notif.user.jk = notif.user.jk === 'L'?'Bapak':'Ibu';
				notif.periode_usul = moment(notif.periode_tmt).format('MMMM YYYY');
				notif.batas_usul_ke_stis = moment(notif.stafNotif[0].bu_stis).format('MMMM YYYY')
				notif.unsubscribe_token = uuid.v4()
				NotifPangkatAtasan.update({_id: instance._id}, {unsubscribe_token: notif.unsubscribe_token}, function(err, status){
					if(err) console.log(err);
				})
				new Email( notif.user.email, 'pangkat_atasan', notif, NotifPangkatAtasan, admin.io)
		})
	});
	// pangkat_cb&&pangkat_cb(null, 'atasan pangkat schedule created')
	pangkat_cb&&addPktPegawaianSchedule(instance_bwhn, pangkat_cb)
	return true;
}

//ambil semua user
User.find({}).populate('jbt_nama').exec(function(err, all_users){
	//perulangan tiap user
	var pangkat_init_task = []
	_.each(all_users, function(user, index, list){
		pangkat_init_task.push(function(pangkat_cb){
			createUserPktNotif(user, pangkat_cb)
		})
	})

	async.series(pangkat_init_task, function(err, finish){
		// console.log(finish)
	})
})

// function transformIjazah(ijz){
// 	if(/S3/i.test(ijz)){
// 		return '8'
// 	}  else if(/s2/i.test(ijz)){
// 		return '7'
// 	}  else if(/s1/i.test(ijz)){
// 		return '6'
// 	}  else if(/div/i.test(ijz)){
// 		return '5'
// 	}  else if(/diii/i.test(ijz)){
// 		return '4'
// 	}  else if(/sma|slta|ma|paket\sc/i.test(ijz)){
// 		return '3'
// 	}  else if(/smp|sltp|mts|paket\sb/i.test(ijz)){
// 		return '2'
// 	}  else if(/sd|mi|paket\sa/i.test(ijz)){
// 		return '1'
// 	} else {
// 		return ijz
// 	}
// }

// User.find({}).populate('jbt_nama').exec(function(err, all_users){
// 	function add2y(momentDate){
// 		if(momentDate.add(2, 'y').isBefore(moment())){
// 			return add2y(momentDate);
// 		} else {
// 			return momentDate
// 		}
// 	}
// 	_.each(all_users, function(user, index, list){
// 		// console.log(user.pkt_tmt)
// 		// console.log(moment(user.pkt_tmt, "DD/MM/YYYY"))
// 		// User.update({_id: user._id}, {email: user.nip_lama+'@stis.ac.id'}, function(err, status){
// 		// 	console.log(status)
// 		// })
// 		// if( moment(user.pkt_tmt).format('D/MM/YYYY').charAt(0) !== '1' ){
// 		// 	console.log(moment(user.pkt_tmt).format('DD/MM/YYYY'))
// 		// 	User.update({_id: user._id}, {pkt_tmt: moment(moment(user.pkt_tmt).format('MM/DD/YYYY'), 'DD/MM/YYYY').format()}, function(err, status){
// 		// 		console.log(status)
// 		// 	})
// 		// }

// 		// if(/\d{6}/.test(user.nip_baru.substring(8, 14))){
// 		// 	User.update({_id: user._id}, {tmt_cpns: moment(user.nip_baru.substring(8, 14), 'YYYYMM').format()}, function(err, status){
// 		// 		console.log(status)
// 		// 	})
// 		// }

// 		// User.update({_id: user._id}, {password: crypto.createHmac('sha256', user.nip_lama).digest('hex')}, function(err, status){
// 		// 	console.log(status)
// 		// })

// 		// if(/\d{8}/.test(user.nip_baru.substring(0, 8))){
// 		// 	User.update({_id: user._id}, {ttl_t: moment(user.nip_baru.substring(0, 8), 'YYYYMMDD').format()}, function(err, status){
// 		// 		console.log(status)
// 		// 	})
// 		// }

// 		// if(moment(user.nip_baru.substring(8, 14), 'YYYYMM').add(32, 'y').isAfter(moment())){
// 		// 	User.update({_id: user._id}, {periode_kgb: add2y(moment(user.nip_baru.substring(8, 14), 'YYYYMM')).format()}, function(err, status){
// 		// 		console.log(status)
// 		// 	})
// 		// } else {
// 		// 	User.update({_id: user._id}, {$unset: {periode_kgb: 1}}, function(err, status){
// 		// 		console.log(status)
// 		// 	})
// 		// }

// 		// 1. FILTER 32 TH KE BAWAH (TMT CPNS + 32 > NOW)
// 		// 2. TMT CPNS += 2 THN SAMPAI >= now()
// 		// 3. SIMPAN DB



// 		// User.update({_id: user._id}, {bup: user.jbt_nama.bup}, function(err, status){
// 		// 	console.log(status)
// 		// })

		
// 		// User.update({_id: user._id}, {pkt_tmt: moment(moment(user.pkt_tmt).format('DD/MM/YYYY'), 'MM/DD/YYYY').format()}, function(err, status){
// 		// 	console.log(status)
// 		// })
// 		// Jabatan.findOne({jbt_nama: user.jbt_nama}, function(err, res){
// 		// 	if(res){
// 		// 		User.update({_id: user._id}, {jbt_nama: res._id}, function(err, status){
// 		// 			console.log(status)
// 		// 		})
// 		// 	} else {
// 		// 		User.update({_id: user._id}, {$unset: {jbt_nama:1}}, function(err, status){
// 		// 			console.log(status)
// 		// 		})
// 		// 	}
// 		// })
// 		// if(user.telp.charAt(0) == `8`){
// 		// 	User.update({_id: user._id}, {telp: '0'+user.telp}, function(err, status){
// 		// 		console.log(status)
// 		// 	})
// 		// }
		
// 	})
// })

admin.get('/', function(req, res){
	if(req.session.user || req.cookies.user){
		if(!req.cookies.user){
			res.cookie('user', req.session.user);
		} else if (!req.session.user) {
			req.session.user = req.cookies.user;
		}
		if(!req.session.user.isAdmin){
			res.clearCookie('user');
			req.session.destroy();
			res.redirect('/admin/login');
		} else {
			res.render('admin/pegawai_admin', {layout: 'admin_layout', nama: req.session.user.nama});
		}
		return;
	}

	res.redirect('/admin/login');
});

//login
admin.get('/login', function(req, res){
	res.render('admin/login_admin', {layout: false});
});

//menu pegawai
admin.get('/pegawai', function(req, res){
	res.render('admin/pegawai_admin', {layout: false});
});

//menu pegawai
admin.get('/pegawai/pengaturan', function(req, res){
	res.render('admin/pengaturan_pgw_admin', {layout: false});
});

//menu pegawai
admin.get('/notifikasi', function(req, res){
	res.render('admin/notifikasi_admin', {layout: false});
});

//menu pegawai
admin.get('/notifikasi/pengaturan', function(req, res){
	res.render('admin/pengaturan_notifikasi_admin', {layout: false});
});

//menu pegawai
admin.get('/berita', function(req, res){
	res.render('admin/berita_admin', {layout: false});
});

//menu pegawai
admin.get('/administrator', function(req, res){
	res.render('admin/administrator_admin', {layout: false});
});

//menu pegawai
admin.get('/logout', function(req, res){
	res.clearCookie('user');
	req.session.destroy();
	res.redirect('/admin/login');
});

module.exports = admin;