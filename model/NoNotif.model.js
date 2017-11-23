var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var NoNotifSchema = new Schema({
    user: {
            type: String,
            ref: 'User'
    },
    type: String,
    ket: String,
}, { collection: 'no_notif' });

module.exports = mongoose.model('NoNotif', NoNotifSchema);