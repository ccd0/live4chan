/* required modules */
var express = require("express");
var logfmt = require("logfmt");
var http = require('http');
var crypto = require('crypto');
var ipfilter = require('ipfilter');
var captcha = require('captcha');
var tripcode = require('tripcode');
var fs = require('fs');
var mongoose = require('mongoose');
var gm = require('gm').subClass({imageMagick:true});

/* globals */
var securetrip_salt = "AVEPwfpR4K8PXQaKa4PjXYMGktC2XY4Qt59ZnERsEt5PzAxhyL";
fs.readFile('salt.txt', 'utf8', function(err,data){
    securetrip_salt = data;
});

console.log("TRIP PASS IS:", securetrip_salt);

var format = require('util').format;
var app = express();
var port = process.env.PORT || 5000;

/* listen now */
var server = http.createServer(app).listen(port, function(){
    console.log('Express server listening on port %d in %s mode',
    server.address().port, app.settings.env);
});
var io = require('socket.io').listen(server);
var fs = require('fs');

/* set up db */
mongoose.connect('mongodb://localhost/livechan_db');
var Schema = mongoose.Schema;


/* for saving images */
app.use(express.bodyParser({
    uploadDir: 'public/tmp/uploads',
    keepExtensions: true
    }));

/* 5mb limit */
app.use(express.limit('5mb'));

/* blocked end nodes. this file can include more */
fs.readFile('tor_list.txt', 'utf8', function(err,data){
    var tor_list = data.split("\n");
    app.use(ipfilter(tor_list));

});

/* logging */
app.use(logfmt.requestLogger());

/* serve public stuff and get cookies */
app.use(express.static(__dirname + '/public'));
app.use(express.cookieParser());
app.use(express.cookieSession({ secret: 'keyboard-cat' }));

/* captcha security */
app.use(captcha({ url: '/captcha.jpg', color:'#0064cd', background: 'rgb(20,30,200)' }));

/* stored data in memory */
chat = {};
data_chat = {};
count = 2232;
curr_chat =[];
hash_list = [];
session_list = [];
ips = {};
boards = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'gif', 'h', 'hr', 'k', 'm', 'o', 'p', 'r', 's', 't', 'u', 'v', 'vg', 'vr', 'w', 'wg', 'i', 'ic', 'r9k', 's4s', 'cm', 'hm', 'lgbt', 'y', '3', 'adv', 'an', 'asp', 'cgl', 'ck', 'co', 'diy', 'fa', 'fit', 'gd', 'hc', 'int', 'jp', 'lit', 'mlp', 'mu', 'n', 'out', 'po', 'pol', 'sci', 'soc', 'sp', 'tg', 'toy', 'trv', 'tv', 'vp', 'wsg', 'x', 'dev'];

/* db schema */
var chat_schema = new Schema({
    convo: String,
    body: String,
    name: String,
    count: {type: Number, unique: true},
    date: { type: Date, default: Date.now },
    ip: String,
    chat: String,
    image: String,
    image_filename: String,
    image_filesize: Number,
    image_width: Number,
    image_height: Number,
    trip: String,
    thumb: String
}, {capped:{size:10000000, max:1000}});

var session_schema = new Schema({
    date: { type: Date, default: Date.now, expires: '24h' },
    session_key: String,
    ip: String
});

mongoose.connection.db.dropCollection('session_dbs', function(e){console.log(e)});

chat_db = mongoose.model('chat_db', chat_schema);
session_db = mongoose.model('session_db', session_schema);
/*
chat_db.remove({}, function(err) { 
       console.log('chat_db reset');
       read_in();
});
*/
session_db.remove({}, function(err) { 
       console.log('session_db reset') 
});

/* snapshot location. for download when pushing updates */
// TO DO: Set up database to make this legitimate
fs.readFile('public/chats.json', 'utf8', function (err, data) {
  if (err) {
    console.log('Error: ' + err);
    return;
  }
  //data = JSON.parse(data);
  //chat = data.chat;
  //data_chat = data.chat;
  //count = data.count;
 /* for (id in chat) {
    for (i in chat[id]) {
        if (typeof(chat[id][i].count)!="undefined" )
            chat_db(chat[id][i]).save(function(){});
    }
  }*/
});

