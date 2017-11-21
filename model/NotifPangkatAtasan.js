var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var NotifPangkatAtasanSchema = new Schema({
    schedule_Id: String,
	template: String,
    time: Date,
    periode_kirim: Number,
    periode_tmt: Date,
    stafNotif: [
        {
            type: String,
            ref: 'NotifPangkat'
        }
    ],
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
}, { collection: 'notif_pangkat_atasan' });

module.exports = mongoose.model('NotifPangkatAtasan', NotifPangkatAtasanSchema);