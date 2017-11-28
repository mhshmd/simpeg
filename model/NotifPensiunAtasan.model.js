var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var NotifPensiunAtasanSchema = new Schema({
    schedule_Id: String,
	template: String,
    time: Date,
    time_next: Date,
    pensiun: Date,
    period_current: Number,
    period_max: Number,
    period_interval: Number,
    period_interval_type: String,
    stafNotif: [
        {
            type: String,
            ref: 'NotifPensiun'
        }
    ],
    support_email: {
        type: Boolean,
        default: true,
    },
    support_sms: {
        type: Boolean,
        default: false,
    },
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
    jbt_nama: {
        type: String,
        ref: 'Jabatan'
    },
    unsubscribe_token: String
}, { collection: 'notif_pensiun_atasan' });

module.exports = mongoose.model('NotifPensiunAtasan', NotifPensiunAtasanSchema);