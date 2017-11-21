var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var StatusNotifSchema = new Schema({
    jenis: String,
    status: [{
        posisi: Number,
        label: String,
    }]
}, { collection: 'status_notif' });

module.exports = mongoose.model('StatusNotif', StatusNotifSchema);