const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const passportJWT = require("passport-jwt");
const dotenv = require("dotenv");
dotenv.config();

const userService = require("../user-service.js");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect to DB before every request
app.use(async (req, res, next) => {
  try {
    await userService.connect();
    next();
  } catch (err) {
    res.status(500).json({ error: "Database connection failed." });
  }
});

const ExtractJwt = passportJWT.ExtractJwt;
const JwtStrategy = passportJWT.Strategy;

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
};

const strategy = new JwtStrategy(jwtOptions, (jwt_payload, next) => {
  userService.getUserById(jwt_payload._id)
    .then(user => next(null, user))
    .catch(() => next(null, false));
});

passport.use(strategy);
app.use(passport.initialize());

// Routes
app.post("/api/user/register", (req, res) => {
  userService.registerUser(req.body)
    .then(msg => res.json({ message: msg }))
    .catch(msg => res.status(422).json({ message: msg }));
});

app.post("/api/user/login", (req, res) => {
  userService.checkUser(req.body)
    .then(user => {
      const payload = {
        _id: user._id,
        userName: user.userName
      };
      const token = jwt.sign(payload, jwtOptions.secretOrKey);
      res.json({ message: "login successful", token });
    })
    .catch(msg => res.status(422).json({ message: msg }));
});

// Protected Routes
app.get("/api/user/favourites", passport.authenticate('jwt', { session: false }), (req, res) => {
  userService.getFavourites(req.user._id)
    .then(data => res.json(data))
    .catch(msg => res.status(422).json({ error: msg }));
});

app.put("/api/user/favourites/:id", passport.authenticate('jwt', { session: false }), (req, res) => {
  userService.addFavourite(req.user._id, req.params.id)
    .then(data => res.json(data))
    .catch(msg => res.status(422).json({ error: msg }));
});

app.delete("/api/user/favourites/:id", passport.authenticate('jwt', { session: false }), (req, res) => {
  userService.removeFavourite(req.user._id, req.params.id)
    .then(data => res.json(data))
    .catch(msg => res.status(422).json({ error: msg }));
});

app.get("/api/user/history", passport.authenticate('jwt', { session: false }), (req, res) => {
  userService.getHistory(req.user._id)
    .then(data => res.json(data))
    .catch(msg => res.status(422).json({ error: msg }));
});

app.put("/api/user/history/:id", passport.authenticate('jwt', { session: false }), (req, res) => {
  userService.addHistory(req.user._id, req.params.id)
    .then(data => res.json(data))
    .catch(msg => res.status(422).json({ error: msg }));
});

app.delete("/api/user/history/:id", passport.authenticate('jwt', { session: false }), (req, res) => {
  userService.removeHistory(req.user._id, req.params.id)
    .then(data => res.json(data))
    .catch(msg => res.status(422).json({ error: msg }));
});

module.exports = serverless(app);
