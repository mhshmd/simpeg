var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var JabatanSchema = new Schema({
    jbt_nama: String,
    bup: Number,
    type: String,
    eselon: String,
    user: {
        type: String,
        ref: 'User'
    },
    daftar_bawahan: [
        {
            type: String,
            ref: 'Jabatan'
        }
    ]
}, { collection: 'jabatan' });

module.exports = mongoose.model('Jabatan', JabatanSchema);