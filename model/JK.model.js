var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var JKSchema = new Schema({
    _id: String,
    label: String,
    label2: String,
}, { collection: 'jk' });

module.exports = mongoose.model('JK', JKSchema);