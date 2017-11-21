var crypto = require('crypto');

var hash = crypto.createHmac('sha256', 'ade')
                   .digest('hex');


                   console.log(hash)