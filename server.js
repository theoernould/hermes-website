const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http');
const server = http.createServer(app);
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
    store: new SQLiteStore({ db: 'sessions.db', dir: './db' })
}));
app.use(passport.authenticate('session'));

app.use(express.static(__dirname + "/public", {
    index: false,
    immutable: true,
    cacheControl: true,
    maxAge: "30d"
}));

app.use(session({
    secret: 'r8q,+&1LM3)CD*zAGpx1xm{NeQhc;#',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    // function of username, password, done(callback)
    function (username, password, done) {
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
});

app.get('/signup', (req, res) => {
    res.sendFile(__dirname + '/signup.html');
});

app.get('/home', (req, res) => {
    res.sendFile(__dirname + '/home.html');
});

app.post('/logout', function (req, res, next) {
    req.logout();
    res.redirect('/');
});

/* PARTIE SOCKET */

class User {
    username
    pubKey
    token

    constructor(username, pubKey, token) {
        this.username = username;
        this.pubKey = pubKey;
        this.token = token;
    }
}

let users;

io.on('connection', (socket) => {
    console.log('a user connected');
    let name;
    let pubKey;
    let token;
    socket.on("receiveInfos", (data) => {
        console.log("receive " + data.name);
        name = data.name;
        token = data.token;
        pubKey = data.pubKey;
        users.push(new User(data.name, data.key, data.token));
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
        /*let idx = users.findIndex(user => user.name == name);
        if (idx != -1) {
            users.splice(idx, 1);
        }*/
    });
});
/*
function sendUsers() {
    io.emit("users", users);
}

setInterval(sendUsers, 1500);*/

server.listen(3000, () => {
    console.log('listening on *:3000');
});

module.exports = app;