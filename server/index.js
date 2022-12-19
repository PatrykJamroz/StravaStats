const express = require("express");
const passport = require("passport");
const cors = require("cors");
const logger = require("morgan");
const StravaStrategy = require("passport-strava-oauth2").Strategy;
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const path = require("path");

const app = express();
app.use(express.static(path.resolve(__dirname, "../client/build")));

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

app.use(cors());
app.use(logger("combined"));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.methodOverride());
app.use(cookieSession({ secret: "keyboard cat" }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Origin", req.headers.origin);
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept"
  );
  if ("OPTIONS" == req.method) {
    res.send(200);
  } else {
    next();
  }
});

// app.use(function (req, res, next) {
//   res.header('Access-Control-Allow-Origin', '*');
//   // res.header('Access-Control-Allow-Headers', 'X-Requested-With');
//   next();
// });

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
    res.redirect("https://statz.onrender.com");
  }
);

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
});

app.get("/api/activities", async function (req, res) {
  if (!req.user) {
    res.json({ error: "Not authenticated" });
  }
  // const activitiesPromise = await fetch(
  //   `https://www.strava.com/api/v3/athlete/activities?per_page=30&access_token=${req.user.token}`
  // );
  // const activitiesData = await activitiesPromise.json();
  // res.json({ activitiesData });

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

// app.get('*', (req, res) => {
//   res.sendfile(path.resolve(__dirname, '../build/', 'index.html'));
// });
// /Users/patrykjamroz/webdev/stravastats/build/index.html

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

// app.get('/account', ensureAuthenticated, function (req, res) {
//   // res.render('account', { user: req.user });
//   res.json({ user: req.user });
// });

// app.get('/login', function (req, res) {
//   res.render('login', { user: req.user });
// });

app.get("/api/ping", function (req, res) {
  res.send("pong");
});

const listener = app.listen(process.env.PORT || 8080, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

// app.get("/*", function (req, res) {
//   res.sendfile(path.join(__dirname, "../client/build", "index.html"));
// });
