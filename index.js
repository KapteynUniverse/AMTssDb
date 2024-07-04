import express from "express";
import axios from "axios";
import env from "dotenv";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session"; // cookie
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";

const app = express();
const port = 3000;
const saltRounds = 10; //hashing
const API_URL = "https://api.themoviedb.org/3"; // API for AMTsDB
const IMG_URL = "https://image.tmdb.org/t/p/original"; // Poster URL
env.config();

// Middleware

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 86400,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Env

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

// Check if user is connected and open main page or login/register

app.get("/", async (req, res) => {
  if (req.isAuthenticated()) {
    const user_id = req.user.id;
    try {
      const database = await db.query(
        `SELECT * FROM AMTsDb WHERE user_id = $1 AND watchlist = 'no'`,
        [user_id]
      );
      const data = database.rows.map((obj) => ({
        title: obj.title,
        overview: obj.description,
        release_date: obj.release_date.toLocaleDateString("tr-TR").slice(0, 10),
        added_date: obj.added_date.toLocaleDateString("tr-TR").slice(0, 10),
        poster_path: obj.url,
        id: obj.id,
        rate: obj.rating,
        comment: obj.comment,
        likes: obj.likes,
      }));

      res.render("index", { data: data, header: "AMTss" });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching data");
    }
  } else {
    res.render("login-register");
  }
});

// Show only added movies

app.get("/movies", async (req, res) => {
  if (req.isAuthenticated()) {
    const user_id = req.user.id;
    try {
      const database = await db.query(
        `SELECT * FROM AMTsDb WHERE user_id = $1 AND type = 'movie' AND watchlist = 'no'`,
        [user_id]
      );
      const data = database.rows.map((obj) => ({
        title: obj.title,
        overview: obj.description,
        release_date: obj.release_date.toLocaleDateString("tr-TR").slice(0, 10),
        added_date: obj.added_date.toLocaleDateString("tr-TR").slice(0, 10),
        poster_path: obj.url,
        id: obj.id,
        rate: obj.rating,
        comment: obj.comment,
        likes: obj.likes,
      }));

      res.render("index", { data: data, header: "Your movies" });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching data");
    }
  } else {
    res.render("login-register");
  }
});

// Show only added TV shows

app.get("/tv-shows", async (req, res) => {
  if (req.isAuthenticated()) {
    const user_id = req.user.id;
    try {
      const database = await db.query(
        `SELECT * FROM AMTsDb WHERE user_id = $1 AND type = 'tv' AND watchlist = 'no'`,
        [user_id]
      );
      const data = database.rows.map((obj) => ({
        title: obj.title,
        overview: obj.description,
        release_date: obj.release_date.toLocaleDateString("tr-TR").slice(0, 10),
        added_date: obj.added_date.toLocaleDateString("tr-TR").slice(0, 10),
        poster_path: obj.url,
        id: obj.id,
        rate: obj.rating,
        comment: obj.comment,
        likes: obj.likes,
      }));

      res.render("index", { data: data, header: "Your TV Shows" });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching data");
    }
  } else {
    res.render("login-register");
  }
});

// Show other user profiles

app.get("/users", async (req, res) => {
  try {
    const result = await db.query(`SELECT email FROM users`);
    const users = result.rows.map((obj) => ({
      user: obj.email,
    }));

    res.render("users", { users: users });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});

app.get("/watchlist", async (req, res) => {
  const user_id = req.user.id;
  try {
    const database = await db.query(
      `SELECT * FROM AMTsDb WHERE user_id = $1 AND watchlist = 'yes'`,
      [user_id]
    );
    const data = database.rows.map((obj) => ({
      title: obj.title,
      overview: obj.description,
      release_date: obj.release_date.toLocaleDateString("tr-TR").slice(0, 10),
      poster_path: obj.url,
      id: obj.id,
    }));
    res.render("watchlist", { data: data });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});

app.get("/login-register", (req, res) => {
  res.render("login-register");
});

// Login via Google

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "login-register",
  })
);

app.get("/auth/google/login-register", (req, res) => {
  res.redirect("/");
});

// Logout

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

// Handle login input

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "login-register",
  })
);

// Handle register input and login

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    if (checkResult.rows.length > 0) {
      res.send("Email already exists. Try logging in.");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            `INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *`,
            [email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            console.log(err);
            res.redirect("/");
          });
        }
      });
    }
  } catch (err) {
    console.log(err.detail);
  }
});

// Handle searchbar input

