var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var NotifAbsensiSchema = new Schema({
    schedule_Id: String,
    template: String,
    time: Date,
    time_next: Date,
    period_current: Number,
    period_max: Number,
    period_interval: Number,
    period_interval_type: String,
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
        default: true,
    },
    isSent_email: {
        type: Boolean,
        default: false,
    },
    isSent_sms: {
        type: Boolean,
        default: false,
    },
    status:[
        {
            time: Date,
            label_id: String,
            label: {
                type: String,
                default: 'Belum ada.'
            },
        }
    ],
    user: {
        type: String,
        ref: 'User'
    },
}, { collection: 'notif_absensi' });

module.exports = mongoose.model('NotifAbsensi', NotifAbsensiSchema);