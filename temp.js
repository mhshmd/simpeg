// db.copyDatabase("simpeg","simanis","localhost")
use simanis;

db.user.update(
   {  },
   { $unset: { hkm_jenis: 1, hkm_tmt: 1 } }, {multi: true}
)

// db.jk.insert([

// {
//     _id: 'L',
//     label: 'Laki-laki',
//     label2: 'Bapak',
// },
// {
//     _id: 'P',
//     label: 'Perempuan',
//     label2: 'Ibu',
// }

// ])

// show collections
// db.user.insert({
// 	"email" : "shamad@stis.ac.id",
// 	"nama" : "Muh. Shamad, S.ST",
// 	"password" : "b92655a7f988be460d0fa760b0512be2e194dad5abc6f015f4306e13598f035c",
// 	"isAdmin": true,
// })
// db.notif.find({}).count()
// db.user.remove({nama: 'Muh. Shamad'})
// db.user.drop(  )
// db.user.remove({nama: "Muh. Shamad"})
// db.user.find().pretty()
// db.getCollection('bruteforce-store').findOne({})
// db.my_api_limits_coll.ensureIndex({expires: 1}, {expireAfterSeconds: 0});
// show collections
// db.user.update({_id: ObjectId('597d4b39094160252c595640')}, {$set:{jenis: 1}})
// db.user.find().pretty()
// db.custom_entity.find({nip: '13.7960'}).pretty()
// db.pegawai.find({}).pretty()
// db.spj.find({})
// db.user.find().pretty()
// db.pegawai.update({}, {$set: {active: true}}, {multi: true});
// db.custom_entity.findOne()

// db.pok_detailBelanja.findOne({nmitem: new RegExp('honor dosen', "i")})
// show collections
// db.sppd.findOne({})
//==================================================
// db.pok_detailBelanja.drop()
// db.pok_akun.drop()
// db.pok_sub_komponen.drop()
// db.pok_komponen.drop()
// db.pok_sub_output.drop()
// db.pok_output.drop()
// db.pok_kegiatan.drop()
// db.pok_program.drop()
// db.setting.drop()
// db.custom_entity.drop()
// db.surat_tugas.drop()
// db.surat_tugas_biasa.drop()
// db.perhitungan.drop()
// db.setting_sppd.drop()
//==================================================
// db.custom_entity.insert({nama: 'Abdul Ghofar S.Si, MTI.', type: 'Penerima'})
// db.setting_sppd.findOne()

// db.pegawai.drop()
// db.setting.drop()
// db.perhitungan.drop()
// db.surat_tugas.find()

// db.setting_sppd.update({}, {$set: {last_nmr_surat: 897}})
// db.setting_sppd.findOne()

// db.custom_entity.find({type: 'tugas'}).pretty()
// db.kab.find().pretty()
// db.pok_uraian_akun.find({thang: '2017'})
// db.representasi.find().pretty()
// db.representasi.insert({
// 	"_id" : "pejabat_negara",
// 	"uraian" : "Pejabat Negara",
// 	"dalam_kota" : 125000,
// 	"luar_kota" : 250000
// })
// db.representasi.insert({
// 	"_id" : "eselon2",
// 	"uraian" : "Pejabat Eselon II",
// 	"luar_kota" : 150000,
// 	"dalam_kota" : 75000
// })
// db.representasi.insert({
// 	"_id" : "eselon1",
// 	"uraian" : "Pejabat Eselon I",
// 	"luar_kota" : 200000,
// 	"dalam_kota" : 100000
// })
// db.perhitungan.find().pretty()
// db.surat_tugas.find({}).pretty()
// db.surat_tugas_biasa.drop()
// db.setting.find().pretty()
// db.pok_uraian_akun.drop()
// db.pok_detailBelanja.remove({active: false})
// db.pok_akun.find().pretty()
// db.pok_sub_komponen.find().pretty()
// db.pok_komponen.find().length()
// db.pok_sub_output.findOne()
// db.pok_output.findOne()
// db.pok_kegiatan.find()
// db.pok_program.findOne()
// db.kab.drop()

// db.pok_detailBelanja.aggregate(
//    [
//      {
//        $group:
//          {
//          	_id: {'kd':"$kdprogram", 'act':"$active"},
//            totalAmount: { $sum: "$jumlah" }
//          }
//      }
//    ]
// )

// show collections
// pok_detailBelanja v
// pok_akun
// pok_komponen v
// pok_output
// pok_kegiatan
// pok_program

