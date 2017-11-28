var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var NotifHukumanAtasanSchema = new Schema({
    schedule_Id: String,
	template: String,
    time: Date,
    time_next: Date,
    periode_kirim: Number,
    akhir_hukuman: String,
    period_current: Number,
    period_max: Number,
    period_interval: Number,
    period_interval_type: String,
    stafNotif: [
        {
            type: String,
            ref: 'NotifHukuman'
        }
    ],
    isConfirmed: Date,
    active: {
        type: Boolean,
        default: true,
    },
    support_email: {
        type: Boolean,
        default: true,
    },
    support_sms: {
        type: Boolean,
        default: false,
    },
    isSent_email: {
        type: Boolean,
        default: false,
    },
    isSent_sms: {
        type: Boolean,
        default: false,
    },
    jbt_nama: {
        type: String,
        ref: 'Jabatan'
    },
    unsubscribe_token: String
}, { collection: 'notif_hukuman_atasan' });

module.exports = mongoose.model('NotifHukumanAtasan', NotifHukumanAtasanSchema);