var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var JenisHukumanSchema = new Schema({
    hkm_jenis: String,
    hkm_label: String,
    masa_berlaku: Number,
}, { collection: 'jenis_hukuman' });

module.exports = mongoose.model('JenisHukuman', JenisHukumanSchema);