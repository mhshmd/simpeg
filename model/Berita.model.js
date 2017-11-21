var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var BeritaSchema = new Schema({
    judul: String,
    text: String,
    createdAt: {
        type: Date,
        default: new Date
    },
    penulis: String,
    type: String,
}, { collection: 'berita' });

module.exports = mongoose.model('Berita', BeritaSchema);