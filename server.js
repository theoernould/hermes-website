const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
let session = require('express-session');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt')

app.use(session({resave: true, saveUninitialized: true, secret: 'toz', cookie: { maxAge: 60000 }}));

app.use(express.static(__dirname + "/public", {
    index: false,
    immutable: true,
    cacheControl: true,
    maxAge: "30d"
}));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

app.get('/home', (req, res) => {
    res.sendFile(__dirname + '/home.html');
});

/*app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}));*/

const user = {
    username: 'admin',
    passwordHash: 'admin',
    id: 1
}

passport.use(new LocalStrategy(async (username, password, done) => {
    if (err) {
        //return done(err)
    }

    if (username == user.username && password == user.passwordHash) {
        //return done(null, user)
    } else {
        //return done(null, false)
    }

    return done(null, user)

    /*findUser(username, (err, user) => {
        if (err) {
            return done(err)
        }

        // User not found
        if (!user) {
            return done(null, false)
        }

            // Always use hashed passwords and fixed time comparison
            bcrypt.compare(password, user.passwordHash, (err, isValid) => {
                if (err) {
                    return done(err)
                }
                if (!isValid) {
                    return done(null, false)
                }
                return done(null, user)
            })
    })*/
}
));

app.use(function (req, res, next) {
    // req.session.tick = Date.now();
    console.log(req.session.messages);
    let err = req.session.error;
    delete req.session.error;
    if (err)
        res.locals.message = err;
    next();
});

app.post('/login/auth',
    passport.authenticate('local', { successRedirect: '/home', failureRedirect: '/login', failureMessage: true }),
    function (req, res) {
        console.log("redirection réussie " + req.user.username);
        res.redirect('/home');
    });

class User {
    name
    publicKey

    constructor(name, publicKey) {
        this.name = name;
        this.publicKey = publicKey;
    }
}

let users = [];

io.on('connection', (socket) => {
    console.log('a user connected');
    let name;
    socket.on('disconnect', () => {
        console.log('user disconnected');
        let idx = users.findIndex(user => user.name == name);
        if (idx != -1) {
            users.splice(idx, 1);
        }
    });
    socket.on("login", (data) => {
        name = data.login;
        console.log("login");
        if (data.password == "admin") {
            console.log("connected");
            app.get('/', (req, res) => {
                res.sendFile(__dirname + '/accueil.html');
            });
        }
        //socket.emit("login response", data.login == "admin" && data.password == "admin");
    });
    socket.on("receive publicKey", (publicKey) => {
        users.push(new User(name, publicKey));
    });
});

function sendUsers() {
    io.emit("users", users);
}

setInterval(sendUsers, 1500);

server.listen(3000, () => {
    console.log('listening on *:3000');
});

module.exports = app;