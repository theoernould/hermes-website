const fs = require('fs');
const key = fs.readFileSync('./keys/key.pem');
const cert = fs.readFileSync('./keys/cert.pem');
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const https = require('https');
const server = https.createServer({key: key, cert: cert }, app);
const { Server } = require("socket.io");
const io = new Server(server);
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const SQLiteStore = require('connect-sqlite3')(session);
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const crypto = require('crypto');

let db = new sqlite3.Database('./db/database.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the users database.');
});

/*db.run("DROP TABLE IF EXISTS users");
db.run(`CREATE TABLE IF NOT EXISTS users(username text, password text, salt text)`);*/
//db.run(`DELETE FROM users`);
//db.run(`INSERT INTO users(username,password,salt) VALUES(?,?,?)`, ["admin", "admin", ""]);

db.each('SELECT * FROM users', (err, row) => {
    if (err) {
        console.error(err.message);
    }
    row
        ? console.log(row.username, row.password)
        : console.log(`No user found with the id`);

});


/* PARTIE IDENTIFICATION */

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    //store: new SQLiteStore({ db: 'sessions.db', dir: './db' }),
    cookie: { secure: true }
}));
app.use(passport.authenticate('session'));

app.use(express.static(__dirname + "/public"/*, {
    index: false,
    immutable: true,
    cacheControl: true
    //maxAge: "30d"
}*/));
/*
app.use(session({
    secret: 'r8q,+&1LM3)CD*zAGpx1xm{NeQhc;#',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));
*/
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

let users = new Array();

passport.use(new LocalStrategy(
    // function of username, password, done(callback)
    function (username, password, done) {
        if(users.findIndex(user => user.username == username) != -1) return done(null, false, {message : 'already logged in'});
        db.get('SELECT * FROM users WHERE username = ?', [username], function (err, row) {
            if (err) { return done(err); }
            if (!row) { return done(null, false, { message: 'Incorrect username or password.' }); }

            crypto.pbkdf2(password, row.salt, 310000, 32, 'sha256', function (err, hashedPassword) {
                if (err) { return done(err); }
                if (!crypto.timingSafeEqual(row.password, hashedPassword)) {
                    return done(null, false, { message: 'Incorrect username or password.' });
                }
                return done(null, row);
            });
        });
    }
));

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

app.post('/login', passport.authenticate('local', { failureRedirect: '/' }), function (req, res) {
    console.log(req.user);
    res.redirect('/home');

});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.post('/signup', function (req, res, next) {
    if (req.body.username != "general" && req.body.username.length <= 20) {
        let salt = crypto.randomBytes(16);
        crypto.pbkdf2(req.body.password, salt, 310000, 32, 'sha256', function (err, hashedPassword) {
            if (err) { return next(err); }
            db.run('INSERT INTO users (username, password, salt) VALUES (?, ?, ?)', [
                req.body.username,
                hashedPassword,
                salt
            ], function (err) {
                if (err) { return next(err); }
                let user = {
                    id: this.lastID,
                    username: req.body.username
                };
                req.login(user, function (err) {
                    if (err) { return next(err); }
                    db.get('SELECT * FROM users', (err, row) => {
                        if (err) {
                            return console.error(err.message);
                        }
                        return row
                            ? console.log(row.username, row.password)
                            : console.log(`No user found with the id ${playlistId}`);

                    });
                    res.redirect('/');
                });
            });
        });
    } else {
        res.redirect('/signup');
    }
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/signup.html');
});

app.get('/home', loginRequired, (req, res) => {
    res.sendFile(__dirname + '/home.html');
});

function loginRequired(req, res, next) {
    if (!req.session.passport || !req.session.passport.user)
      return res.status(401).json({status: 'Please log in'});
    return next();
  }

app.post('/logout', function (req, res, next) {
    console.log("logout");
    req.logout();
    res.setHeader("Content-Type", "text/html");
    res.redirect('/');
});

/* PARTIE SOCKET */

class User {
    username
    pubKey
    token
    socket

    constructor(username, pubKey, token, socket) {
        this.username = username;
        this.pubKey = pubKey;
        this.token = token;
        this.socket = socket;
    }

    getDto() {
        return {
            username: this.username,
            pubKey: this.pubKey
        };
    }
}

class Message {
  from
  to
  content
  timestamp
  crypted

  constructor(from, to, content, timestamp, crypted) {
    this.from = from;
    this.to = to;
    this.content = content;
    this.timestamp = timestamp;
    this.crypted = crypted;
  }
}

let messages = new Array();

io.on('connection', (socket) => {
    console.log('a user connected');
    let USER;
    socket.on("sendMessage", (data) => {
        console.log(USER.username + " veut envoyer '" + data.content + "' à " + data.to);
        let msg = new Message(USER.getDto(), data.to, data.content, Date.now(), data.crypted);
        messages.push(msg);
        if (data.to == "general") {
            io.emit("newMessage", msg);
        } else {
            let idx = users.findIndex(user => user.username == data.to);
            if (idx != -1) {
                let userTo = users[idx];
                socket.emit("newMessage", msg);
                userTo.socket.emit("newMessage", msg);
            }
        }
    });
    socket.on("receiveInfos", (data) => {
        if(data.name.length >= 20) socket.disconnect();
        USER = new User(data.name, data.key, data.token, socket);
        users.push(USER);
        console.log(USER);
        io.emit("newUser", USER.getDto());
        socket.emit("getAllUsers", users.map(user => user.getDto()).filter(user => user.username != USER.username));
        socket.emit("getAllMessages", messages.filter(msg => msg.to == "general" || msg.to == USER.username || msg.from == USER.username));
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
        let idx = users.findIndex(user => user.token == USER.token);
        if (idx != -1) {
            users.splice(idx, 1);
        }
        io.emit("userDisconnected", USER.getDto());
    });
    socket.onAny((event, ...args) => {
        console.log(event, args);
    });
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

module.exports = app;