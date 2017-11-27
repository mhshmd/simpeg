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
var JK = require('../../model/JK.model');

var StatusNotif = require('../../model/StatusNotif.model');
var JenisHukuman = require('../../model/JenisHukuman.model.js');

var NotifPangkat = require('../../model/NotifPangkat.model');
var NotifPangkatAtasan = require('../../model/NotifPangkatAtasan.model.js');
var NotifPangkatKepeg = require('../../model/NotifPangkatKepeg.model');
var NoNotif = require('../../model/NoNotif.model');

var NotifKGB = require('../../model/NotifKGB.model');
var NotifKGBAtasan = require('../../model/NotifKGBAtasan.model');
var NotifKGBKepeg = require('../../model/NotifKGBKepeg.model');

var NotifPensiun = require('../../model/NotifPensiun.model');
var NotifPensiunAtasan = require('../../model/NotifPensiunAtasan.model');
var NotifPensiunKepeg = require('../../model/NotifPensiunKepeg.model');

var NotifHukuman = require('../../model/NotifHukuman.model');
var NotifHukumanAtasan = require('../../model/NotifHukumanAtasan.model');
var NotifHukumanKepeg = require('../../model/NotifPangkatKepeg.model');

var NotifPenghargaan = require('../../model/NotifPenghargaan.model');
var NotifPenghargaanAtasan = require('../../model/NotifPenghargaanAtasan.model');
var NotifPenghargaanKepeg = require('../../model/NotifPenghargaanKepeg.model');

var NotifAbsensi = require('../../model/NotifAbsensi.model');


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

