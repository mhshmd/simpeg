var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var NotifPangkatSchema = new Schema({
    schedule_Id: String,
    gol_target: String,
	gol_now: String,
	template: String,
    time: Date,
    bu_stis: Date,
    bu_bps: Date,
    periode_kirim: Number,
    periode_tmt: Date,
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
}, { collection: 'notif_pangkat' });

module.exports = mongoose.model('NotifPangkat', NotifPangkatSchema);