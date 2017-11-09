var express = require("express");
var sqlite3 = require("sqlite3");
var bodyParser = require("body-parser");
var jwt = require("jsonwebtoken");
var dateFormat = require('dateformat');

var app = express();
var db = new sqlite3.Database('./Jeopardy.db');
var superSecretKey = 'cs390';

app.use( bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.get("/", function(req,res) {
    db.get("select * from users",function(e,u){
        return res.json(u);
    })
    return res.send("Hello World");
});

app.use(function(req, res, next) {
    if (req.path === "/auth/signin") {
        return next();
    }

    var token = req.body.auth || req.query.auth;
    if (token) {
        jwt.verify(token, superSecretKey, function(err, decoded) {
            if (err) {
                console.log("BAD TOKEN");
                return res.status(401).json({message: "unauthorized access"});
            }else {
                // Check token issue date
                var dbQuery = "select * from Users where AuthToken = ?";
                var requestParams = [token];

                db.get(dbQuery, requestParams, function(err, user) {
                    if (user){
                        var issueDate = user.AuthTokenIssued;
                    }
                });
                console.log("GOOD TOKEN");
                return next();
            }
        });
    }else {
        console.log("MISSING TOKEN");
        return res.status(401).json({message: "unauthorized access"});
    }
});


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

        // successful : generate a new jwt token, and add to AuthToken, and AuthTokenIssued to sqlite DB
        var token = jwt.sign(password, superSecretKey);
        var day = dateFormat(Date(), "yyyy-mm-dd h:MM:ss");

        var updateQuery = "UPDATE Users SET AuthToken=\""  + token + "\", AuthTokenIssued=\"" + day + "\" WHERE UserID=\"" + userID + "\";";
        db.run(updateQuery);

        return res.status(200).json({
            message: "success",
            token: token
        });
    });
});

app.post('/questionadd', function(req, res) {
    var airDate = req.body.airDate;
    var showNumber = req.body.showNumber;
    var dollarValue = req.body.dollarValue;
    var questionText = req.body.questionText;
    var answerText = req.body.answerText;
    var categoryCode = req.body.categoryCode;
    var categoryTitle = req.body.categoryTitle;

    if(airDate == null || showNumber == null || dollarValue == null || questionText == null || answerText == null
       || categoryCode == null || categoryTitle == null) {
        return res.status(401).json({message: "invalid_empty_inputs"});
    }

    if (showNumber < 0 || !isInt(showNumber)) {
        return res.status(401).json({message: "invalid_showNumber"});
    }

    if (dollarValue < 100 || dollarValue > 2000 || dollarValue % 100 != 0) {
        return res.status(401).json({message: "invalid_dollarValue"});
    }

    var categoryQuery = "select * from Categories where CategoryCode=" + categoryCode
        + " OR CategoryTitle=\"" + categoryTitle + "\"";

    var err;
    var resp = db.all(categoryQuery, function(err, rows){
        console.log(rows[0].CategoryCode);
        if (rows.length > 1) {
            err = "invalid_inputs";
        }
        if (rows.length == 1) {
            if (rows[0].CategoryCode != categoryCode) {
                err = "invalid_categoryCode";
            }
            if (rows[0].CategoryTitle != categoryTitle) {
                err = "invalid_categoryTitle";
            }
        }
        if (rows.length < 1) {
            // Add new record to db
            var ins = "insert into Categories (CategoryTitle, CategoryCode) VALUES ( ?, ? );";
            var params = [categoryTitle, categoryCode];
            db.run(ins, params);
        }
    });
    if (err) {
        return res.status(401).json({message: err});
    }

    console.log("INSERT");
    var quesInsert = "INSERT INTO Questions (ShowNumber, AirDate, CategoryCode, DollarValue, QuestionText, AnswerText) VALUES (?, ?, ?, ?, ?, ?)"
    var params = [showNumber, airDate, categoryCode, dollarValue, questionText, answerText];
    db.run(quesInsert, params, function(error ,res) {
        if(error) {
            console.log(error);
        }
    });

    return res.status(200).json({message: "success"});
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

function isInt(num) {
    return !isNaN(num) && parseInt(Number(num)) == num && !isNaN(parseInt(num, 10));
}