// modem.open('COM7', function(err){
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

		User.find({}).populate('jbt_nama hkm_jenis').exec(function(err, users){
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
		if(newEditedDataPgw.data.hkm_jenis === 'tidak ada'){
			delete newEditedDataPgw.data.hkm_jenis;
		}
		newEditedDataPgw.data.pkt_tmt = saveDatetoDB(newEditedDataPgw.data.pkt_tmt)
		newEditedDataPgw.data.tmt_cpns = saveDatetoDB(newEditedDataPgw.data.tmt_cpns)
		newEditedDataPgw.data.tmt_pns = saveDatetoDB(newEditedDataPgw.data.tmt_pns)
		newEditedDataPgw.data.pensiun = saveDatetoDB(newEditedDataPgw.data.pensiun)
		newEditedDataPgw.data.ttl_t = saveDatetoDB(newEditedDataPgw.data.ttl_t)
		newEditedDataPgw.data.periode_kgb = saveDatetoDB(newEditedDataPgw.data.periode_kgb)
		newEditedDataPgw.data.hkm_tmt = saveDatetoDB(newEditedDataPgw.data.hkm_tmt)
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
				User.findOne({_id: newEditedDataPgw._id}).populate('jbt_nama hkm_jenis').exec(function(err, user){
					user&&listenUserChanges(user);
					handleCallback (err, 'Server terganggu', user, null, client, cb)
					if(err) console.log(err);
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

	client.on('getAllHukuman', function (raw, cb) {
		JenisHukuman.find({}).sort('hkm_label').exec(function( err, all_hkm ){
			if( err ){ 
				sendNotif(client, 'Server gangguan.');
				console.log(err);
				cb(false);
			}else{
				cb( all_hkm );
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

	client.on('get all notif', function (param, cb) {
		var notif_type = getType(param);

        if(notif_type){
        	var query = {};
        	if(notif_type.match(/_no/i)){
        		query = {type: notif_type.replace(/\_no/g, "")};
        	}
        	console.log(query)
        	getScheduleModelCenter(notif_type).find(query).populate(getSchedulePath(notif_type)).sort('time').exec(function(err, all_notif){
				if(cb){
					if(err){
						sendNotif(client, 'Server terganggu');
						console.log(err)
					} else if(all_notif){
						cb(all_notif)
					} else{
						cb([])
					}
				}

			})
        } else {
        	cb([])
        }
	});

	client.on('konfirmasi notif', function (data, cb) {
		var notif_type = getType(data.param);

		var time = new Date()
        if(notif_type){
        	getScheduleModelCenter(notif_type).update({_id: data.data._id}, { isConfirmed: time }).exec(function(err, status){
				if(cb){
					if(err){
						sendNotif(client, 'Server terganggu');
						console.log(err)
						cb(false)
					} else{
						console.log(status)
						sendNotif(client, 'Berhasil dikonfirmasi.');
						cb(time)
					}
				}

			})
        }
	});

	client.on('batal konfirmasi', function (data, cb) {
		var notif_type = getType(data.param);

		if(notif_type){
        	getScheduleModelCenter(notif_type).update({_id: data.data._id}, { $unset: {isConfirmed: 1} }).exec(function(err, status){
				if(cb){
					if(err){
						sendNotif(client, 'Server terganggu');
						console.log(err)
						cb(false)
					} else{
						sendNotif(client, 'Berhasil dikembalikan.');
						cb(status)
						// createScheduleOnServer(notif_type, data.data.schedule_Id, data.data.time, getScheduleModelCenter(notif_type), 
						// 	getSchedulePath(notif_type), getMiddleVarTransform(notif_type), function(){
						// 	sendNotif(client, 'Berhasil dikembalikan.');
						// 	cb(status)
						// })
					}
				}

			})
        }

	});


	client.on('hapus notif', function (data, cb) {
		var notif_type = getType(data.param);

		if(notif_type){
        	getScheduleModelCenter(notif_type).update({_id: data.data._id}, { active: false }).exec(function(err, status){
				if(cb){
					if(err){
						sendNotif(client, 'Server terganggu');
						console.log(err)
						cb(false)
					} else{
						sendNotif(client, 'Berhasil dimatikan.');
						cb(status)
					}
				}
			})
        }

	});


	client.on('restore notif kenaikan pangkat', function (data, cb) {

		var notif_type = getType(data.param);

		if(notif_type){
        	getScheduleModelCenter(notif_type).update({_id: data.data._id}, { active: true }).exec(function(err, status){
				if(cb){
					if(err){
						sendNotif(client, 'Server terganggu');
						console.log(err)
						cb(false)
					} else{
						sendNotif(client, 'Berhasil dihidupkan.');
						cb(status)
					}
				}

			})
        }

	});

	client.on('ganti status', function (notif, cb) {
		var update;
		if( notif.label_id === 'Belum ada'){
			update = {$unset: {status:1, isConfirmed: 1}}
		} else {
			update = { isConfirmed: new Date(), $push: {status: { time: new Date(), label_id: notif.label_id, label: notif.label }} }
		}

		NotifPangkat.update({_id: notif._id}, update).exec(function(err, status){
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

	client.on('tambah hukum notif', function (jenis_hukum, cb) {

		JenisHukuman.findOne({hkm_label: jenis_hukum.hkm_label}, function(err, jenis){
			if(!jenis){
				JenisHukuman.create(jenis_hukum, function(err, newJenis){
					if(err) console.log(err);
					sendNotif(client, 'Berhasil ditambah.');
					cb(newJenis)
				})
			} else {
				sendNotif(client, 'Hukuman sudah ada.');
				cb(jenis)
			}

		})

	});

	client.on('edit hukum notif', function (new_edited, cb) {
		var _id = new_edited._id;
		delete new_edited._id

		JenisHukuman.update({_id: _id}, new_edited, function(err, status){
			if(err){
				sendNotif(client, 'Server terganggu');
				console.log(err)
				cb(false)
			} else{
				cb(status)
			}
		})
	});

	client.on('ambil semua hukuman', function (jenis_notif, cb) {

		JenisHukuman.find({}).sort('hkm_jenis').exec(function(err, status){
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

		if(status.hkm_label){
			JenisHukuman.remove({_id: status._id}, function(err, status){
				if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else {
					cb(true)
				}
			})
		} else {
			StatusNotif.update({jenis: status.jenis}, { $pull: { status: { _id: status._id } } }, function(err, status){
	            if(err){
					sendNotif(client, 'Server terganggu');
					console.log(err)
					cb(false)
				} else{
					cb(status)
				}
	        })
		}
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

	client.on('ganti waktu kirim', function (data, cb) {

		var notif_type = getType({tabel: data.tabel, tab: data.tab});

        if(notif_type){
        	getScheduleModelCenter(notif_type).update({_id: data.instance._id}, { time: data.instance.time }).exec(function(err, status){
				if(cb){
					if(err){
						sendNotif(client, 'Server terganggu');
						console.log(err)
						cb(false)
					} else{
						createScheduleOnServer(notif_type, data.instance.schedule_Id, data.instance.time, getScheduleModelCenter(notif_type), getSchedulePath(notif_type), getMiddleVarTransform(notif_type), function(){
							cb(true)
							sendNotif(client, 'Berhasil diubah.');
						});
					}
				}
			})
        }		

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
					Berita.find({type: 'Berita'}).sort({'createdAt': -1}).exec(function(err, beritas){
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
					Berita.find({type: 'Artikel'}).sort({'createdAt': -1}).exec(function(err, artikels){
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

// ########### >> LISTEN
function listenUserChanges(user){
	//hukuman
	if(user.hkm_tmt){
		completeScheduleCreating('hukuman', user, filterHukuman, newHukumanObjectConstructor, getMiddleVarTransform('hukuman'), null, null)
	}
	//jabatan
	if(user.jbt_nama){
		Jabatan.update({_id: user.jbt_nama._id}, {user: user._id}, function(err, status){
			console.log('Jabatan has been updated.');
		})
		
	}
}

//init schedule

function isBisaNaikPkt(user, pangkat_cb){
	//validasi umum
	if(!user.pkt_gol && !user.pkt_tmt){
		NoNotif.findOne({user: user._id, type: 'pangkat'}, function(err, nonotif){
			if(!nonotif){
				var ket = 'Golongan/TMT Pangkat blm ditentukan.'
				NoNotif.create({user: user._id, type: 'pangkat', ket: ket}, function(err, instance){
					if(err) console.log(err);
				})
			}
		})
		pangkat_cb&&pangkat_cb(null, 'Angka kredit tidak mencukupi')
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

// ##################################################################
// ############### GETTER (Model, populate, ScheduleID) #############
function getType(param){
	//pangkat
	if ( param.tabel === 'staf' && param.tab === 'pangkat_tab' ) {
        return 'pangkat';
    } if ( param.tabel === 'atasan' && param.tab === 'pangkat_tab' ) {
        return 'pangkat_atasan';
    } else if ( param.tabel === 'kepeg' && param.tab === 'pangkat_tab' ) {
        return 'pangkat_kepeg';
    } else if ( param.tabel === 'no' && param.tab === 'pangkat_tab' ) {
        return 'pangkat_no';
    } else 
    //kgb
    if ( param.tabel === 'staf' && param.tab === 'kgb_tab' ) {
        return 'kgb';
    } if ( param.tabel === 'atasan' && param.tab === 'kgb_tab' ) {
        return 'kgb_atasan';
    } else if ( param.tabel === 'kepeg' && param.tab === 'kgb_tab' ) {
        return 'kgb_kepeg';
    } else
    //pensiun
    if ( param.tabel === 'staf' && param.tab === 'pensiun_tab' ) {
        return 'pensiun';
    } if ( param.tabel === 'atasan' && param.tab === 'pensiun_tab' ) {
        return 'pensiun_atasan';
    } else if ( param.tabel === 'kepeg' && param.tab === 'pensiun_tab' ) {
        return 'pensiun_kepeg';
    } else 
    //penghargaan
    if ( param.tabel === 'staf' && param.tab === 'ptj_tab' ) {
        return 'penghargaan';
    } if ( param.tabel === 'atasan' && param.tab === 'ptj_tab' ) {
        return 'penghargaan_atasan';
    } else if ( param.tabel === 'kepeg' && param.tab === 'ptj_tab' ) {
        return 'penghargaan_kepeg';
    } else if ( param.tabel === 'no' && param.tab === 'ptj_tab' ) {
        return 'penghargaan_no';
    } else 
    //hukuman
    if ( param.tabel === 'staf' && param.tab === 'phd_tab' ) {
        return 'hukuman';
    } if ( param.tabel === 'atasan' && param.tab === 'phd_tab' ) {
        return 'hukuman_atasan';
    } else if ( param.tabel === 'kepeg' && param.tab === 'phd_tab' ) {
        return 'hukuman_kepeg';
    } else 
    //presensi
    if( param.tabel === 'staf' && param.tab === 'presensi_tab' ){
        return 'absensi';
    }
}

function getScheduleIDCenter(type, dasar_instance, opt_instance){
	if (type === 'pangkat') {
		return dasar_instance._id+dasar_instance.pkt_gol
	} else if (type === 'pangkat_atasan') {
		return dasar_instance._id+moment(opt_instance.periode_tmt).unix()
	} else if (type === 'pangkat_kepeg') {
		return dasar_instance._id+moment(opt_instance.periode_tmt).unix()
	} else

	if(type === 'kgb'){
		return dasar_instance._id;
	} else if (type === 'kgb_atasan') {
		return dasar_instance._id+moment(opt_instance.user.periode_kgb).unix()
	} else if (type === 'kgb_kepeg') {
		return dasar_instance._id+moment(opt_instance.user.periode_kgb).unix()
	} else 

	if(type === 'pensiun'){
		return dasar_instance._id;
	} else if (type === 'pensiun_atasan') {
		return dasar_instance._id
	} else if (type === 'pensiun_kepeg') {
		return dasar_instance._id
	} else 

	if(type === 'penghargaan'){
		var romawi;
		var startTime = moment(dasar_instance.tmt_cpns);
		const masa_kerja = moment.duration(moment().diff(startTime)).asYears()
		if( masa_kerja >= 30){
			romawi = 'XXX';
		} else if ( masa_kerja >= 20 ) {
			romawi = 'XX';
		} else {
			romawi = 'X';
		}
		return dasar_instance._id+romawi;
	} else if (type === 'penghargaan_atasan') {
		return dasar_instance._id
	} else if (type === 'penghargaan_kepeg') {
		return dasar_instance._id
	} else 

	if(type === 'hukuman'){
		return dasar_instance._id;
	} else if (type === 'hukuman_atasan') {
		return dasar_instance._id
	} else if (type === 'hukuman_kepeg') {
		return dasar_instance._id
	} else 

	if(type === 'absensi'){
		return dasar_instance._id;
	}
}

function getScheduleModelCenter(type){
	if(type === 'pangkat'){
		return NotifPangkat;
	} else if(type === 'pangkat_atasan'){
		return NotifPangkatAtasan;
	} else if(type === 'pangkat_no'){
		return NoNotif;
	} else if(type === 'pangkat_kepeg'){
		return NotifPangkatKepeg;
	} else

	if(type === 'kgb'){
		return NotifKGB;
	} else if (type === 'kgb_atasan') {
		return NotifKGBAtasan
	} else if (type === 'kgb_kepeg') {
		return NotifKGBKepeg
	} else 

	if(type === 'pensiun'){
		return NotifPensiun
	} else if (type === 'pensiun_atasan') {
		return NotifPensiunAtasan
	} else if (type === 'pensiun_kepeg') {
		return NotifPensiunKepeg
	} else 

	if(type === 'penghargaan'){
		return NotifPenghargaan;
	} else if (type === 'penghargaan_atasan') {
		return NotifPenghargaanAtasan
	} else if (type === 'penghargaan_kepeg') {
		return NotifPenghargaanKepeg
	} else if(type === 'penghargaan_no'){
		return NoNotif;
	} else 

	if(type === 'hukuman'){
		return NotifHukuman
	} else if (type === 'hukuman_atasan') {
		return NotifHukumanAtasan
	} else if (type === 'hukuman_kepeg') {
		return NotifHukumanKepeg
	} else 

	if(type === 'absensi'){
		return NotifAbsensi;
	}
}
function getSchedulePath(type){
	if(type === 'pangkat'){
		return {path: 'user', populate: { path: 'jbt_nama jk' }};
	} else if(type === 'pangkat_atasan'){
		return [{path: 'jbt_nama', populate: { path: 'user', populate: { path: 'jk' } }}, {path: 'stafNotif', populate: { path: 'user' }}];
	} else if(type === 'pangkat_no'){
		return [{path: 'user', populate: { path: 'jbt_nama' }}];
	} else if(type === 'pangkat_kepeg'){
		return [{path: 'user', populate: { path: 'jbt_nama jk' }}, {path: 'stafNotif', populate: { path: 'user' }}];
	} else

	if(type === 'kgb'){
		return {path: 'user', populate: { path: 'jbt_nama jk' }};
	} else if (type === 'kgb_atasan') {
		return [{path: 'jbt_nama', populate: { path: 'user', populate: { path: 'jk' } }}, {path: 'stafNotif', populate: { path: 'user' }}];
	} else if (type === 'kgb_kepeg') {
		return [{path: 'user', populate: { path: 'jbt_nama jk' }}, {path: 'stafNotif', populate: { path: 'user' }}];
	} else 

	if(type === 'pensiun'){
		return {path: 'user', populate: { path: 'jbt_nama jk' }}
	} else if (type === 'pensiun_atasan') {
		return [{path: 'jbt_nama', populate: { path: 'user', populate: { path: 'jk' } }}, {path: 'stafNotif', populate: { path: 'user' }}];
	} else if (type === 'pensiun_kepeg') {
		return [{path: 'user', populate: { path: 'jbt_nama jk' }}, {path: 'stafNotif', populate: { path: 'user' }}];
	} else 

	if(type === 'penghargaan'){
		return {path: 'user', populate: { path: 'jbt_nama jk hkm_jenis' }}
	} else if (type === 'penghargaan_atasan') {
		return [{path: 'jbt_nama', populate: { path: 'user', populate: { path: 'jk' } }}, {path: 'stafNotif', populate: { path: 'user' }}];
	} else if (type === 'penghargaan_kepeg') {
		return [{path: 'user', populate: { path: 'jbt_nama jk' }}, {path: 'stafNotif', populate: { path: 'user' }}];
	} else if(type === 'penghargaan_no'){
		return [{path: 'user', populate: { path: 'jbt_nama' }}];
	} else 

	if(type === 'hukuman'){
		return {path: 'user', populate: { path: 'jbt_nama jk hkm_jenis' }}
	} else if (type === 'hukuman_atasan') {
		return [{path: 'jbt_nama', populate: { path: 'user', populate: { path: 'jk' } }}, {path: 'stafNotif', populate: { path: 'user' }}];
	} else if (type === 'hukuman_kepeg') {
		return [{path: 'user', populate: { path: 'jbt_nama jk hkm_jenis' }}, {path: 'stafNotif', populate: { path: 'user' }}];
	} else 

	if(type === 'absensi'){
		return [{path: 'user', populate: { path: 'jbt_nama jk' }}];
	}
}

function getMiddleVarTransform(type){
	if(type === 'pangkat'){
		return middleTransformPAngkat;
	} else if(type === 'pangkat_atasan'){
		return middleTransformPktAtasan;
	} else if(type === 'pangkat_kepeg'){
		return middleTransformPktKepeg;
	} else 

	if(type === 'kgb'){
		return middleTransformKGB;
	} else if(type === 'kgb_atasan'){
		return middleTransformKGBAtasan;
	} else if(type === 'kgb_kepeg'){
		return middleTransformKGBKepeg;
	}else 

	if(type === 'pensiun'){
		return middleTransformPensiun;
	} else if(type === 'pensiun_atasan'){
		return middleTransformPensiunAtasan;
	} else if(type === 'pensiun_kepeg'){
		return middleTransformPensiunKepeg;
	} else 

	if(type === 'absensi'){
		return middleTransformAbsensi;
	} else {
		return '';
	}
}


function getObjectNotif(type){
	if(type === 'pangkat'){
		return all_email_kenaikan_pangkat;
	} else if(type === 'pangkat_atasan'){
		return all_email_kenaikan_pangkat_atasan;
	} else if(type === 'pangkat_kepeg'){
		return all_email_kenaikan_pangkat_pgw;
	} else

	if(type === 'kgb'){
		return master_schedule_kgb;
	} else if (type === 'kgb_atasan') {
		return master_schedule_kgb_atasan
	} else if (type === 'kgb_kepeg') {
		return master_schedule_kgb_kepeg
	} else 

	if(type === 'pensiun'){
		return master_schedule_pensiun
	} else if (type === 'pensiun_atasan') {
		return master_schedule_pensiun_atasan
	} else if (type === 'pensiun_kepeg') {
		return master_schedule_pensiun_kepeg
	} else 

	if(type === 'penghargaan'){
		return master_schedule_penghargaan
	} else if (type === 'penghargaan_atasan') {
		return master_schedule_penghargaan_atasan
	} else if (type === 'penghargaan_kepeg') {
		return master_schedule_penghargaan_kepeg
	} else 

	if(type === 'hukuman'){
		return master_schedule_hukuman
	} else if (type === 'hukuman_atasan') {
		return master_schedule_hukuman_atasan
	} else if (type === 'hukuman_kepeg') {
		return master_schedule_hukuman_kepeg
	} else 

	if(type === 'absensi'){
		return master_schedule_absensi;
	}
}

function getAttachment(type){
	if(type === 'pensiun'){
		return {   // file on disk as an attachment
            filename: 'Formulir Pensiun.pdf',
            path: __dirname+'/../../docs/Formulir Pensiun.pdf' // stream this file
        }
	} else {
		return null;
	}
}

function createNoNotif(type, user, ket, cb){
	NoNotif.findOne({user: user._id, type: type}, function(err, nonotif){
		if(!nonotif){
			NoNotif.create({user: user._id, type: type, ket: ket}, function(err, instance){
				if(err) console.log(err);
				cb&&cb(null, false)
			})
		} else {
			cb&&cb(null, false)
		}
	})
}

// ##################################################################
// #################### BUAT SCHEDULE & SMS TEMPLATE ################

function smsTemplate(template, scheduleDB){
	if(template === 'pangkat'){
		return `Kenaikan pangkat ke gol `+scheduleDB.gol_target+` dapat dilakukan di `+scheduleDB.periode_tmt+`. Lengkapi berkas, diserahkan paling lambat 1 `+scheduleDB.bu_stis+`. Terima Kasih.\n-Kepegawaian STIS-`;
	} else if(template === 'kgb'){
		return `Kenaikan Gaji Berkala `+scheduleDB.user.jk.label2+` akan dilakukan pada `+scheduleDB.user.periode_kgb+`. Lengkapi berkas, diserahkan paling lambat `+scheduleDB.bu_stis+`. Terima Kasih\n-Kepegawaian STIS-`;
	} else if(template === 'pensiun'){
		return `Pensiun `+scheduleDB.user.jk.label2+` akan jatuh pada `+scheduleDB.user.pensiun+`. Mohon segera mengajukan usulan, informasi lebih lanjut hub Subbag. Kepegawaian STIS. Terima Kasih\n-Kepegawaian STIS-`
	} else if(template === 'penghargaan'){
		return `Anda telah memenuhi syarat masa kerja untuk Satyalancana Karya Satya. Untuk informasi lebih lanjut hub Subbag. Kepegawaian STIS. Terima Kasih\n-Kepegawaian STIS-`;
	} else if(template === 'hukuman'){
		return `Masa Hukuman Disiplin `+scheduleDB.user.jk.label2+` akan segera berakhir. Untuk informasi lebih lanjut hubungi Subbagian Kepegawaian STIS. Terima Kasih\n-Kepegawaian STIS-`
	} else if(template === 'absensi'){
		return `Harap segera periksa status kehadiran `+scheduleDB.user.jk.label2+`. Penyerahan memo presensi ditutup tgl `+moment().set('date', 30).format('DD MMMM YYYY')+` pukul 15.00 WIB.\n-Kepegawaian STIS-`
	}
}

// ##################################################################
// ######################### CORE FUNCTION ##########################

function completeScheduleCreating(type, instance, filterFunc, newObjectConstructorFunc, middleVarTransformForNotifFunc, stafInstance, cb){
	async.auto({
		filter: function(filter_cb){
			filterFunc(instance, filter_cb)
		},
		create: ['filter', function(result, create_cb){
			if(result.filter){
				//cek db
				getScheduleModelCenter(type).findOne({'schedule_Id': getScheduleIDCenter(type, instance, stafInstance), active: true}, function(err, scheduleDB){
					if(err){
						console.log(err);
						create_cb&&create_cb(null, type+': gagal cek notif')
						return;
					} else if (scheduleDB) {
						//jika ada, langsung buat schedule
						if(!isAtasan(type)){
							createScheduleOnServer( type, getScheduleIDCenter(type, instance), scheduleDB.time, getScheduleModelCenter(type), getSchedulePath(type), middleVarTransformForNotifFunc, create_cb );
						} else {
							if(isAtasan(type)){
								getScheduleModelCenter(type).findOne({'schedule_Id': getScheduleIDCenter(type, instance, stafInstance), active: true, stafNotif: stafInstance._id}, function(err, result){
									if(!result){
										getScheduleModelCenter(type).update({'schedule_Id': getScheduleIDCenter(type, instance, stafInstance), active: true}, { $push: {stafNotif: stafInstance._id} }, function(err, status){
											createScheduleOnServer( type, getScheduleIDCenter(type, instance, stafInstance), scheduleDB.time, getScheduleModelCenter(type), getSchedulePath(type), middleVarTransformForNotifFunc, create_cb );
										})
									} else {
										createScheduleOnServer( type, getScheduleIDCenter(type, instance, stafInstance), scheduleDB.time, getScheduleModelCenter(type), getSchedulePath(type), middleVarTransformForNotifFunc, create_cb );
									}
								})
							} else {
								createScheduleOnServer( type, getScheduleIDCenter(type, instance), scheduleDB.time, getScheduleModelCenter(type), getSchedulePath(type), middleVarTransformForNotifFunc, create_cb );
							}
						}
					} else {
						//jika blm ada, buat schedule di db, lalu di server
						getScheduleModelCenter(type).create(newObjectConstructorFunc(instance, stafInstance), function(err, scheduleDB){
							if(err){
								console.log(err);
								create_cb(null, type+': gagal buat notif di DB')
							} else {
								createScheduleOnServer( type, getScheduleIDCenter(type, instance, stafInstance), scheduleDB.time, getScheduleModelCenter(type), getSchedulePath(type), middleVarTransformForNotifFunc, create_cb )
							}
						})
					}
				})
			} else {
				create_cb(null, type+': instance tdk memenuhi syarat')
			}
			
		}]
	}, function(err, finish){
		cb&&cb(null, 'schedule created')
	})
}

function createScheduleOnServer(type, schedule_Id, time, Model, populateVar, middleVarTransformForNotifFunc, cb){
	//is sent to false
	Model.update( { schedule_Id: schedule_Id }, { isSent_email: false, isSent_sms: false }, function(err, status){
		if(err) console.log(err)
	});
	//update next time
	Model.findOne({ schedule_Id: schedule_Id, active: true }).populate(populateVar).exec(function(err, scheduleDB){
		if(scheduleDB){
			if(scheduleDB.period_current<scheduleDB.period_max){
				if(scheduleDB.period_interval && scheduleDB.period_interval_type){
					var new_time = moment(time).add(scheduleDB.period_interval, scheduleDB.period_interval_type).format()
					if(scheduleDB.period_interval===99){
						new_time = moment(time).add(1, scheduleDB.period_interval_type).format();
					}
					Model.update( { schedule_Id: schedule_Id }, { time_next: new_time }, function(err, status){
						//notif reset db
						rescheduleTimeSchedule(type, schedule_Id, new_time, Model, populateVar)
					});
				}
			}
		}
	})
	//hapus schedule sebelumnya
	getObjectNotif(type)[schedule_Id]&&getObjectNotif(type)[schedule_Id].cancel();
	//buat schedule
	getObjectNotif(type)[schedule_Id] = schedule.scheduleJob(time, function(){
		//ambil schedule di database
		Model.findOne({ schedule_Id: schedule_Id, active: true }).populate(populateVar).exec(function(err, scheduleDB){
			console.log(scheduleDB)
			if(scheduleDB){
				if(!scheduleDB.isConfirmed){
					var scheduleDB = scheduleDB.toObject()
					middleVarTransformForNotifFunc&&middleVarTransformForNotifFunc(scheduleDB)
					//jika support email, kita kirim email
					if(scheduleDB.support_email){
						//jika periode masih ada
						if(scheduleDB.period_current<=scheduleDB.period_max){
							var to;
							if(scheduleDB.user){
								to = scheduleDB.user.email
							} else if (scheduleDB.jbt_nama) {
								to = scheduleDB.jbt_nama.user.email;
							}
							new Email( to, scheduleDB.template, scheduleDB, Model, admin.io, getAttachment(type)) //( to, template, instance, Model, io, attachments )
						}else {
							//jika periode habis, matikan schedule ini
							getObjectNotif(type)[schedule_Id]&&getObjectNotif(type)[schedule_Id].cancel();
						}
					}
					//jika support email, kita kirim email
					if(scheduleDB.support_sms){
						//jika periode masih ada
						if(scheduleDB.period_current<=scheduleDB.period_max){
							console.log(smsTemplate(scheduleDB.template, scheduleDB))
							modem&&SMS.sendSMS( modem, scheduleDB.user.telp, smsTemplate(scheduleDB.template, scheduleDB), scheduleDB, Model, admin.io ); //( modem, to, msg, instance, Model, io )
						}else {
							//jika periode habis, matikan schedule ini
							getObjectNotif(type)[schedule_Id]&&getObjectNotif(type)[schedule_Id].cancel();
						}
					}

					//re-schedule
					if(scheduleDB.period_current<scheduleDB.period_max){
						if(scheduleDB.period_interval && scheduleDB.period_interval_type){
							var new_time = moment(time).add(scheduleDB.period_interval, scheduleDB.period_interval_type).format()
							if(scheduleDB.period_interval===99){
								new_time = moment(time).add(1, scheduleDB.period_interval_type).format();
							}
							Model.update( { schedule_Id: schedule_Id }, { time_next: new_time }, function(err, status){
								//notif next period
								createScheduleOnServer(type, schedule_Id, new_time, Model, populateVar, middleVarTransformForNotifFunc);
							});
						}
					}
				} else {
					//jika hari ini lebih lama + periode terakhir tambah 1 periode
					if( moment().isAfter( moment(time).add(7, 'd').format() )){
						console.log('reschedule')
					}
				}
			}
		})
	});

	if(isSupportAtasan(type)){
		async.auto({
			getSchedule: function(user_cb){
				Model.findOne({ schedule_Id: schedule_Id, active: true }).populate(populateVar).exec(function(err, scheduleDB){
					user_cb(null, scheduleDB)
				})
			},
			getAtasanJbt: [ 'getSchedule', function(result, atasan_cb){
				Jabatan.findOne({daftar_bawahan: result.getSchedule.user.jbt_nama._id}).populate('user').exec(function(err, atasan_jbt){
					if(atasan_jbt){
						//pangkat atasan
						if(type === 'pangkat'){
							completeScheduleCreating('pangkat_atasan', atasan_jbt, filterPktAtasan, newPktAtasanObjectConstructor, getMiddleVarTransform('pangkat_atasan'), result.getSchedule, atasan_cb);
						} else if (type === 'kgb') {
							completeScheduleCreating('kgb_atasan', atasan_jbt, filterKGBAtasan, newKGBAtasanObjectConstructor, getMiddleVarTransform('kgb_atasan'), result.getSchedule, atasan_cb);
						} else if (type === 'pensiun') {
							completeScheduleCreating('pensiun_atasan', atasan_jbt, filterPensiunAtasan, newPensiunAtasanObjectConstructor, getMiddleVarTransform('pensiun_atasan'), result.getSchedule, atasan_cb);
						} else{
							atasan_cb(null, {jbt: null, stafNotif: result.getSchedule})
						}
					} else {
						atasan_cb(null, {jbt: null, stafNotif: result.getSchedule})
					}
				})
			}],
			getAdmin: function(admins_cb){
				User.find({ isAdmin: true }).exec(function(err, admins){
					admins_cb(null, admins)
				})
			},
			handlePktAdmin: [ 'getSchedule','getAdmin', function(result, admin_cb){
				var task = [];
				_.each(result.getAdmin, function(admin, index, list){
					task.push(function(task_cb){
						//pangkat kepeg
						if(type === 'pangkat'){
							completeScheduleCreating('pangkat_kepeg', admin, filterPktKepeg, newPktKepegObjectConstructor, null, result.getSchedule, task_cb)
						} else if(type === 'kgb'){
							completeScheduleCreating('kgb_kepeg', admin, filterKGBKepeg, newKGBKepegObjectConstructor, null, result.getSchedule, task_cb)
						} else {
							task_cb&&task_cb(null, 'ok')
						}
					})
				})
				async.series(task, function(err, final){
					admin_cb(null, 'ok')
				})
			}],
		}, function(err, finish){
			if(cb) cb(null, 'berhasil buat schedule')
		})
	} else {
		if(cb) cb(null, 'berhasil buat schedule')
	}
}

function isSupportAtasan(type){
	if(type === 'pangkat'){
		return true;
	} else if(type === 'kgb'){
		return true;
	} else if(type === 'pensiun'){
		return true;
	} else if(type === 'penghargaan'){
		return true;
	} else if(type === 'hukuman'){
		return true;
	} else {
		false;
	}
}

function isAtasan(type){
	if(type === 'pangkat_atasan'){
		return true;
	} else if(type === 'pangkat_kepeg'){
		return true;
	} else if(type === 'kgb_atasan'){
		return true;
	} else if(type === 'kgb_kepeg'){
		return true;
	} else if(type === 'pensiun_atasan'){
		return true;
	} else if(type === 'pensiun_kepeg'){
		return true;
	} else if(type === 'penghargaan_atasan'){
		return true;
	} else if(type === 'penghargaan_kepeg'){
		return true;
	} else if(type === 'hukuman_atasan'){
		return true;
	} else if(type === 'hukuman_kepeg'){
		return true;
	} else {
		false;
	}
}

var resetTimeSchedule = {};
function rescheduleTimeSchedule(type, schedule_Id, time_next, Model, populateVar){
	//hapus schedule sebelumnya
	getObjectNotif(type)[schedule_Id+'resetDBTime']&&getObjectNotif(type)[schedule_Id+'resetDBTime'].cancel();
	//buat schedule
	getObjectNotif(type)[schedule_Id+'resetDBTime'] = schedule.scheduleJob(moment(time_next).subtract(1, 'd').format(), function(){
		Model.findOne({ schedule_Id: schedule_Id, active: true }).populate(populateVar).exec(function(err, scheduleDB){
			if(err) console.log(err)
				if(scheduleDB){
					if(scheduleDB.period_interval && scheduleDB.period_interval_type && scheduleDB.isConfirmed){
						//update periode
						scheduleDB.period_current++
						//jika absensi
						if(scheduleDB.period_interval===99){
							scheduleDB.period_current--
						}
						Model.update( { schedule_Id: schedule_Id }, { time: time_next, period_current: scheduleDB.period_current, isSent_email: false, isSent_sms: false }, function(err, status){
							//update time_next
							var new_time;
							if(scheduleDB.period_current<scheduleDB.period_max){
								new_time = moment(scheduleDB.time_next).add(scheduleDB.period_interval, scheduleDB.period_interval_type).format()
								if(scheduleDB.period_interval===99){
									new_time = moment(scheduleDB.time_next).add(1, scheduleDB.period_interval_type).format();
								}
								Model.update( { schedule_Id: schedule_Id }, { time_next: new_time }, function(err, status){
									if(err) console.log(err)
								})
							} else {
								Model.update( { schedule_Id: schedule_Id }, {$unset: {time_next:1}}, function(err, status){
									if(err) console.log(err)
								})
							}
						});
					} else {
						
					}
				}
		})
	})
}

// ##################################################################
// ######################### PANGKAT STAF ###########################
//penampung notif
var all_email_kenaikan_pangkat = {}
//fungsi pendukung
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

//filter
function filterPangkatStaf(user, pangkat_cb){
	//validasi umum
	if(!user.pkt_gol && !user.pkt_tmt){
		NoNotif.findOne({user: user._id, type: 'pangkat'}, function(err, nonotif){
			if(!nonotif){
				var ket = 'Data Pangkat/ TMT Pangkat tidak ada.'
				NoNotif.create({user: user._id, type: 'pangkat', ket: ket}, function(err, instance){
					if(err) console.log(err);
					pangkat_cb&&pangkat_cb(null, false)
					return false;
				})
			} else {
				pangkat_cb&&pangkat_cb(null, false)
				return false;
			}
		})
	}

	//validasi dosen/fungsional
	if(user.jbt_nama.type === 'Fungsional'){
		if(user.pkt_gol<9 && user.ak>=100){
			pangkat_cb&&pangkat_cb(null, true)
			return true;
		} else if(user.pkt_gol<10 && user.ak>=150){
			pangkat_cb&&pangkat_cb(null, true)
			return true;
		} else if(user.pkt_gol<11 && user.ak>=200){
			pangkat_cb&&pangkat_cb(null, true)
			return true;
		} else if(user.pkt_gol<12 && user.ak>=300){
			pangkat_cb&&pangkat_cb(null, true)
			return true;
		} else if(user.pkt_gol<13 && user.ak>=400){
			pangkat_cb&&pangkat_cb(null, true)
			return true;
		} else if(user.pkt_gol<14 && user.ak>=550){
			pangkat_cb&&pangkat_cb(null, true)
			return true;
		} else if(user.pkt_gol<15 && user.ak>=700){
			pangkat_cb&&pangkat_cb(null, true)
			return true;
		} else if(user.pkt_gol<16 && user.ak>=850){
			pangkat_cb&&pangkat_cb(null, true)
			return true;
		} else if(user.pkt_gol<17 && user.ak>=1050){
			pangkat_cb&&pangkat_cb(null, true)
			return true;
		} else{
			NoNotif.findOne({user: user._id, type: 'pangkat'}, function(err, nonotif){
				if(!nonotif){
					var ket = 'Angka kredit tidak mencukupi.'
					NoNotif.create({user: user._id, type: 'pangkat', ket: ket}, function(err, instance){
						if(err) console.log(err);
						pangkat_cb&&pangkat_cb(null, false)
						return false;
					})
				} else {
					pangkat_cb&&pangkat_cb(null, false)
					return false;
				}
			})
		}
	} else {
		//validasi non fungsional
		if (user.jbt_nama.eselon === '2' && +user.pkt_gol<16 ) {
			pangkat_cb&&pangkat_cb(null, true)
			return true
		} else if (user.jbt_nama.eselon === '3' && +user.pkt_gol<14 ) {
			pangkat_cb&&pangkat_cb(null, true)
			return true
		} else if (user.jbt_nama.eselon === '4' && +user.pkt_gol<13 ) {
			pangkat_cb&&pangkat_cb(null, true)
			return true
		} else if (user.pdk_ijazah === '8' && +user.pkt_gol<14 ) {
			pangkat_cb&&pangkat_cb(null, true)
			return true
		} else if (user.pdk_ijazah === '7' && +user.pkt_gol<13 ) {
			pangkat_cb&&pangkat_cb(null, true)
			return true
		} else if ((user.pdk_ijazah === '6' || user.pdk_ijazah === '5') && +user.pkt_gol<12 ) {
			pangkat_cb&&pangkat_cb(null, true)
			return true
		} else if (user.pdk_ijazah === '3' && +user.pkt_gol<10 ) {
			pangkat_cb&&pangkat_cb(null, true)
			return true
		} else if (user.pdk_ijazah === '2' && +user.pkt_gol<7 ) {
			pangkat_cb&&pangkat_cb(null, true)
			return true
		} else if (user.pdk_ijazah === '1' && +user.pkt_gol<5 ) {
			pangkat_cb&&pangkat_cb(null, true)
			return true
		} else{
			NoNotif.findOne({user: user._id, type: 'pangkat'}, function(err, nonotif){
				if(!nonotif){
					var ket = 'Pangkat sudah maksimal berdasarkan pendidikan/jabatan.'
					NoNotif.create({user: user._id, type: 'pangkat', ket: ket}, function(err, instance){
						if(err) console.log(err);
						pangkat_cb&&pangkat_cb(null, false)
						return false;
					})
				} else {
					pangkat_cb&&pangkat_cb(null, false)
					return false;
				}
			})
		}
	}
}

//fungsi objek baru
function newPangkatStafObjectConstructor(user){
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
			send_time = moment().add(1, 'h').hour(7).minute(30).second(0);
		} else {
			//jika masih lewat, ubah ke periode berikutnya
			time.add(6, 'M');
			send_time = moment(time.format()).subtract(4, 'M').hour(7).minute(30).second(0);
		}
	}

	// HITUNG DEADLINE BPS & STIS
	batas_usulan_bps = moment(time.format()).subtract(2, 'M')
	batas_usulan_stis = moment(time.format()).subtract(3, 'M')

	return {'schedule_Id': getScheduleIDCenter('pangkat', user), 'period_current': periode_kirim, period_max: 4, period_interval: 7, period_interval_type: 'd', 'periode_tmt': time.format(), 
		'gol_target': transformGol[pangkat_pkt_gol_increment[transformGolCW[user.pkt_gol]]], 
		'gol_now': user.pkt_gol, template: 'pangkat', 'time': send_time.format(), time_next: send_time.add(7, 'd'), 'bu_stis': batas_usulan_stis.format(), 
		'bu_bps': batas_usulan_bps.format(), 'user': user._id}
}

//middle variable transform function
function middleTransformPAngkat(scheduleDB){
		if(scheduleDB.gol_target) scheduleDB.gol_target = transformGolCW[scheduleDB.gol_target];
		if(scheduleDB.periode_tmt) scheduleDB.periode_tmt = moment(scheduleDB.periode_tmt).format('MMMM YYYY')
		if(scheduleDB.bu_stis) scheduleDB.bu_stis = moment(scheduleDB.bu_stis).format('MMMM YYYY')
		scheduleDB.unsubscribe_token = uuid.v4()
		getScheduleModelCenter('pangkat').update({_id: scheduleDB._id}, {unsubscribe_token: scheduleDB.unsubscribe_token}, function(err, status){
			if(err) console.log(err);
		})
		return scheduleDB;
}

//init
function initPangkat(all_users){
	var absensi_init_task = []
	_.each(all_users, function(user, index, list){
		absensi_init_task.push(function(cb){
			completeScheduleCreating('pangkat', user, filterPangkatStaf, newPangkatStafObjectConstructor, middleTransformPAngkat, null, cb)
		})
	})

	async.series(absensi_init_task, function(err, finish){
		console.log('init pangkat selesai')
	}); 
}

// ##################################################################
// ######################### PANGKAT ATASAN #########################
//penampung notif
var all_email_kenaikan_pangkat_atasan = {}
//fungsi objek baru

//filter
function filterPktAtasan(jbt, cb){
	if(jbt.daftar_bawahan.length > 0){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newPktAtasanObjectConstructor(jbt, stafNotif){
	return {schedule_Id: getScheduleIDCenter('pangkat_atasan', jbt, stafNotif), template: 'pangkat_atasan', time: stafNotif.time, 
		'periode_tmt': stafNotif.periode_tmt, stafNotif: [stafNotif._id], period_current: 1, period_max: 1, period_interval: 7, period_interval_type: 'd', jbt_nama: jbt._id }

}

//middle variable transform function
function middleTransformPktAtasan(scheduleDB){
	_.each(scheduleDB.stafNotif, function(stafNotif, index, list){
		stafNotif.gol_now = transformGolCW[stafNotif.gol_now];
		stafNotif.gol_target = transformGolCW[stafNotif.gol_target]
	})
	console.log(scheduleDB)
	scheduleDB.periode_usul = moment(scheduleDB.periode_tmt).format('MMMM YYYY');
	scheduleDB.batas_usul_ke_stis = moment(scheduleDB.stafNotif[0].bu_stis).format('MMMM YYYY')
	return scheduleDB;
}

//init

// ##################################################################
// ######################### PANGKAT KEPEG ##########################
//penampung notif
var all_email_kenaikan_pangkat_pgw = {}

//filter
function filterPktKepeg(user, cb){
	if(user.isAdmin){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newPktKepegObjectConstructor(user, stafNotif){
	return {schedule_Id: getScheduleIDCenter('pangkat_kepeg', user, stafNotif), template: 'pangkat_kepeg', time: stafNotif.time, 
		'periode_tmt': stafNotif.periode_tmt, stafNotif: [stafNotif._id], period_current: 1, period_max: 1, period_interval: 7, period_interval_type: 'd', user: user._id }

}

//middle variable transform function
function middleTransformPktKepeg(scheduleDB){
	_.each(scheduleDB.stafNotif, function(stafNotif, index, list){
		stafNotif.gol_now = transformGolCW[stafNotif.gol_now];
		stafNotif.gol_target = transformGolCW[stafNotif.gol_target]
	})
	scheduleDB.periode_usul = moment(scheduleDB.periode_tmt).format('MMMM YYYY');
	scheduleDB.batas_usul_ke_stis = moment(scheduleDB.stafNotif[0].bu_stis).format('MMMM YYYY')
	scheduleDB.unsubscribe_token = uuid.v4()
	getScheduleModelCenter('pangkat_kepeg').update({_id: scheduleDB._id}, {unsubscribe_token: scheduleDB.unsubscribe_token}, function(err, status){
		if(err) console.log(err);
	})
	return scheduleDB;
}

//init

// ##################################################################
// ######################### KGB STAF ##########################
//penampung notif
var master_schedule_kgb = {}
//filter
function filterKGB(user, cb){
	if(user.periode_kgb){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newKGBObjectConstructor(user){
	return {schedule_Id: getScheduleIDCenter('kgb', user), template: 'kgb', time: moment(user.periode_kgb).subtract(3, 'M').hour(7).minute(30).second(0).format(),
		period_current: 1, period_max: 2, period_interval: 15, period_interval_type: 'd', user: user._id }

}
//middle variable transform function
function middleTransformKGB(scheduleDB){
	scheduleDB.user.periode_kgb = moment(scheduleDB.user.periode_kgb).format('MMMM YYYY');
	scheduleDB.bu_stis = moment(scheduleDB.user.periode_kgb).subtract(3, 'M').format('DD MMMM YYYY');
	scheduleDB.unsubscribe_token = uuid.v4()
	getScheduleModelCenter('kgb').update({_id: scheduleDB._id}, {unsubscribe_token: scheduleDB.unsubscribe_token}, function(err, status){
		if(err) console.log(err);
	})
	return scheduleDB;
}

//init
function initKGB(all_users){
	var KGB_init_task = []
	_.each(all_users, function(user, index, list){
		KGB_init_task.push(function(cb){
			completeScheduleCreating('kgb', user, filterKGB, newKGBObjectConstructor, middleTransformKGB, null, cb)
		})
	})

	async.series(KGB_init_task, function(err, finish){
		console.log('init kgb staf selesai')
	}); 
}

// ##################################################################
// ######################### KGB ATASAN ##########################
//penampung notif
var master_schedule_kgb_atasan = {}
//filter
function filterKGBAtasan(jbt, cb){
	if(jbt.daftar_bawahan.length > 0){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newKGBAtasanObjectConstructor(jbt, stafNotif){
	return {schedule_Id: getScheduleIDCenter('kgb_atasan', jbt, stafNotif), template: 'kgb_atasan', time: stafNotif.time, 'periode_kgb': stafNotif.user.periode_kgb, 
	stafNotif: [stafNotif._id], period_current: 1, period_max: 1, period_interval: 15, period_interval_type: 'd', jbt_nama: jbt._id }
}

//middle variable transform function
function middleTransformKGBAtasan(scheduleDB){
	_.each(scheduleDB.stafNotif, function(stafNotif, index, list){
		console.log(stafNotif)
		stafNotif.user.tmt_cpns = moment(stafNotif.user.tmt_cpns).format('DD MMMM YYYY')
		stafNotif.user.periode_kgb = moment(stafNotif.user.periode_kgb).format('DD MMMM YYYY')
	})
	scheduleDB.periode_kgb = moment(scheduleDB.periode_kgb).format('DD MMMM YYYY');
	return scheduleDB;
}

//init

// ##################################################################
// ######################### KGB KEPEG ##########################
//penampung notif
var master_schedule_kgb_kepeg = {}

//fungsi objek baru

//filter
function filterKGBKepeg(user, cb){
	if(user.isAdmin){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newKGBKepegObjectConstructor(user, stafNotif){
	return {schedule_Id: getScheduleIDCenter('kgb_kepeg', user, stafNotif), template: 'kgb_kepeg', time: stafNotif.time, 'periode_kgb': stafNotif.user.periode_kgb,
		stafNotif: [stafNotif._id], period_current: 1, period_max: 1, period_interval: 7, period_interval_type: 'd', user: user._id }
}

//middle variable transform function
function middleTransformKGBKepeg(scheduleDB){
	_.each(scheduleDB.stafNotif, function(stafNotif, index, list){
		stafNotif.user.tmt_cpns = moment(stafNotif.user.tmt_cpns).format('DD MMMM YYYY')
		stafNotif.user.periode_kgb = moment(stafNotif.user.periode_kgb).format('DD MMMM YYYY')
	})
	scheduleDB.periode_kgb = moment(scheduleDB.periode_kgb).format('DD MMMM YYYY');
	return scheduleDB;
}

//init

// ##################################################################
// ######################### PENSIUN STAF ##########################
//penampung notif
var master_schedule_pensiun = {}
//filter
function filterPensiun(user, cb){
	if(moment(user.pensiun).subtract(13, 'M').isAfter(moment())){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newPensiunObjectConstructor(user){
	return {schedule_Id: getScheduleIDCenter('pensiun', user), template: 'pensiun', time: moment(user.pensiun).subtract(13, 'M').hour(7).minute(30).second(0).format(), 
		period_current: 1, period_max: 1, period_interval: 1, period_interval_type: 'y', user: user._id }

}
//middle variable transform function
function middleTransformPensiun(scheduleDB){
	scheduleDB.user.ttl_t = moment(scheduleDB.user.ttl_t).format('DD MMMM YYYY');
	scheduleDB.user.pensiun = moment(scheduleDB.user.pensiun).format('DD MMM YYYY');
	return scheduleDB;
}

//init
function initPensiun(all_users){
	var pensiun_init_task = []
	_.each(all_users, function(user, index, list){
		pensiun_init_task.push(function(cb){
			completeScheduleCreating('pensiun', user, filterPensiun, newPensiunObjectConstructor, middleTransformPensiun, null, cb)
		})
	})

	async.series(pensiun_init_task, function(err, finish){
		console.log('init pensiun staf selesai')
	}); 
}

// ##################################################################
// ######################### PENSIUN ATASAN ##########################
//penampung notif
var master_schedule_pensiun_atasan = {}

//fungsi objek baru

//filter
function filterPensiunAtasan(jbt, cb){
	if(jbt.daftar_bawahan.length > 0){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newPensiunAtasanObjectConstructor(jbt, stafNotif){
	return {schedule_Id: getScheduleIDCenter('pensiun_atasan', jbt, stafNotif), template: 'pensiun_atasan', pensiun: stafNotif.user.pensiun, time: stafNotif.time,
	stafNotif: [stafNotif._id], period_current: 1, period_max: 1, period_interval: 15, period_interval_type: 'd', jbt_nama: jbt._id }
}

//middle variable transform function
function middleTransformPensiunAtasan(scheduleDB){
	_.each(scheduleDB.stafNotif, function(stafNotif, index, list){
		stafNotif.user.ttl_t = moment(stafNotif.user.ttl_t).format('DD MMMM YYYY');
		stafNotif.user.pensiun = moment(stafNotif.user.pensiun).format('DD MMM YYYY');
	})
	scheduleDB.pensiun = moment(scheduleDB.stafNotif[0].pensiun).format('DD MMMM YYYY');
	return scheduleDB;
}

//init

// ##################################################################
// ######################### PENSIUN KEPEG ##########################
//penampung notif
var master_schedule_pensiun_kepeg = {}

//fungsi objek baru

//filter
function filterPensiunKepeg(user, cb){
	if(user.isAdmin){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newPensiunKepegObjectConstructor(user, stafNotif){
	return {schedule_Id: getScheduleIDCenter('pangkat_kepeg', user, stafNotif), template: 'pangkat_kepeg', time: stafNotif.time, 
		'periode_tmt': stafNotif.periode_tmt, stafNotif: [stafNotif._id], period_current: 1, period_max: 4, period_interval: 7, period_interval_type: 'd', user: user._id }

}
//middle variable transform function

//init

// ##################################################################
// ######################### PENGHARGAAN STAF ##########################
//penampung notif
var master_schedule_penghargaan = {}
//filter
function filterPenghargaan(user, cb){
	if(user.tmt_cpns){
		var startTime = moment(user.tmt_cpns);
		const masa_kerja = moment.duration(moment().diff(startTime)).asYears();
		if(user.hrg_jenis){
			if(masa_kerja >= 30){
				if(user.hrg_jenis.match(/30/i)){
					var ket = 'Satyalancana Karya Satya 30 Th telah diterima.'
					createNoNotif('penghargaan', user, ket)
					if(cb) cb(null, false);
					return false;
				} else {
					if(cb) cb(null, true);
					return true;
				}
			} else {
				if(cb) cb(null, true);
				return true;
			}
		} else {
			if(cb) cb(null, true);
			return true;
		}
	} else {
		var ket = 'TMT CPNS Belum ada.'
		createNoNotif('penghargaan', user, ket)
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newPenghargaanObjectConstructor(user){
	var time;
	if(moment().month(2).startOf('month').isAfter(moment())){
		time = moment().month(2)
	} else {
		time = moment().add(1, 'y').month(2)
	}
	var startTime = moment(user.tmt_cpns);
	var hrg_target;
	var hrg_thn2 = 10;
	const masa_kerja = Math.floor(moment.duration(moment().diff(startTime)).asYears());
	if( masa_kerja >= 30){
		hrg_target = 'Satyalancana Karya Satya 30 Th';
		hrg_thn2 = 30;
	} else if ( masa_kerja >= 20 ) {
		if(user.hrg_jenis.match(/20/i)){
			hrg_target = 'Satyalancana Karya Satya 30 Th';
			hrg_thn2 = 30;
			time = moment(user.tmt_cpns).add(30, 'y');
		} else {
			hrg_target = 'Satyalancana Karya Satya 20 Th';
			hrg_thn2 = 20;
		}
	} else if ( masa_kerja >= 10 ) {
		if(user.hrg_jenis.match(/10/i)){
			hrg_target = 'Satyalancana Karya Satya 20 Th';
			hrg_thn2 = 20;
			time = moment(user.tmt_cpns).add(20, 'y');
		} else {
			hrg_target = 'Satyalancana Karya Satya 10 Th';
			hrg_thn2 = 10;
		}
	} else {
		time = moment(user.tmt_cpns).add(10, 'y');
		hrg_target = 'Satyalancana Karya Satya 10 Th';
		hrg_thn2 = 10;
	}
	if(time.month() > 2){
		time = time.add(1, 'y')
	}
	var hrg_thn = time.year()
	time = time.month(2).startOf('month').hour(7).minute(30).second(0).format();
	return {schedule_Id: getScheduleIDCenter('penghargaan', user), masa_kerja: masa_kerja, hrg_target: hrg_target, template: 'penghargaan', time: time, 
	hrg_thn: hrg_thn, hrg_thn2: hrg_thn2, period_current: 1, period_max: 1, period_interval: 1, period_interval_type: 'd', user: user._id }

}
//middle variable transform function

//init
function initPenghargaan(all_users){
	var penghargaan_init_task = []
	_.each(all_users, function(user, index, list){
		penghargaan_init_task.push(function(cb){
			completeScheduleCreating('penghargaan', user, filterPenghargaan, newPenghargaanObjectConstructor, null, null, cb)
		})
	})

	async.series(penghargaan_init_task, function(err, finish){
		console.log('init penghargaan staf selesai')
	}); 
}
// ##################################################################
// ######################### PENGHARGAAN ATASAN ##########################
//penampung notif
var master_schedule_penghargaan_atasan = {}

//fungsi objek baru

//filter
function filterPenghargaanAtasan(jbt, cb){
	if(jbt.daftar_bawahan.length > 0){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newPenghargaanAtasanObjectConstructor(jbt, stafNotif){
	return {schedule_Id: getScheduleIDCenter('pangkat_atasan', jbt, stafNotif), template: 'pangkat_atasan', time: stafNotif.time, 
		'periode_tmt': stafNotif.periode_tmt, stafNotif: [stafNotif._id], period_current: 1, period_max: 4, period_interval: 7, period_interval_type: 'd', jbt_nama: jbt._id }

}

//middle variable transform function
function middleTransformPenghargaanAtasan(scheduleDB){
	_.each(scheduleDB.stafNotif, function(stafNotif, index, list){
		stafNotif.gol_now = transformGolCW[stafNotif.gol_now];
		stafNotif.gol_target = transformGolCW[stafNotif.gol_target]
	})
	scheduleDB.periode_usul = moment(scheduleDB.periode_tmt).format('MMMM YYYY');
	scheduleDB.batas_usul_ke_stis = moment(scheduleDB.stafNotif[0].bu_stis).format('MMMM YYYY')
	return scheduleDB;
}

//init

// ##################################################################
// ######################### PENGHARGAAN KEPEG ##########################
//penampung notif
var master_schedule_penghargaan_kepeg = {}

//fungsi objek baru

//filter
function filterPenghargaanKepeg(user, cb){
	if(user.isAdmin){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newPenghargaanKepegObjectConstructor(user, stafNotif){
	return {schedule_Id: getScheduleIDCenter('pangkat_kepeg', user, stafNotif), template: 'pangkat_kepeg', time: stafNotif.time, 
		'periode_tmt': stafNotif.periode_tmt, stafNotif: [stafNotif._id], period_current: 1, period_max: 4, period_interval: 7, period_interval_type: 'd', user: user._id }

}
//middle variable transform function

//init

// ##################################################################
// ######################### HUKUMAN STAF ##########################
//penampung notif
var master_schedule_hukuman = {}
//filter
function filterHukuman(user, cb){
	if(user.hkm_jenis){
		if(moment(user.hkm_tmt).add(user.hkm_jenis.masa_berlaku, 'M').isAfter(moment().add(1, 'M'))){
			if(cb) cb(null, true);
			return true;
		} else {
			if(cb) cb(null, false);
			return false;
		}
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newHukumanObjectConstructor(user){
	return {schedule_Id: getScheduleIDCenter('hukuman', user), template: 'hukuman', akhir_hukuman: moment(user.hkm_tmt).add(user.hkm_jenis.masa_berlaku, 'M').format('DD MMMM YYYY'), 
		time: moment(user.hkm_tmt).add(user.hkm_jenis.masa_berlaku, 'M').subtract(1, 'M').hour(7).minute(30).second(0).format(), 
		period_current: 1, period_max: 1, period_interval: 1, period_interval_type: 'd', user: user._id }

}
//middle variable transform function

//init
function initHukuman(all_users){
	var hukuman_init_task = []
	_.each(all_users, function(user, index, list){
		hukuman_init_task.push(function(hukuman_cb){
			completeScheduleCreating('hukuman', user, filterHukuman, newHukumanObjectConstructor, null, null, hukuman_cb)
		})
	})

	async.series(hukuman_init_task, function(err, finish){
		console.log('init hukuman selesai')
	}); 
}

// ##################################################################
// ######################### HUKUMAN ATASAN ##########################
//penampung notif
var master_schedule_hukuman_atasan = {}

//fungsi objek baru

//filter
function filterHukumanAtasan(jbt, cb){
	if(jbt.daftar_bawahan.length > 0){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newHukumanAtasanObjectConstructor(jbt, stafNotif){
	return {schedule_Id: getScheduleIDCenter('pangkat_atasan', jbt, stafNotif), template: 'pangkat_atasan', time: stafNotif.time, 
		'periode_tmt': stafNotif.periode_tmt, stafNotif: [stafNotif._id], period_current: 1, period_max: 4, period_interval: 7, period_interval_type: 'd', jbt_nama: jbt._id }

}

//middle variable transform function
function middleTransformHukumanAtasan(scheduleDB){
	_.each(scheduleDB.stafNotif, function(stafNotif, index, list){
		stafNotif.gol_now = transformGolCW[stafNotif.gol_now];
		stafNotif.gol_target = transformGolCW[stafNotif.gol_target]
	})
	scheduleDB.periode_usul = moment(scheduleDB.periode_tmt).format('MMMM YYYY');
	scheduleDB.batas_usul_ke_stis = moment(scheduleDB.stafNotif[0].bu_stis).format('MMMM YYYY')
	return scheduleDB;
}

//init

// ##################################################################
// ######################### HUKUMAN KEPEG ##########################
//penampung notif
var master_schedule_hukuman_kepeg = {}

//fungsi objek baru

//filter
function filterHukumanKepeg(user, cb){
	if(user.isAdmin){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}

//fungsi objek baru
function newHukumanKepegObjectConstructor(user, stafNotif){
	return {schedule_Id: getScheduleIDCenter('pangkat_kepeg', user, stafNotif), template: 'pangkat_kepeg', time: stafNotif.time, 
		'periode_tmt': stafNotif.periode_tmt, stafNotif: [stafNotif._id], period_current: 1, period_max: 4, period_interval: 7, period_interval_type: 'd', user: user._id }

}
//middle variable transform function

//init

// ##################################################################
// ############################## ABSENSI ###########################
//penampung notif
var master_schedule_absensi = {}
//filter
function filterAbsensi(user, cb){
	if(!user.isTb){
		if(cb) cb(null, true);
		return true;
	} else {
		if(cb) cb(null, false);
		return false;
	}
}
//fungsi objek baru
function newAbsensiObjectConstructor(user){
	return {schedule_Id: getScheduleIDCenter('absensi', user), template: 'absensi', time: moment().set('date', 25).hour(7).minute(30).second(0).format(), 
		period_current: 1, period_max: 99, period_interval: 99, period_interval_type: 'M', user: user._id }
}

//middle variable transform function
function middleTransformAbsensi(scheduleDB){
		scheduleDB.batas_memo = moment().set('date', 30).format('DD MMMM YYYY');
		return scheduleDB;
}

//init
function initAbsensi(all_users){
	var absensi_init_task = []
	_.each(all_users, function(user, index, list){
		absensi_init_task.push(function(absensi_cb){
			completeScheduleCreating('absensi', user, filterAbsensi, newAbsensiObjectConstructor, middleTransformAbsensi, null, absensi_cb)
		})
	})

	async.series(absensi_init_task, function(err, finish){
		console.log('init absensi selesai')
	}); 
}

// ##################################################################
// ##################################################################

//ambil semua user
User.find({}).populate('jbt_nama hkm_jenis').exec(function(err, all_users){
	initPangkat(all_users)

	initKGB(all_users)

	initPenghargaan(all_users)

	initHukuman(all_users)

	initPensiun(all_users)
	//ABSENSI
	initAbsensi(all_users)

})

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


// User.find({}).populate('jbt_nama').exec(function(err, all_users){
// 	function add2y(momentDate){
// 		if(momentDate.add(2, 'y').isBefore(moment().add(3, 'M'))){
// 			return add2y(momentDate);
// 		} else {
// 			console.log(momentDate.format('DD MM YYYY'))
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

// 		// console.log(moment(user.nip_baru.substring(0, 8), 'YYYYMMDD'),
// 		// 	moment(user.nip_baru.substring(0, 8), 'YYYYMMDD').add( user.bup, 'y'),
// 		// 	moment(user.nip_baru.substring(0, 8), 'YYYYMMDD').add( user.bup, 'y').add(1, 'M').startOf('month').format())

// 		// if(/\d{8}/.test(user.nip_baru.substring(0, 8))){
// 		// 	User.update({_id: user._id}, {pensiun: moment(user.nip_baru.substring(0, 8), 'YYYYMMDD').add( user.bup, 'y').add(1, 'M').startOf('month').format()}, 
// 		// 		function(err, status){
// 		// 		console.log(status)
// 		// 	})
// 		// }

// 		// if(moment(user.nip_baru.substring(8, 14), 'YYYYMM').add(32, 'y').isAfter(moment())){
// 			User.update({_id: user._id}, {periode_kgb: add2y(moment(user.nip_baru.substring(8, 14), 'YYYYMM')).format()}, function(err, status){
// 				console.log(status)
// 			})
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

module.exports = admin;