app.get("/search", async (req, res) => {
  const searchInput = req.query.search;

  try {
    const response = await axios.get(API_URL + "/search/multi", {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${process.env.API_TOKEN}`,
      },
      params: {
        query: searchInput,
        include_adult: false,
        language: "en-US",
        page: 1,
      },
    });

    const results = response.data.results
      .filter((obj) => obj.media_type === "movie" || obj.media_type === "tv")
      .filter((obj) => obj.poster_path !== null)
      .map((obj) => ({
        title: obj.title || obj.name,
        overview: obj.overview,
        media_type: obj.media_type,
        release_date: obj.release_date || obj.first_air_date,
        poster_path: IMG_URL + obj.poster_path,
        type: obj.media_type,
      }));

    res.render("index", {
      results: results,
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Go to an user database

app.get("/:email", async (req, res) => {
  const { email } = req.params;
  try {
    const result = await db.query(
      `SELECT * FROM AMTsDb WHERE user_id = (SELECT id FROM users WHERE email = $1) AND watchlist = 'no'`,
      [email]
    );
    const data = result.rows.map((obj) => ({
      title: obj.title,
      overview: obj.description,
      release_date: obj.release_date.toLocaleDateString("tr-TR").slice(0, 10),
      added_date: obj.added_date.toLocaleDateString("tr-TR").slice(0, 10),
      poster_path: obj.url,
      id: obj.id,
      rate: obj.rating,
      comment: obj.comment,
      user_id: obj.user_id,
    }));
    res.render("userAMTs", { data: data, user: email });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});

// Add and rate selected AMTs to the database

app.post("/add", async (req, res) => {
  const { title, poster, description, release_date, rate, comment, type } =
    req.body;
  const user_id = req.user.id;
  try {
    await db.query(
      `INSERT INTO AMTsDb (user_id, title, url, description, release_date, rating, comment, type, watchlist) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'no')`,
      [user_id, title, poster, description, release_date, rate, comment, type]
    );
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving data");
  }
});

// Delete selected AMTs from the database

app.post("/delete", async (req, res) => {
  const id = req.body.del;
  try {
    await db.query(`DELETE FROM AMTsDb WHERE id = $1`, [id]);
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }
});

// Update page (AMTss)

app.post("/to-update", async (req, res) => {
  const user_id = req.user.id;
  try {
    const database = await db.query(
      `SELECT * FROM AMTsDb WHERE user_id = $1 AND id = $2`,
      [user_id, req.body.del]
    );
    const data = database.rows[0];
    res.render("update", {
      title: data.title,
      overview: data.description,
      release_date: data.release_date,
      added_date: data.added_date,
      poster_path: data.url,
      id: data.id,
      rate: data.rating,
      comment: data.comment,
      type: data.type,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});

// Update selected AMTs
app.post("/update", async (req, res) => {
  const { id, rate, comment } = req.body;
  const user_id = req.user.id;
  try {
    await db.query(
      `UPDATE AMTsDb SET rating = $1, comment = $2, watchlist = 'no' WHERE user_id = $3 AND id = $4`,
      [rate, comment, user_id, id]
    );
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving data");
  }
});

//Add to watchlist

app.post("/watchlist", async (req, res) => {
  const { title, poster, description, release_date, type } = req.body;
  const user_id = req.user.id;
  try {
    await db.query(
      `INSERT INTO AMTsDb (user_id, title, url, description, release_date, type, watchlist) VALUES ($1, $2, $3, $4, $5, $6, 'yes')`,
      [user_id, title, poster, description, release_date, type]
    );
    res.redirect("/watchlist");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error saving data");
  }
});

// Like any users AMTs

app.post("/like", async (req, res) => {
  const item = req.body["item-id"];
  const user = req.body["user-id"];

  try {
    await db.query(
      `UPDATE AMTsDb SET likes = likes + 1 WHERE id = $1 AND user_id = $2`,
      [item, user]
    );
    res.redirect("back");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});

passport.use(
  "local",
  new Strategy(
    { usernameField: "email", passwordField: "password" },
    async function verify(username, password, cb) {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          username,
        ]);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedPassword = user.password;
          bcrypt.compare(password, storedPassword, (err, valid) => {
            if (err) {
              return cb(err);
            } else {
              if (valid) {
                return cb(null, user);
              } else {
                return cb(null, false);
              }
            }
          });
        } else {
          return cb(null, false, { message: "User not found" });
        }
      } catch (err) {
        console.log(err);
      }
    }
  )
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password, name, picture) VALUES ($1, $2, $3, $4)",
            [profile.email, "google", profile.displayName, profile.picture]
          );
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});

// Puştlar bizim logomuzu koyacaksın uygulamana diyor

// https://www.themoviedb.org/about/logos-attribution
