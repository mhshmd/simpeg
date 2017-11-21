var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var NotifPangkatKepegSchema = new Schema({
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
}, { collection: 'notif_pangkat_kepeg' });

module.exports = mongoose.model('NotifPangkatKepeg', NotifPangkatKepegSchema);