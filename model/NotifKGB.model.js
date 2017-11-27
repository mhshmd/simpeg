var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var NotifKGBchema = new Schema({
    schedule_Id: String,
	template: String,
    time: Date,
    time_next: Date,
    period_current: Number,
    period_max: Number,
    period_interval: Number,
    period_interval_type: String,
    support_email: {
        type: Boolean,
        default: true,
    },
    support_sms: {
        type: Boolean,
        default: true,
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
    unsubscribe_token: String
}, { collection: 'notif_kgb' });

module.exports = mongoose.model('NotifKGB', NotifKGBchema);