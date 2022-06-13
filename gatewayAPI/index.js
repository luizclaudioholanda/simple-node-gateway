require("dotenv-safe").config();
const express = require('express')
const httpProxy = require('express-http-proxy')
const helmet = require('helmet');

var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var http = require('http');

const app = express();
const port = 3000;

app.use(logger('dev'));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const {
  USERS_API_URL,
  PRODUCTS_API_URL,
} = require('./urls');

const userServiceProxy = httpProxy(USERS_API_URL);
const productsServiceProxy = httpProxy(PRODUCTS_API_URL);

app.post('/login', (req, res, next) => {
    if(req.body.user === 'luiz' && req.body.pwd === '123'){
        //auth ok
        const id = 1; //esse id viria do banco de dados
        var token = jwt.sign({ id }, process.env.SECRET, {
            expiresIn: 300 // expires in 5min
        });
        res.status(200).send({ auth: true, token: token });
    } else {

        res.status(500).send('Incorrect login!');
    }
});

app.get('/logout', function(req, res) {
    res.status(200).send({ auth: false, token: null });
});

function verifyJWT(req, res, next){
    var token = req.headers['x-access-token'];
    if (!token) return res.status(401).send({ auth: false, message: 'No token provided.' });

    jwt.verify(token, process.env.SECRET, function(err, decoded) {
        if (err) {
            return res.status(500).send({ auth: false, message: 'Failed to authenticate token.' });
        }
        
        // se tudo estiver ok, salva no request para uso posterior
        req.userId = decoded.id;
        next();
    });
}

app.get('/', (req, res) => res.send('Hello Gateway API'));
app.get('/users', verifyJWT, (req, res, next) => userServiceProxy(req, res, next));
app.get('/products', verifyJWT, (req, res, next) => productsServiceProxy(req, res, next));

var server = http.createServer(app);
server.listen(port, () => console.log(`Example app listening on port ${port}!`));