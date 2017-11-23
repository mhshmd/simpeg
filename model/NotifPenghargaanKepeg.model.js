var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var NotifPenghargaanKepegSchema = new Schema({
    schedule_Id: String,
	template: String,
    time: Date,
    time_next: Date,
    periode_kirim: Number,
    periode_tmt: Date,
    period_current: Number,
    period_max: Number,
    period_interval: Number,
    period_interval_type: String,
    stafNotif: [
        {
            type: String,
            ref: 'NotifPenghargaan'
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
}, { collection: 'notif_ptj_kepeg' });

module.exports = mongoose.model('NotifPenghargaanKepeg', NotifPenghargaanKepegSchema);