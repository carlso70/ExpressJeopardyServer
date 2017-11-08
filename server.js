var express = require("express");
var sqlite3 = require("sqlite3");
var bodyParser = require("body-parser");

var app = express();
var db = new sqlite3.Database('./Jeopardy.db');

app.use( bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.get("/", function(req,res) {
	db.get("select * from users",function(e,u){
		return res.json(u);
	})
	return res.send("Hello World");
})


app.post('/auth/signin', function(req, res) {
	var userID = req.body.userID;
	var password = req.body.password;

	if(userID == null || password == null) {
		return res.status(401).json({message: "invalid_credentials"});
	}

	var dbQuery = "select * from Users where UserID = ? and UserPassword = ?";
	var requestParams = [userID, password];

	db.get(dbQuery, requestParams, function(err, user) {
		if(err) {
			return res.status(500).json({message: "Internal server error"});
		}

		if(user == null) {
			return res.status(401).json({message: "invalid_credentials"});
		}

		return res.status(200).json({message: "success"});
	});
});

app.get('/questions', function(req, res) {
	var categoryTitle = req.query.categoryTitle;
	var dollarValue = req.query.dollarValue;
	var questionText = req.query.questionText;
	var answerText = req.query.answerText;
	var showNumber = req.query.showNumber;
	var airDate = req.query.airDate;

	var dbQuery = "select * from Questions join Categories on Questions.CategoryCode = Categories.CategoryCode where ";
	var paramCount = 0;
	var params = [];

	if (categoryTitle != null) {
		if(paramCount > 0) {
			dbQuery = dbQuery + 'and ';
		}
		paramCount++;
		dbQuery = dbQuery + 'CategoryTitle = ? ';
		params.push(categoryTitle.toUpperCase());
	}

	if (dollarValue != null) {

		if(paramCount > 0) {
			dbQuery = dbQuery + 'and ';
		}

		paramCount++;
		dbQuery = dbQuery + 'DollarValue = ? ';
		dollarValue = "$" + dollarValue;
		params.push(dollarValue);
	}

	if (questionText) {

		if(paramCount > 0) {
			dbQuery = dbQuery + 'and ';
		}

		paramCount++;
		dbQuery = dbQuery + 'QuestionText like ? ' ;
		questionText = '%' + questionText + '%';
		params.push(questionText);
	}

	if (answerText) {

		if(paramCount > 0) {
			dbQuery = dbQuery + 'and ';
		}

		paramCount++;
		dbQuery = dbQuery + 'AnswerText = ? ';
		params.push(answerText);
	}

	if (showNumber) {

		if(paramCount > 0) {
			dbQuery = dbQuery + 'and ';
		}

		paramCount++;
		dbQuery = dbQuery + 'ShowNumber = ? ';
		params.push(showNumber);
	}

	if (airDate) {

		if(paramCount > 0) {
			dbQuery = dbQuery + 'and ';
		}

		paramCount++;
		dbQuery = dbQuery + 'AirDate = ? ';
		params.push(airDate);
	}

	dbQuery = dbQuery + 'order by AirDate desc';

	if(paramCount == 0) {
		dbQuery = "select * from Questions order by AirDate desc";
	}

	db.all(dbQuery, params, (err, questions) => {

		if(questions.length > 5000) {
			return res.status(400).json({message: "too_many_results"});
		}

		if (err) {
			console.log(err);
			return res.status(500).json({message: "Internal server error"});
		}

		return res.status(200).json(questions);
	});
});

var port = process.env.PORT || 8000;
app.listen(port, function() {
	console.log("Running server on port " + port);
});
