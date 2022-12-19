const express = require("express");
const passport = require("passport");
const cors = require("cors");
const logger = require("morgan");
const StravaStrategy = require("passport-strava-oauth2").Strategy;
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");

const app = express();

app.use(function (req, res, next) {
  res.header(
    "Access-Control-Allow-Origin",
    "https://statz.onrender.com, https://statz-api.onrender.com, https://strava.com"
  );
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "*"
    // "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.use(
  cors({
    credentials: true,
    origin: [
      "https://statz.onrender.com",
      "https://statz-api.onrender.com",
      "https://strava.com",
    ],
    exposedHeaders: ["Set-Cookie"],
  })
);

require("dotenv").config();

const fetch = (...args) =>
  import("node-fetch").then(({ default: _fetch }) => _fetch(...args));

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

passport.use(
  new StravaStrategy(
    {
      clientID: STRAVA_CLIENT_ID,
      clientSecret: STRAVA_CLIENT_SECRET,
      callbackURL: "/auth/strava/callback",
    },
    function (accessToken, refreshToken, profile, done) {
      process.nextTick(function () {
        return done(null, profile);
      });
    }
  )
);

app.use(logger("combined"));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.methodOverride());
app.use(cookieSession({ secret: "keyboard cat" }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

const SCOPES = "read,activity:read_all,read_all";

app.get(
  "/auth/strava",
  passport.authenticate("strava", { scope: SCOPES }),
  function (req, res) {
    // The request will be redirected to Strava for authentication, so this
    // function will not be called.
  }
);

app.get(
  "/auth/strava/callback",
  passport.authenticate("strava", {
    scope: SCOPES,
    failureRedirect: "/login",
  }),
  function (req, res) {
    console.log(req.user);
    res.redirect(`https://statz.onrender.com#${req.user.id}`);
  }
);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  // res.redirect("/login");
  res.redirect("/auth/strava");
}

app.get("/api/athlete", async (req, res) => {
  fetch(
    `https://www.strava.com/api/v3/athlete?access_token=${
      req.user?.token ?? ""
    }`
  )
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      res.status(response.status).json({ error: response.statusText });
      throw new Error(`${response.status} - ${response.statusText}`);
    })
    .then((data) => res.json(data))
    .catch((error) => console.error({ error }));
  // res.json(req.user);
});

app.get("/api/activities", async function (req, res) {
  if (!req.user) {
    res.json({ error: "Not authenticated" });
  }

  let page = 1;
  let activities = [];

  while (true) {
    const activitiesPromise = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=30&page=${page}&access_token=${req.user.token}`
    );
    const activitiesData = await activitiesPromise.json();
    page += 1;
    activities = [...activities, ...activitiesData];
    logger({ page });
    if (activitiesData.length < 30) {
      return res.json(activities);
    }
  }
});

app.get("/api/ping", function (req, res) {
  res.send("pong");
});

const listener = app.listen(process.env.PORT || 8080, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});
