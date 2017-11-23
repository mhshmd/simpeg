var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var UserSchema = new Schema({
    "nama": String,
    "isTb": {
        type: Boolean,
        default: false
    },
    "isPensiun": {
        type: Boolean,
        default: false
    },
    "isKeluar": {
        type: Boolean,
        default: false
    },
    "jk": {
        type: String,
        ref: 'JK'
    },
    "ttl_tl": String,
    "ttl_t": Date,
    "nip_lama": String,
    "nip_baru": String,
    "tmt_cpns": Date,
    "tmt_pns": Date,
    "pkt_gol": String,
    "pkt_tmt": Date,
    "jbt_nama": {
        type: String,
        ref: 'Jabatan'
    },
    "jbt_tmt": String,
    "mk_th": Number,
    "mk_bl": Number,
    "pelatihan_nama": String,
    "pelatihan_th": Number,
    "pelatihan_penyelenggara": String,
    "pdk_jurusan": String,
    "pdk_ijazah": String,
    "pdk_pt": String,
    "pdk_lulus_th": Number,
    "bup": Number,
    "pensiun": Date,
    "ak": Number,
    "periode_kgb": Date,
    "nidn": String,
    "sertifikasi": String,
    "hrg_jenis": String,
    "hrg_th": Number,
    "hkm_jenis": String,
    "hkm_tmt": String,
    "telp": String,
    "email": String,
    "alamat": String,
    password: String,
    isAdmin: {
        type: Boolean,
        default: false
    },
    ip_address: String,
    last_login_time: String,
    act: [{
        label: String,
        timestamp: {
            type: Number,
            default: new Date().getTime()
        }
    }],
    active: {
        type: Boolean,
        default: true
    },
    photo: String,
}, { collection: 'user' });

module.exports = mongoose.model('User', UserSchema);