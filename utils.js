// Utils
// ======
module.exports = {
  // Returns an object with a params and query list
  buildQuestionQuery: function(categoryCode, airDate, questionText, dollarValue, answerText, showNumber) {
    var query = {};
    //query.query = "SELECT * FROM Categories WHERE CategoryTitle = 'History' COLLATE NOCASE"
    query.query = "SELECT * FROM Questions";
    query.params = [];
    console.log(categoryCode)
    if (categoryCode > 0) {
      query.query += " WHERE CategoryCode = ?";
      query.params.push(categoryCode);
    }
    // Check if airdate is valid
    if (airDate) {
      query.query += " AirDate = ?";
      query.params.push(airDate);
    }
    if (questionText) {
      query.query += " QuestionText = ?";
      query.params.push(questionText);
    }
    if (answerText) {
      query.query += " AnswerText = ?";
      query.params.push(answerText);
    }
    if (dollarValue) {
      query.query += " DollarValue = ?";
      query.params.push(dollarValue);
    }

    query.params.length > 0? query.query += " COLLATE NOCASE ORDER BY date(AirDate) DESC" : query.query += " ORDER BY date(AirDate) DESC";
    return query;
  }
};
