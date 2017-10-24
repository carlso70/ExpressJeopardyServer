var express = require('express');
var bodyParser = require('body-parser');
var sqlite3 = require('sqlite3').verbose();
var utils = require('./utils.js');

var db = new sqlite3.Database('Data/Jeopardy.db');
var cors = require('cors');

var app = express();

app.use(cors());
app.use(bodyParser.urlencoded({
  extended:true
}));

app.use(bodyParser.json());

app.get('/', function(req, res) {
  return res.send("Hello World");
});

app.get('/stuff', function(req, res) {
  var {queryA, queryB, queryC} = req.query;
  var params = [];
  var currentQuery = "SELECT * FROM Stuff";
  db.all(currentQuery, params, function(err, rows) {
    if(err) {
      return res.status(500).json(
        {message: "Internal server error"});
    }
    else {
      return res.json(rows);
    }
  });
});


// Queries the db for questions, and attaches a response to the given HTTP response arguement given
function queryQuestions(query, params, req, res) {
  db.all(query,params, function(err, rows) {
    if (err) {
      console.log(err);
      return res.status(400).json({message: "invalid_data"});
    }
    if (rows.length > 5000)
      return res.status(401).json({message: "response_over_5000"});
    return res.status(200).json(rows);
  });
}

// Queries the Questions table (joined with the Categories table) and returns a list of questions matching the search criteria
app.get('/questions', function(req, res) {
  var {categoryTitle, airDate, questionText, dollarValue, answerText, showNumber} = req.query;

  if (typeof categoryTitle == "undefined") {
    // Build a query out of the data given
    var query = utils.buildQuestionQuery(-1, airDate, questionText, dollarValue, answerText, showNumber);
    // Query the Question DB with the query returned from the utils
    queryQuestions(query.query, query.params, req, res);

  } else {
    // Query the category table to find the category code from the title given
    var categoryQuery = "SELECT * FROM Categories WHERE CategoryTitle = ? COLLATE NOCASE";
    // Run the category query to get the category code from the title given
    db.get(categoryQuery, categoryTitle, function(err, result) {
      if (result) {
        // if a category code was found use it in the query
        var categoryCode = result.CategoryCode;
        var query = utils.buildQuestionQuery(categoryCode, airDate, questionText, dollarValue, answerText, showNumber);
        queryQuestions(query.query, query.params, req, res);
      } else {
        return res.status(400).json({ message: "invalid_data" });
      }
    });
  }
});

// Authenticates, and attempts to 'sign in' a user
app.post('/auth/signin', function(req, res) {
  var {userID, password} = req.body;
  var params = [userID, password];
  var currentQuery = "SELECT * FROM Users WHERE UserId = ? AND UserPassword = ?";
  if (userID.length === 0 || password.length === 0)
    return res.status(400).json({message: "invalid_data"});
  db.get(currentQuery, params, function(err, result) {
    console.log(result);
    if (result) {
      return res.status(200).json({message: "success"});
    }
    return res.status(401).json({message: "invalid_credentials"});
  });
});

var port = process.env.PORT || 3900;
var server = app.listen(port, function() {
  console.log(`App listening on port ${port}`);
});

