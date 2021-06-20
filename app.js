const express = require("express");
const app = express();
const path = require("path");
const redis = require("redis");
const client = redis.createClient();
const bcrypt = require("bcrypt");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const saltRounds = 10;
const hash = await bcrypt.hash("PASSWORD", saltRounds);
const result = await bcrypt.compare("PASSWORD", hash); //result is true or false

app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new RedisStore({ client: client }), //Session data is stored server-side in Redis
    resave: true,
    saveUninitialized: true, //when a session is initialized a cookie is automatically sent to the client
    cookie: {
      maxAge: 36000000, //10 hours, in milliseconds
      httpOnly: false,
      secure: false, //otherwise it won't work locally
    },
    secret: "bM80SARMxghj5fiWhulfNSeUFURWLTY8vyf",
  })
);

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => res.render("index"));
app.listen(3000, () => console.log("Server ready"));

app.post("/", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.render("error", {
      message: "Please set both username and password",
    });
    return;
  }

  console.log(req.body, username, password);

  const saveSessionAndRenderDashboard = (userid) => {
    req.session.userid = userid;
    req.session.save();
    res.render("dashboard");
  };
});
client.hget("users", username, (err, userid) => {
  if (!userid) {
    //signup procedure
    client.incr("userid", async (err, userid) => {
      client.hset("users", username, userid);

      const saltRounds = 10;
      const hash = await bcrypt.hash(password, saltRounds);

      client.hset(`user:${userid}`, "hash", hash, "username", username);

      saveSessionAndRenderDashboard(userid);
    });
  } else {
    //login procedure
    client.hget(`user:${userid}`, "hash", async (err, hash) => {
      const result = await bcrypt.compare(password, hash);
      if (result) {
        saveSessionAndRenderDashboard(userid);
      } else {
        res.render("error", {
          message: "Incorrect password",
        });
        return;
      }
    });
  }
});
