require('dotenv').load()

var express = require('express')
var app = express()
var path = require('path')
var bodyParser = require('body-parser')
var urlencoded = bodyParser.urlencoded({extended: false})
var mongoose = require('mongoose')

app.use(urlencoded)
app.use(express.static(path.join(__dirname, 'public')))
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

var port = process.env.PORT || 5000
var uristring = process.env.MONGOLAB_URI || process.env.MONGOHQ_URL || 'mongodb://localhost/test'

var havenondemand = require('havenondemand')
var hodClient = new havenondemand.HODClient(process.env.HOD_APIKEY)

var twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

mongoose.connect(uristring, function (err, res) {
  if (err) {
  console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
  console.log ('Succeeded connected to: ' + uristring);
  }
})

var schema = new mongoose.Schema({
  created: { type: Date, default: Date.now },
  concepts: mongoose.Schema.Types.Mixed,
  sentiments: mongoose.Schema.Types.Mixed,
  ApiVersion: String,
  TranscriptionType: String,
  TranscriptionUrl: String,
  TranscriptionSid: String,
  Called: String,
  RecordingSid: String,
  CallStatus: String,
  RecordingUrl: String,
  From: String,
  Direction: String,
  url: String,
  AccountSid: String,
  TranscriptionText: String,
  Caller: String,
  TranscriptionStatus: String,
  CallSid: String,
  To: String
})

var Call = mongoose.model('Call', schema);

app.get('/', function(req, res) {
  res.render('index', {

  })
})

app.get('/makeCall', function(req, res) {
  var query = req.query
  var phoneNumber = query.phoneNumber
  twilioClient.makeCall({
      url: "https://a606a4ed.ngrok.io/twilioVoice",
      // url: path.join(__dirname, '/twilioVoice')
      to: phoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
  }, function(err, call) {
      if (err) {
        console.log(err)
      } else {
        process.stdout.write(call.sid)
      }
  })
})

app.post('/transcriptionComplete', function(req, res) {
  var body = req.body
  var text  = body['TranscriptionText']
  console.log(body)
    if (text) {
      var data1 = {text: text}
      hodClient.call('analyzesentiment', data1, function(err1, resp1, body1) {
        var sentimentResponse = body1
        hodClient.call('extractconcepts', data1, function(err2, resp2, body2) {
          var conceptsResponse = body2
          var data2 = {
            index: "twiliocallcenter",
            json: JSON.stringify({
              document: [
                {
                  // title: counter.toString(),
                  // body: body
                  content: text,
                  // sentiments: sentimentResponse,
                  // concepts: conceptsResponse
                }
              ]
            })
          }
          hodClient.call('addtotextindex', data2, function(err3, resp3, body3) {
            var callObj = body
            callObj['created'] = Date.now()
            callObj['concepts'] = conceptsResponse
            callObj['sentiments'] = sentimentResponse
            var call = new Call (callObj)
            call.save(function (err) {if (err) console.log ('Error on save!')})
          })
        })
      })
    }
})

// Function for getting Twilio XML file
app.post('/twilioVoice', function(req, res) {
  var fileName = path.join(__dirname, '/twilioVoice.xml')
  res.sendFile(fileName, function (err) {
    if (err) {
      console.log(err)
    }
  })
})

app.listen(port, function() {
  console.log('Listening on port: ' + port)
})