chat_db.findOne().sort({count:-1}).exec(function(e,d){
    if(d) count = d.count;
});

function demote_ips(){
    for(i in ips){
        if (ips[i] == 0)
        delete ips[i];
        else
        ips[i]--;
    }
    for(i in hash_list){
        if (hash_list[i] == 0)
        delete hash_list[i];
        else
        hash_list[i]--;
    }
    /*fs.writeFile('public/chats.json', JSON.stringify({chat:data_chat, count:count}) , function(){
        //console.log('written');
    });*/
}

setInterval(demote_ips,1000);

function get_extension(filename) {
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i+1).toLowerCase();
}

function invalid_extension(filename){
    var test=['jpg','jpeg','png','gif'].indexOf(get_extension(filename));
    console.log("INDEX IS", get_extension(filename), test);
    if (test > -1)
        return false;
    return true;
}

function add_to_chat(data,id){
    /* store in the db */
    if(!data.chat)
        data.chat=id;
    chat_db.update({count: data.count}, data, {upsert: true}, function(err){
        if (err) console.log(err);
    });
/*
    if (!chat[id])
        chat[id] = [];
    if (chat[id].length>100){
        if(chat[id][0].image)
            fs.unlink(chat[id][0].image);
        delete chat[id][0];
        chat[id] = chat[id].slice(-99);
    }
    if (!data_chat[id])
        data_chat[id] = [];
    if (data_chat[id].length>100){
        delete data_chat[id][0];
        data_chat[id] = data_chat[id].slice(-99);
    }
    if (curr_chat.length>20){
        delete curr_chat[0];
        curr_chat = curr_chat.slice(-19);
    }*/
    /* store in memory 
    chat[id].push(data);
    */
    /* store in public memory 
    if(data.ip)
        data.ip = 'hidden';
    data_chat[id].push(data);
    */
    /* store in front page
    curr_chat.push(data);
    */
    if (port==80){
        fs.writeFile('public/chats.json', JSON.stringify({chat:data_chat, count:count}),
	function(){
    	});
    }
}

function session_exists(session){
    if (session_db.count({session_key:session}))
        return true;
    return false;
}

function already_exists(body, id){
    for(i in chat[id]){
        if (chat[id][i].body == body && chat[id][i].ip){
            ips[chat[id][i].ip]+=600;
            return true;
        }
    }
    return false;
}

app.get('/login', function(req, res){
    res.send('<html><head><meta name="viewport" content="width=device-width,user-scalable=no"><link type="text/css" rel="stylesheet" href="style.css"></head><body><div class="center container"><div>Please prove you aren\'t a robot</div><br/><img src="/captcha.jpg"/><form action="/login" method="post"><br/><input type="text" name="digits"/><input type="hidden" name="page" value="'+req.query.page+'"/></form></div></body></html>');
});

app.post('/login', function(req, res){
    var ip_addr = req.headers["x-forwarded-for"];
    if (ip_addr){
        var list = ip_addr.split(",");
        req.connection.remoteAddress = list[list.length-1];
    } else {
        req.connection.remoteAddress = req.connection.remoteAddress;
    }
    
    if(req.body.digits == req.session.captcha) {
        var key=(Math.random()*1e17).toString(36);
        var info = req.headers['user-agent']+req.connection.remoteAddress+key;
        var password = crypto.createHash('sha1').update(info).digest('base64').toString();
        console.log("password", password);
        res.cookie('password_livechan', password+key, { maxAge: 9000000, httpOnly: false});
        
        if(req.body.page)
            res.redirect(req.body.page);
	else
	    res.json({success:"captcha"});
	    
        var data = {session_key:password,
        ip:req.connection.remoteAddress};

        new session_db(data).save(function(){
            session_db.find().exec(function(e,d){
                console.log(e,d);    
            });
        });

        return;
    } else {
    	if(req.body.page)
            res.send("You mistyped the captcha!");
        else
            res.json({failure:"You mistyped the captcha."});
        return;
    }
});

