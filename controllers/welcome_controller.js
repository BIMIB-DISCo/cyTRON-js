var cytoscape = require('cytoscape');
var jquery = require('jquery');
var graphml = require('cytoscape-graphml');
var fs = require('fs');
// Modules for authentication
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
var mongodb = require('mongodb');
// Module for password encryption
var bcrypt = require('bcrypt')
var crypto = require('crypto')
var BCRYPT_SALT_ROUNDS = 12
// Module for email encryption
var crypto = require('crypto')
// Module for email verification
var verifier = require('email-verify')
var infoCodes = verifier.infoCodes

var MongoClient = mongodb.MongoClient;
var dburl = "mongodb://localhost:27017/cyTRONJS_users";

graphml( cytoscape, jquery ); // register extension

function encrypt(text){
    var cipher = crypto.createCipher('aes-256-cbc','nd3kkR47')
    var crypted = cipher.update(text,'utf8','hex')
    crypted += cipher.final('hex');
    return crypted;
}
/*  
function decrypt(text){
    var decipher = crypto.createDecipher('aes-256-cbc','d6F3Efeq')
    var dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
}*/

  // configure passport.js to use the local strategy
  // This is the function which is invoked upon user login
  // it receives as parameters the password and email
  // inserted in the web page
  passport.use(new LocalStrategy(
    { usernameField: 'inputEmail', passwordField: 'inputPassword' },
    (email, password, done) => {
        console.log('email: ' + email)
        console.log('email encrypted: ' + encrypt(email))
        console.log('password: ' + password)
        console.log('Inside local strategy callback')
        // here is where you make a call to the database
        // to find the user based on their username or email address
        MongoClient.connect(dburl, function(err, database) {
            const users_db = database.db('users')
            if (err) {
                done(err)
            }
            data = ''
            var collection = users_db.collection('utenti')
            collection.find({email : encrypt(email)}).toArray(function(err, docs) {
                database.close()
                const user = docs[0]
                if (!user) {
                    // Case where the email is not found in te database
                    return done(null, false, {message : 'Invalid credentials.\n'})
                } else {
                    // A user with the same email inserted exists
                    // Now check for the correctness of the password inserted
                    bcrypt.compare(password, user.password, function (err, result){
                        if (err) {
                            done(err)
                        } else if (!result) {
                            // Passwords don't match
                            return done(null, false, { message : 'Invalid password' })
                        } else {
                            // Passwords match, return the user
                            return done(null, user)
                        }
                    })
                }
            })
        })
    }
));
  
  // tell passport how to serialize the user
  passport.serializeUser((user, done) => {
    console.log('Inside serializeUser callback. User id is save to the session file store here')
    done(null, user._id);
  });

  passport.deserializeUser((id, done) => {
    console.log('Inside deserializeUser callback')
    console.log(`The user id passport saved in the session file store is: ${id}`)
    
    MongoClient.connect(dburl, function(err, database) {
        const users_db = database.db('users')
        if (err) {
            throw err
        }
        data = ''
        var collection = users_db.collection('utenti')
        collection.find({_id : id}).toArray(function(err, docs) {
            database.close()
            if (err)
                done(error, false)
            done(null, docs)
        })
    })

  });

// This function is called when the application is started
// See welcome.js route file: when a user requests '/welcome/',
// this function is called
exports.start_widget_get = function(req, res, next) {
    var dir = __dirname + '/widget_data'
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir)
    // If the user il logged in visualize his/her
    // home page (the one with options)
    if (req.isAuthenticated())
        res.redirect('/cytronjs/tronco/user_options')
    else
        res.render('insert_email')
}

// This function is called when a user insterts his/her email
exports.start_widget_post = function(req, res, next) {
    passport.authenticate('local', (err, user, info) => {
        console.log('Inside passport.authenticate() callback');
        console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
        console.log(`req.user: ${JSON.stringify(req.user)}`)
        
        req.login(user, (err) => {
          console.log('Inside req.login() callback')
          console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
          console.log(`req.user: ${JSON.stringify(req.user)}`)
 
          if(req.isAuthenticated()) {
            req.session.email = encrypt(req.body.inputEmail)
            res.redirect('/cytronjs/tronco/user_options')
          } else {
                res.render('insert_email', { error : info.message })
          }
        })
    })(req, res, next);

    
}

exports.visualize_model = function(req, res) {
    fs.readdir(__dirname + '/public_data/', function(err, files) {
        res.render('index', {login_logout : 'log-in', 
            login_logout_link : '/cytronjs/welcome',
            public_graphs_name : files})
    })
}

exports.signup_get = function(req, res) {
    res.render('signup', {login_logout : 'log-in', login_logout_link : '/cytronjs/welcome'})
}

exports.signup_post = function(req, res, next) {

    var password = req.body.inputPassword
    var email = req.body.inputEmail
    // Verify if the email inserted is a valid address
    //verifier.verify(email, function(err, info) {
        //if (!info.success) {
            //return res.render('signup', {invalid_email : 'Invali e-mail, make sure to insert an existing address', 
            //login_logout : 'log-in', login_logout_link : '/welcome'})
        //} else {
    MongoClient.connect(dburl, function(err, database) {
        const users_db = database.db('users')
        if (err) {
            res.render('signup', {login_logout : 'log-in', login_logout_link : '/cytronjs/welcome'})
        }
        data = ''
        bcrypt.hash(password, BCRYPT_SALT_ROUNDS, function (err,  hash) {
            var user = {email: encrypt(email), password : hash}
            var collection = users_db.collection('utenti')
            if (err) {
                res.render('signup', {login_logout : 'log-in', login_logout_link : '/cytronjs/welcome'})
            }
            // Check if a user with the same email aready exists
            collection.find({email : encrypt(email)}).toArray(function(err, docs) {
                if (err) {
                    // Error during the database search
                    res.render('signup', {login_logout : 'log-in', login_logout_link : '/cytronjs/welcome'})
                }
                else if (docs.length > 0) {
                    // The database already contains a registered user with the same email
                    res.render('signup', {invalid_email : 'A user with this username address already exists',
                    login_logout : 'log-in', login_logout_link : '/cytronjs/welcome'})
                } else {
                    // Insert the new user in the database
                    collection.insert(user, function(err, result) {
                        if (err)
                            res.render('signup', {login_logout : 'log-in', login_logout_link : '/cytronjs/welcome'})
                        database.close()
                        // Now automatically authenticate the new user
                        passport.authenticate('local', (err, user, info) => {
                            console.log('Inside passport.authenticate() callback');
                            console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
                            console.log(`req.user: ${JSON.stringify(req.user)}`)
                            
                            req.login(user, (err) => {
                                console.log('Inside req.login() callback')
                                console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
                                console.log(`req.user: ${JSON.stringify(req.user)}`)
                                
                                //return res.send('You were authenticated & logged in!\n');
                                if(req.isAuthenticated()) {
                                //res.send('you hit the authentication endpoint\n')
                                req.session.email = encrypt(req.body.inputEmail)
                                res.redirect('/cytronjs/tronco/user_options')
                                } else {
                                    res.render('insert_email', { error : info.message })
                                }
                            })
                        })(req, res, next);
                        
                    })
                }
            })
        })
    })
        //}

    //})


    //})
}
