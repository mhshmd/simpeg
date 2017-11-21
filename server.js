//====== MODUL ======//
//load framework express
var express = require('express');
var app = express();
var fs = require('fs');

var server = require('http').createServer(app);  
var io = require('socket.io')(server);

var SocketIOFileUpload = require('socketio-file-upload')
app.use(SocketIOFileUpload.router);
//clients connection
var connections = {};

require('dotenv').config();

//Security
var helmet = require('helmet');
app.use(helmet());


//modul morgan utk debug log ke console
var logger = require('morgan');
app.use(logger('dev'));

//modul cookie parser utk mengatur cookie
var cookieParser = require('cookie-parser');
var credentials = require('./credentials.js'); //string acak utk encrypt
app.use(cookieParser(credentials.cookieSecret));

//modul body parser utk mengatur POST request
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

//Kompresi gzip
var compression = require('compression');
app.use(compression());

//modul mongodb utk koneksi mongo db keuangan
var mongo = require('mongodb');

var url = 'mongodb://127.0.0.1:27017/simanis';

var mongoose = require('mongoose');

mongoose.connect(url);

//modul session utk tracking visitor
var session = require('express-session')({
	resave: false,
	saveUninitialized: true,
	secret: credentials.cookieSecret
});
var sharedsession = require("express-socket.io-session");
app.use(session);
io.use(sharedsession(session, {
    autoSave:true
})); 

//modul handlebars utk dynamic page render
var handlebars = require('express-handlebars').create({defaultLayout: 'pegawai_layout',
	helpers:{
		if_eq: function(a, b, opts) {
		    if (a == b) {
		        return opts.fn(this);
		    } else {
		        return opts.inverse(this);
		    }
		},
		if_neq: function(a, opts) {
		    if ( !(a == 'tanpa sub komponen' || a == 'tanpa sub output') ) {
		        return opts.fn(this);
		    } else {
		        return opts.inverse(this);
		    }
		},
		json : function(context) {
		    return JSON.stringify(context);
		},
		"inc" : function(value, options){
		    return parseInt(value) + 1;
		},
		"fullYear" : function(){
			return (new Date()).getFullYear();
		}
	}
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

//====== DIRECTORY PUBLIC ACCESS ======//
//dir yg bisa diakses langsung
app.use('/css', express.static(__dirname + '/css'));
app.use('/js', express.static(__dirname + '/js'));
app.use('/fonts', express.static(__dirname + '/fonts'));
app.use('/img', express.static(__dirname + '/img'));

//Short syntax tool
var _ = require("underscore");

//########ROUTE#########

//Pgw/Beranda
var pegawai = require('./controllers/pegawai/index_pegawai.js');
app.use('/', pegawai); 

//admin
var admin = require('./controllers/admin/index_admin.js');
app.use('/admin', admin); 

//route jika halaman tidak ditemukan
app.use(function(req, res){
	res.type('text/html');
	res.status(404);
	res.render('404', {layout: false});
});
//route jika terjadi error di server/bug code
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500', {layout: false});
});

server.listen(process.env.PORT || 3000, function(){
	console.log('Server listening on '+(process.env.PORT || 3000));
});

const getCookie = require('./function/getCookie.js')

var User = require('./model/User.model');

io.on('connection', function( client ) {
	
	admin.socket(io, connections, client);
	pegawai.socket(io, connections, client);

	if(!getCookie('user', client.request.headers.cookie) && !client.handshake.session.user){

		client.emit('login_required', 'Anda harus login.');
		return;

	} else{

		if(client.handshake.session.user){
			connections[client.handshake.session.user._id] = client;
		}

	}

    var uploader = new SocketIOFileUpload();
    uploader.dir = "./img/profile/";
    uploader.listen(client);

    // Do something when a file is saved:
    uploader.on("saved", function(event){
        var photo = event.file.meta._id+event.file.name.match(/\.\w*$/i)[0]
    	fs.rename(event.file.pathName, "./img/profile/"+photo, function(err) {
		    if ( err ) {
		    	console.log('ERROR: ' + err);
		    } else {
		    	User.update({_id: event.file.meta._id}, {'photo': photo}, function(err, status){
		    		console.log('Photo berhasil diupdate');
		    	})
		    }
		    console.log('renamed')
		});
    });

	client.on('join', function(data) {
    	client.emit('messages', 'Selamat datang.');
    });
})