app.get('/', function(req, res) {
    res.sendfile('home.html');
});

app.get('/chat/:id([a-z0-9]+)', function(req, res) {
    if (boards.indexOf(req.params.id) < 0){
        res.send("Does not exist :(");
        return;
    }
    res.sendfile('index.html');
    return;
});

app.get('/data/:id([a-z0-9]+)', function(req, res) {
    if (req.params.id == "all") {
        chat_db.find()
            .sort({count:-1})
            .select('chat name body convo count date trip')
            .limit(20)
            .exec(function(e,d){
                if(!e)
                    res.json(d);
                else
                    res.send('db_error');
            });
        return;
    }
    if (boards.indexOf(req.params.id) < 0) {
        res.send("Does not exist :(");
        return;
    }
    if (!data_chat[req.params.id]) {
        data_chat[req.params.id] = [];
    }
    chat_db.find({chat:req.params.id})
        .sort({count:-1})
        .select('chat name body convo count date image image_filename image_filesize image_width image_height trip thumb')
        .limit(100)
        .exec(function(e,d){
            if(!e)
                res.json(d);
            else
                res.send('db_error');
        });
});

app.post('/ban/:id([a-z0-9]+)', function(req, res, next){
    var board = req.params.id;
    var ip = req.query.ip;
    var hash = crypto.createHash('md5').update(req.body.name.substr(req.query.password)).digest('base64').slice(0,10);
});

app.get('/delete/:id([a-z0-9]+)', function(req, res, next){
    var board = req.params.id;
    var ip = req.query.ip;
    var hash = crypto.createHash('md5').update(req.body.name.substr(req.query.password)).digest('base64');
    if (hash == '8lnTmt7BmowWekVPb9wLog==')
        console.log('works');
});

app.post('/chat/:id([a-z0-9]+)', function(req, res, next) { handleChatPost(req, res, next, null); });