// {
// 	"_id" : "521211.1",
// 	"version" : "1",
// 	"version_comment" : "Original",
// 	"create_date" : ISODate("2017-03-15T17:08:44.215Z"),
// 	"uraian" : "konsumsi seminar proposal penelitian (Snack)",
// 	"vol" : 675,
// 	"sat" : "O-K",
// 	"hrg_satuan" : 100000,
// 	"jlh" : 67500000,
// 	"old_ver" : [ ]
// }



	// //ambil semuaa detail yg memiliki realisasi
	// DetailBelanja.find({'thang': 2017, active: true, realisasi: { $exists: true, $ne: [] }}, 'realisasi', function(err, reals){
	// // init task
	// 	var tsk = [];
	// // daftar pegawai utk 
	// 	var pegs, ce, dosen;
	// // TASK AMBIL SEMUA PEGAWAI
	// 	tsk.push(
	// 		function(clbk){
	// 			Pegawai.find({}, function(err, result){
	// 				pegs = result;
	// 				clbk(null, '')
	// 			})
	// 		}
	// 	);
	// //TASK AMBIL SEMUA CE
	// 	tsk.push(
	// 		function(clbk){
	// 			CustomEntity.find({type: 'Penerima', active: true}, function(err, result){
	// 				ce = result;
	// 				clbk(null, '')
	// 			})
	// 		}
	// 	);

	// //TASK AMBIL DATA DOSEN		
	// 	tsk.push(
	// 		function(clbk){
	// 			var sipadu_db = mysql.createConnection({
	// 				host: '127.0.0.1',
	// 				user: 'root',
	// 				password: '',
	// 				database: 'sipadu_db'
	// 			});

	//     		//kueri utk dosen di sipadu
	//     		var query = 'SELECT * ' +
	// 					'FROM dosen ' +
	// 					'WHERE aktif = 1 AND unit <> "STIS"';
	// 			sipadu_db.connect(function(err){
	// 				sipadu_db.query(query, function (err, dosens, fields) {
	// 					if (err){
	// 					  	console.log(err)
	// 					  	return;
	// 					}
	// 					sipadu_db.end();
	// 					dosen = _.map(dosens, function(o, key){return {_id: o.kode_dosen, nama: o.gelar_depan+((o.gelar_depan?' ':''))+o.nama+' '+o.gelar_belakang, unit: o.unit}});
	// 					clbk(null, '')
	// 				})
	// 			})
	// 		}
	// 	);

	// //LOOP THROUGH DETAIL
	// 	_.each(reals, function(detail, idx, list){

	// //LOOP THROUGH SEMUA REALISASI UTK TIAP DETAIL

	// 		_.each(detail.realisasi, function(real, idx, list){
	// 			tsk.push(
	// 				function(clbk){
	// 					var nama = detail.realisasi.id(real._id).penerima_nama;
	// 					if(detail.realisasi.id(real._id).ket.match(/\[/)){
	// 						nama = detail.realisasi.id(real._id).ket.replace(/\s*\[\s*|\s*\]\s*.*/g, '')
	// 						console.log(nama)
	// 					}
	// 					var matched = getMatchEntity(nama, pegs);
	// 					if(matched.score >= 0.91){    						
	// 						// console.log(real.penerima_nama)
	// 						CustomEntity.findOne({nama: detail.realisasi.id(real._id).penerima_nama, type: 'Penerima'}, function(err, result){
	// 							if(result){
	// 								result.remove(function(err, status){
	// 									DetailBelanja.findOneAndUpdate({'_id': detail._id, 'realisasi._id': real._id}, 
 //    										{$set: {'realisasi.$.penerima_id': matched._id, 'realisasi.$.penerima_nama': matched.nama}}, function(err, result){
 //    											clbk(null, '')
 //    									})
	// 								});
	// 							} else {
	// 								DetailBelanja.findOneAndUpdate({'_id': detail._id, 'realisasi._id': real._id}, 
	// 									{$set: {'realisasi.$.penerima_id': matched._id, 'realisasi.$.penerima_nama': matched.nama}}, function(err, result){
	// 										clbk(null, '')
	// 								})
	// 							}
	// 						})
 //    					} else {
 //    						matched = getMatchEntity(nama, ce);
 //    						if(matched.score >= 0.91){
	//     						DetailBelanja.findOneAndUpdate({'_id': detail._id, 'realisasi._id': real._id}, 
	// 								{$set: {'realisasi.$.penerima_id': matched._id, 'realisasi.$.penerima_nama': matched.nama}}, function(err, result){
	// 									clbk(null, '')
	// 							})
	//     					} else {
	//     						matched = getMatchEntity(nama, dosen);
	//     						if(matched.score >= 0.91){
	//     							CustomEntity.findOne({'nama': nama.replace(/^\s*/g, ''), type:'Penerima', unit: matched.unit}, function(err, result){
	//     								if(result){
	//     									DetailBelanja.findOneAndUpdate({'_id': detail._id, 'realisasi._id': real._id}, 
	// 											{$set: {'realisasi.$.penerima_id': result._id, 'realisasi.$.penerima_nama': result.nama}}, function(err, result){
	// 												clbk(null, '')
	// 										})
	//     								} else {
	//     									CustomEntity.create({'nama': nama.replace(/^\s*/g, ''), type:'Penerima', unit: matched.unit}, function(err, new_penerima){
	// 											DetailBelanja.findOneAndUpdate({'_id': detail._id, 'realisasi._id': real._id}, 
	// 												{$set: {'realisasi.$.penerima_id': new_penerima._id, 'realisasi.$.penerima_nama': new_penerima.nama}}, function(err, result){
	// 													clbk(null, '')
	// 											})
	// 										})
	//     								}
	//     							})
	// 	    					} else {
	// 	    						CustomEntity.create({'nama': nama.replace(/^\s*/g, ''), type:'Penerima'}, function(err, new_penerima){
	// 	    							ce.push(new_penerima)
	// 									DetailBelanja.findOneAndUpdate({'_id': detail._id, 'realisasi._id': real._id}, 
	// 										{$set: {'realisasi.$.penerima_id': matched._id, 'realisasi.$.penerima_nama': matched.nama}}, function(err, result){
	// 											clbk(null, '')
	// 									})
	// 								})
	// 	    					}
	//     					}
	// 					}
	// 				}
	// 			)
	// 		})
	// 	})
	// 	async.series(tsk, function(err, final){
	// 		console.log('finish')
	// 	})
	// })

	// var items;

	// async.series([
	// 	function(cb){
	// 		//ambil semua custom entity (type: Penerima)
	// 		CustomEntity.find({type: 'Penerima', active: true}, function(err, aaaaaa){
	// 			items = aaaaaa;
	// 			cb(null, '')
	// 		})
	// 	},
	// 	function(cb){
	// 		var task = [];

	// 		_.each(items, function(item, idx, list){
	// 			task.push(
	// 				function(callb){
	// 					CustomEntity.findOne({_id: new ObjectId(item._id)}, function(err, isExist){
	// 						if(isExist){
	// 							//cek apakah ada yg sama namanya
	// 							CustomEntity.find({nama: new RegExp(item.nama, "i"), _id: {$ne: item._id}}, function(err, same_items){
	// 								console.log(same_items)
	// 								var task2 = [];

	// 								_.each(same_items, function(it, idx, list){
	// 									//iterasi utk setiap yg sama
	// 									task2.push(
	// 										function(clb){
	// 											console.log(item._id, '>', it._id);
	// 											DetailBelanja.find({'thang': 2017, active: true}, 'realisasi').elemMatch('realisasi', {'penerima_id': it._id}).exec(function(err, result){
	// 							    					if(!result){
	// 							    						//simpan
	// 							    						clb(null, '')
	// 							    					} else {
	// 							    						var tsk = [];
	// 							    						_.each(result, function(detail, idx, list){
	// 							    							_.each(detail.realisasi, function(real, idx, list){
	// 							    								tsk.push(
	// 							    									function(clbk){
	// 								    									if(it._id == real.penerima_id){
	// 										    								real.penerima_id = item._id;
	// 										    								detail.save(function(err){
	// 										    									clbk(null, '')
	// 										    								});
	// 										    							} else {
	// 										    								clbk(null, '')
	// 										    							}
	// 								    								}
	// 							    								)
	// 								    						})
	// 							    						})
	// 							    						async.series(tsk, function(err, final){
	// 							    							clb(null, '')
	// 							    						})
	// 							    					}
	// 							    			})
	// 										}
	// 									)
	// 									//ganti semua penerima_id dgn item id
	// 									//hapus it
	// 								})

	// 								async.series(task2, function(err, final){
	// 									var task_a = [];
	// 									_.each(same_items, function(it, idx, list){
	// 										task_a.push(
	// 											function(callbck){
	// 												CustomEntity.remove({_id: new ObjectId(it._id)}, function(err, status){
	// 													callbck(null, '')
	// 												})
	// 											}
	// 										)
	// 									})

	// 									async.series(task_a, function(err, final){
	// 										callb(null, '')
	// 									})
	// 								})
									
	// 							})
	// 						} else {
	// 							callb(null, '')
	// 						}
	// 					})
	// 				}
	// 			)
	// 		})

	// 		async.series(task, function(err, final){
	// 			cb(null, '')
	// 		})
	// 	}

	// ], function(err, final){
	// 	console.log('finish')
	// })


	//jika ditemukan, maka ganti semua penerima_id realisasi dgn _id itu dgn _id yg pertama.

	//hapus yang sama itu
	//1. ambil semua detail yg ada realisasinya
	//2. cek kesesuain nama dgn database pegawai
	//3. jika >0.86 set id, jika id != id sebelumnya dan custom entity, maka hapus ce tsb
	//4. jika tdk,

	
//backup data
// mongorestore -d simamov -c pok_program "C:\db\rev6\simamov\pok_program.bson"
// mongorestore -d simamov -c pok_kegiatan "C:\db\rev6\simamov\pok_kegiatan.bson"
// mongorestore -d simamov -c pok_output "C:\db\rev6\simamov\pok_output.bson"
// mongorestore -d simamov -c pok_sub_output "C:\db\rev6\simamov\pok_sub_output.bson"
// mongorestore -d simamov -c pok_komponen "C:\db\rev6\simamov\pok_komponen.bson"
// mongorestore -d simamov -c pok_sub_komponen "C:\db\rev6\simamov\pok_sub_komponen.bson"
// mongorestore -d simamov -c pok_akun "C:\db\rev6\simamov\pok_akun.bson"
// mongorestore -d simamov -c pok_detailBelanja "C:\db\rev6\simamov\pok_detailBelanja.bson"