var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var NotifKGBSchema = new Schema({
    schedule_Id: String,
	template: String,
    time: Date,
    periode_kirim: Number,
    periode_kgb: Date,
    active: {
        type: Boolean,
        default: true,
    },
    isConfirmed: Date,
    isSent_email: {
        type: Boolean,
        default: false,
    },
    isSent_sms: {
        type: Boolean,
        default: false,
    },
    user: {
        type: String,
        ref: 'User'
    },
    unsubscribe_token: String
}, { collection: 'notif_kgb' });

module.exports = mongoose.model('NotifKGB', NotifKGBSchema);