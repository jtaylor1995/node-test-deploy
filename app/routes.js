var express = require('express')
var router = express.Router()
var request = require('request')
var http = require('https')

var NotifyClient = require('notifications-node-client').NotifyClient,
  notifyClient = new NotifyClient('testingsetupkey-5f7c2a41-1c8a-4f80-a3ac-1e751ff2cba6-2fec88fd-37d7-42d6-aadd-8f26549e4cde')

// Route index page
router.get('/', function (req, res) {
  res.render('index')
})

router.get('/events-page', function (req, res) {
  request.get('http://127.0.0.1:8080/api/events', function (err, response, body) {
    if (!err) {
      var events = JSON.parse(body)

      res.render('events', {
        title: 'Events',
        events: events
      })
    }
  })
})

router.get('/pay1', function (req, response) {
  var options = {
    'method': 'POST',
    'hostname': 'publicapi.payments.service.gov.uk',
    'port': null,
    'path': '/v1/payments',
    'headers': {
      'accept': 'application/json',
      'authorization': 'Bearer 5rqpvsj7hu3sjc5hn78lau36ash9nfrnrqqk6h9qgs8ij74tr5tam571bu',
      'content-type': 'application/json'
    }
  }

  var req = http.request(options, function (res) {
    var chunks = []

    res.on('data', function (chunk) {
      chunks.push(chunk)
    })

    var body
    res.on('end', function () {
      body = Buffer.concat(chunks)
      var json = JSON.parse(body.toString())
      response.redirect(json._links.next_url.href)
    })
  })

  req.write(JSON.stringify({ amount: 12000,
    reference: '12345',
    description: 'New passport application',
    return_url: 'https://service-name.gov.uk/transactions/12345' }))
  req.end()
})

router.get('/send-text', function (req, res) {
  var personalisation = {
    'name': 'Amala',
    'day of week': 'Sunday',
    'colour': 'Yellow'
  }

  notifyClient
	.sendSms('4ac94753-bee8-4c2d-a33a-690ccc86a38a', '07835180829', personalisation)
	.then(response => console.log('Response'))
	.catch(err => console.error(err))

  res.redirect('/')
})

router.get('/send-email', function (req, res) {
  var personalisation = {
    'Subject': 'Amala',
    'name': 'Sunday'
  }

  notifyClient
	.sendEmail('1d81da7b-14b8-479e-8c22-1e163c1953da', 'sc13jt@gmail.com', personalisation)
    .then(response => console.log('Response'))
    .catch(err => console.error(err))

  res.redirect('')
})

// Post Register
router.post('/add-event', function (req, res) {
  var name = req.body.name
  var location = req.body.location
  var description = req.body.description

  var eventData = {
    'name': name,
    'description': description,
    'location': location
  }

  request.post({
    headers: {'content-type': 'application/json'},
    url: 'http://127.0.0.1:8080/api/events',
    json: eventData
  }, function (error, response, body) {
    request.get('http://127.0.0.1:8080/api/events', function (err, response, body) {
      if (!err) {
        var events = JSON.parse(body)

        res.render('events', {
          title: 'Events',
          events: events
        })
      }
    })
  })
})

	// Validation
	// req.checkBody('name', 'Name is required').notEmpty();
	// req.checkBody('location', 'Location is required').notEmpty();
	// req.checkBody('description', 'Description is required').notEmpty();
  //
  //
	// var errors = req.validationErrors();
  //
	// if(errors){
	// 	res.render('register',{
	// 		errors:errors
	// 	});
	// } else {
  //   //COMES FROM MODEL
	// 	var newUser = new User({
	// 		name: name,
	// 		email:email,
	// 		username: username,
	// 		password: password
	// 	});
  //
  //   // Function that is in the model
	// 	User.createUser(newUser, function(err, user){
	// 		if(err) throw err;
	// 		console.log(user);
	// 	});
  //
	// 	req.flash('success_msg', 'You are registered and can now login');
  //
	// 	res.redirect('/users/login');
	// }
// });

// add your routes here
module.exports.bindRoutesTo = (app) => {
  var PAY_PATH = '/pay'
  var RETURN_PATH = '/return/'
  var PAY_API_PAYMENTS_PATH = '/v1/payments'
  var api = require(__dirname + '/utils/api.js')
  var util = require(__dirname + '/utils/util.js')
  var _ = require('lodash')

  app.get(PAY_PATH, (req, res) => {
    var PAY_API_URL = api.getUrl(req) + PAY_API_PAYMENTS_PATH

    function getSelfUrl () {
      return req.protocol + '://' + req.get('host')
    }

    function findNextUrlPost (data) {
      var next_url_post = _.get(data, '_links.next_url_post')
      if (typeof next_url_post === 'undefined') {
        throw Error("Resource doesn't provide a 'next_url_post' relational link: " + JSON.stringify(data))
      }
      return next_url_post
    }

    var paymentReference = req.body.reference
    var returnPage = getSelfUrl() + RETURN_PATH + paymentReference
    if (!util.isNumeric(req.body.amount)) {
      var data = {
        'auth_token': req.query.authToken,
        'reference': req.body.reference,
        'description': req.body.description,
        'proceed_to_payment_path': PAY_PATH,
        'invalidAmountMsg': 'Invalid amount value. Only integer values allowed'
      }
      res.render('index')
      return
    }
    var paymentRequest = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + api.getKey(req)
      },
      data: {
        'amount': parseInt(req.body.amount),
        'reference': req.body.reference,
        'description': req.body.description,
        'return_url': returnPage
      }
    }

    notofyClient.post(PAY_API_URL, paymentRequest, (data, payApiResponse) => {
      if (payApiResponse.statusCode == 201) {
        req.state[paymentReference] = { pid: data.payment_id }
        req.state['lastPayment'] = {payment_id: data.payment_id}

        var frontendCardDetailsUrlPost = findNextUrlPost(data)
        var responseData = {
          'reference': data.reference,
          'description': data.description,
          'formattedAmount': currency.format(data.amount),
          'submit_payment_url': frontendCardDetailsUrlPost.href,
          'token_id': frontendCardDetailsUrlPost.params.chargeTokenId
        }

        // res.render('submit', responseData);
        res.render('index')
        return
      }
      if (payApiResponse.statusCode == 401) {
        res.statusCode = 401
        response(req, res, 'error', {
          'message': 'Credentials are required to access this resource'
        })
      } else {
        res.statusCode = 400
        response(req, res, 'error', {
          'message': 'Sample service failed to create charge'
        })
      }
    }).on('error', (err) => {
      response(req, res, 'error', {
        'message': 'Sample service failed to create charge'
      })
    })
  })
}

module.exports = router