function handleChatPost(req, res, next, image)
{
    if (boards.indexOf(req.params.id) < 0){
        res.send("Does not exist :(");
        return;
    }
    
    var data = {};
    
    var ip_addr = req.headers["x-forwarded-for"];
    if (ip_addr){
        var list = ip_addr.split(",");
        req.connection.remoteAddress = list[list.length-1];
    } else {
        req.connection.remoteAddress = req.connection.remoteAddress;
    }
    
    
    if(req.files.image.size == 0 || invalid_extension(req.files.image.path)) {
         fs.unlink(req.files.image.path);
         console.log("DELETED");
         if (/^\s*$/.test(req.body.body)) {
            res.json({failure:"nothing substantial submitted"});
            return;
         }
     } else if(image == null) {
         gm(req.files.image.path).size(function(err, dimensions){
             if(err) {
                 console.log(err);
                 return;
             }
             var idata = {image:"null"};
             if(dimensions.height > 0 && dimensions.width > 0)
             {
                 console.log('image loaded to ', req.files.image.path);
            	 idata.image = req.files.image.path;
            	 idata.image_filename = req.files.image.originalFilename;
            	 idata.image_filesize = fs.statSync(idata.image)["size"];
            	 idata.image_width = dimensions.width;
            	 idata.image_height = dimensions.height;
             }
             handleChatPost(req, res, next, idata);
         });
         return;
     } else {
         console.log('image fully loaded to ', req.files.image.path);
         if(image.image && image.image != null)
         {
             data.image = image.image;
             data.image_filename = image.image_filename;
             data.image_filesize = image.image_filesize;
             data.image_width = image.image_width;
             data.image_height = image.image_height;
         }
     }

     if (!req.cookies['password_livechan']) {
         res.json({failure:"session expiry"});
         return;
     }

    // find should be password to prevent identity fraud 
    var info = req.headers['user-agent']+req.connection.remoteAddress+req.cookies['password_livechan'].slice(-11);
    var password = crypto.createHash('sha1').update(info).digest('base64').toString();
    var user_pass = req.cookies['password_livechan'].slice(0,-11);
    /*
    if(!user_pass || password != user_pass){
        console.log("NO PASSRROD");
        res.redirect('/login');
        return;
    }

    // check if it exists 
    if(!session_exists(user_pass)){
        console.log(session_list);
        console.log("NO PASSRROD");
        res.redirect('/login');
        return;
    }
    */

    if(req.body.body.length > 400) {
        req.body.body = req.body.body.substring(0,399)+"...";
    }

    if(req.body.body.split("\n").length > 7){
        req.body.body = req.body.body.split("\n",7).join("\n");
    }

    if(req.body.name.length > 40) {
        req.body.name = req.body.name.substring(0,39)+"...";
    }
    

    if (req.body.convo) {
        if(req.body.convo.length > 40) {
            req.body.convo = req.body.convo.substring(0,39)+"...";
        }
        data.convo = req.body.convo;
    }
    else
        data.convo = 'General';

    /* passed most tests, make data object */
    var trip_index = req.body.name.indexOf("#");

    if(trip_index > -1) {
        var trip = req.body.name.substr(trip_index+1);
        var secure = trip.indexOf("#") == 0;
        if(secure) trip = crypto.createHash('sha1').update(trip.substr(1) + securetrip_salt).digest('base64').toString();
        data.trip = (secure ? "!!" : "!")+tripcode(trip);
        req.body.name = req.body.name.slice(0,trip_index);
    }

    if(data.trip != "!KRBtzmcDIw") {
        /* update hash cool down */
        if(user_pass in hash_list) {
            if(hash_list[user_pass] >= 1 && hash_list[user_pass] <= 100000){
                hash_list[user_pass] *= 2; 
            }
            console.log("hash", hash_list[user_pass]);
            res.json({failure:"sorry a similar hash has been used and you must wait "+hash_list[user_pass]+" seconds due to bandwidth"});
            return;
        } else {
            hash_list[user_pass] = 5; // to do fix cooldowns
        }

        /* update ip cool down */
        if(req.connection.remoteAddress in ips) {
            if(ips[req.connection.remoteAddress] >= 1 && hash_list[user_pass] <= 100000){
                ips[req.connection.remoteAddress] *= 2; 
            }
            console.log("IP", ips[req.connection.remoteAddress]);
            res.json({failure:"ip cool down violation. now "+ips[req.connection.remoteAddress]+" seconds"});
            return;
        } else {
            ips[req.connection.remoteAddress] = 0;
        }

/*
        if(req.body.body != ""){
            if(already_exists(req.body.body, req.params.id) || /^\s+$/.test(req.body.body)){
                console.log("exists");
                res.json({failure:"post exists"});
                return;
            }
        }*/

    }
    data.body = req.body.body;
    data.name = req.body.name ? req.body.name : "Anonymous";

    count++;
    data.count = count;
    data.date = (new Date).toString();
    data.ip = req.connection.remoteAddress;
    if(port==80)
        add_to_chat(data, req.params.id);

    delete data.ip;
    data.chat = req.params.id;

    res.json({success:"SUCCESS", id:data.count});
    
    io.sockets.in(req.params.id).emit('chat', data);
    io.sockets.in('all').emit('chat', data);

    if (data.image) {
        var thumb_width = Math.min(data.image_width, 250);
        var thumb_height = Math.min(data.image_height, 100);
        var thumb = "public/tmp/uploads/" + data.image.match(/([\w\-]+)\.\w+$/)[1] + ".jpg";
        gm(data.image).thumb(thumb_width, thumb_height, thumb, function(err) {
            var thumb_data = {count: data.count, thumb: thumb};
            if(port==80)
                add_to_chat(thumb_data, req.params.id);
            io.sockets.in(req.params.id).emit('chat', thumb_data);
            io.sockets.in('all').emit('chat', thumb_data);
        });
    }
}

/* socket.io content */
// no actual websockets in heroku
/*io.configure(function () {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 100);
    //io.set('log level', 1);
});*/

io.sockets.on('connection', function (socket) {
    socket.emit('request_location', "pls");
    socket.on('subscribe', function (data) {
        socket.join(data);
        //console.log("UPDATE", data);
    });
});

