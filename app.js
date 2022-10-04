const express = require("express");
const Express = express();
Express.use(express.json());

const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "twitterClone.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    Express.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//return a list of all the players from the team
//API 1

const convertPlayerToResponseObject = (objectItem) => {
  return {};
};

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

Express.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const userDetailsQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.all(userDetailsQuery);
  if (password.length < 6) {
    response.status(400);
    response.send("Password is too short");
  }
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
        )`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    response.send("User Created Successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// API 2

Express.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let jwtToken;
    let payload = { username: username };
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      jwtToken = jwt.sign(payload, "My_Access_Token");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

Express.get(
  "/user/tweets/feed/",
  authenticateToken,
  async (request, response) => {
    const { username } = request.params;
    const selectedQuery = `SELECT username, tweet, date_time AS dateTime FROM user INNER JOIN tweet ON user.user_id = tweet.user_id WHERE username = ${username}`;
    const tweets = await db.get(selectedQuery);
    response.send(tweets);
  }
);

module.exports = Express;
