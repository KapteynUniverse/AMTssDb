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
import flash from "connect-flash";
import path from "path"; // delete if not work
import { fileURLToPath } from 'url'; // delete if not work

const app = express();
const port = 3000;
const saltRounds = 10; //hashing
const API_URL = "https://api.themoviedb.org/3"; // API for AMTsDB
const IMG_URL = "https://image.tmdb.org/t/p/original"; // Poster URL
const __filename = fileURLToPath(import.meta.url); // delete if not work
const __dirname = path.dirname(__filename); // delete if not work
env.config();

// Middleware
app.set('views', path.join(__dirname, 'views')); // delete if not work
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
app.use(flash());

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
        `SELECT * FROM AMTsDb WHERE user_id = $1 AND watchlist = 'no' ORDER BY likes DESC`,
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

      res.render("index", { data: data, header: "AMTss", err: null });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching data");
    }
  } else {
    res.render("login-register", { err: null });
  }
});

// Show only added movies

app.get("/movies", async (req, res) => {
  if (req.isAuthenticated()) {
    const user_id = req.user.id;
    try {
      const database = await db.query(
        `SELECT * FROM AMTsDb WHERE user_id = $1 AND type = 'movie' AND watchlist = 'no' ORDER BY likes DESC`,
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

      res.render("index", { data: data, header: "Your movies", err: null });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching data");
    }
  } else {
    res.render("login-register", { err: null });
  }
});

// Show only added TV shows

app.get("/tv-shows", async (req, res) => {
  if (req.isAuthenticated()) {
    const user_id = req.user.id;
    try {
      const database = await db.query(
        `SELECT * FROM AMTsDb WHERE user_id = $1 AND type = 'tv' AND watchlist = 'no' ORDER BY likes DESC`,
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

      res.render("index", { data: data, header: "Your TV Shows", err: null });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error fetching data");
    }
  } else {
    res.render("login-register", { err: null });
  }
});

// Sort by selected action

app.post("/order", async (req, res) => {
  const user_id = req.user.id;
  const { likes, rating, order } = req.body;
  try {
    if (likes === "on") {
      const database = await db.query(
        `SELECT * FROM AMTsDb WHERE user_id = $1 AND watchlist = 'no' ORDER BY likes DESC`,
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
      res.render("index", {
        data: data,
        header: "Ordering by likes",
        err: null,
      });
    } else if (rating === "on") {
      const database = await db.query(
        `SELECT * FROM AMTsDb WHERE user_id = $1 AND watchlist = 'no' ORDER BY rating DESC`,
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
      res.render("index", {
        data: data,
        header: "Ordering by your ratings",
        err: null,
      });
    } else {
      const database = await db.query(
        `SELECT * FROM AMTsDb WHERE user_id = $1 AND watchlist = 'no' ORDER BY title ASC`,
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
      res.render("index", {
        data: data,
        header: "Alphabetical order",
        err: null,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});

// Show other user profiles

app.get("/users", async (req, res) => {
  const user_id = req.user.id;
  try {
    const result = await db.query(
      `SELECT email FROM users WHERE id != $1 ORDER BY email ASC`,
      [user_id]
    );
    const users = result.rows.map((obj) => ({
      user: obj.email,
      userName:
        obj.email.split("@")[0].charAt(0).toUpperCase() +
        obj.email.split("@")[0].slice(1),
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
    res.render("watchlist", { data: data, err: null });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});

app.get("/login-register", (req, res) => {
  res.render("login-register", { err: req.flash("error")[0] });
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
    failureFlash: true,
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
    res.redirect("/login-register");
  });
});

// Handle login input

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "login-register",
    failureFlash: true,
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
      res.render("login-register", {
        err: "Email already exists. Try logging in.",
      });
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
      err: null,
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Go to an user database

app.get("/:email", async (req, res) => {
  const { email } = req.params;
  const userName =
    email.split("@")[0].charAt(0).toUpperCase() + email.split("@")[0].slice(1);
  try {
    const result = await db.query(
      `SELECT * FROM AMTsDb WHERE user_id = (SELECT id FROM users WHERE email = $1) AND watchlist = 'no' ORDER BY rating DESC`,
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
      likes: obj.likes,
    }));
    res.render("userAMTs", { data: data, user: userName });
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
    const database = await db.query(
      `SELECT * FROM AMTsDb WHERE user_id = $1 AND description =$2`,
      [user_id, description]
    );
    const inWatchlist = database.rows[0].watchlist;
    const id = database.rows[0].id;
    if (inWatchlist === "yes") {
      await db.query(
        `UPDATE AMTsDb SET rating = $1, comment = $2, watchlist = 'no' WHERE user_id = $3 AND id = $4`,
        [rate, comment, user_id, id]
      );
      res.redirect("/");
    } else {
      const database = await db.query(
        `SELECT * FROM AMTsDb WHERE user_id = $1 AND watchlist = 'no' ORDER BY likes DESC`,
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
      res.render("index", {
        data: data,
        header: "AMTss",
        err: "You have added this AMTs before.",
      });
      console.error(err);
    }
  }
});

// Delete selected AMTs from the database

app.post("/delete", async (req, res) => {
  const id = req.body.del;
  try {
    await db.query("BEGIN");
    await db.query(`DELETE FROM user_likes WHERE item_id = $1`, [id]);
    await db.query(`DELETE FROM AMTsDb WHERE id = $1`, [id]);
    await db.query("COMMIT");
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
      release_date: data.release_date.toLocaleDateString("tr-TR").slice(0, 10),
      poster_path: data.url,
      id: data.id,
      comment: data.comment,
      err: null,
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
    res.render("watchlist", {
      data: data,
      err: "You have already added this AMTs to your watchlist.",
    });
    console.error(err);
  }
});

// Like any users AMTs

app.post("/like", async (req, res) => {
  const itemId = req.body["item-id"];
  const likerUserId = req.user.id;

  try {
    const checkLiked = await db.query(
      `SELECT id FROM user_likes WHERE liker_id = $1 AND item_id = $2`,
      [likerUserId, itemId]
    );
    if (checkLiked.rows.length > 0) {
      return res.status(400).render("index", {
        err: "You have already liked this AMTs.",
      });
    }
    await db.query(`UPDATE AMTsDb SET likes = likes + 1 WHERE id = $1`, [
      itemId,
    ]);
    await db.query(
      `INSERT INTO user_likes (liker_id, item_id) VALUES ($1, $2)`,
      [likerUserId, itemId]
    );
    res.redirect("back");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error processing like operation");
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
                return cb(null, false, {
                  message: "Incorrect password.",
                });
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
      callbackURL: "https://amtssdb.onrender.com/auth/google/callback",
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

export default app;  // delete if not work
