const express = require('express')
let passport = require('passport')
const path = require('path')
let mongo = require('mongodb')
require('dotenv').config()
let GoogleStrategy = require('passport-google-oauth20').Strategy

const app = express()

app.use(require('cookie-parser')())
app.use(require('body-parser').urlencoded({ extended: true }))
app.use(require('express-session')({ secret: 'secret', resave: true, saveUninitialized: true }))

/* MongoDB */
let _db

/* Passport Config */
passport.use(new GoogleStrategy({
    clientID: process.env['GOOGLE_CLIENT_ID'],
    clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
    callbackURL: 'http://localhost:3000/auth/google/callback'
}, async (accessToken, refreshToken, email, cb) => {
    console.log('ACCESS_TOKEN', accessToken)
    console.log('REFRESH_TOKEN', refreshToken)
    console.log('EMAIL:', email['_json']['domain'])
    try {
        let user = await _db.db('google-test').collection('users').findOne({ email: email['emails'][0].value })
        if(!user) {
            user = {
                email: email['emails'][0].value
            }
            await _db.db('google-test').collection('users').insertOne(user)
        }
        cb(null, user)
    } catch (err) {
        cb(err)
    }
}))

passport.serializeUser((user, cb) => {
    cb(null, user.email)
})

passport.deserializeUser((email, cb) => {
    console.log('DESERIALIZE:',email)
    _db.db('google-test').collection('users').findOne({ email }, (err, user) => {
        if(err) cb(err)
        cb(null, user)
    })
})

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize())
app.use(passport.session())

/* Routes */

app.get('/', (req, res) => {
    res.sendFile(path.resolve('./index.html'))
})

app.get('/login', (req, res) => {
    res.sendFile(path.resolve('./login.html'))
})

app.get('/auth/google', passport.authenticate('google', { scope: ['email'] }))

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    // On success
    res.redirect('/')
})

app.listen(3000, () => {
    console.log('Server is listening on http://localhost:3000')
    mongo.MongoClient.connect('mongodb://localhost:27017', { useNewUrlParser: true }, (err, db) => {
        if(err) throw err
        _db = db
        // console.log(db)
    })
})