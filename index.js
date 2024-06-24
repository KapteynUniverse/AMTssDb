import express from "express";
import axios from "axios";
import env from "dotenv";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;
const API_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/original";
env.config();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.get("/", async (req, res) => {
  const database = await db.query(`SELECT * FROM AMTsDb`);
  const data = database.rows.map((obj) => ({
    title: obj.title,
    overview: obj.description,
    release_date: obj.release_date.toLocaleDateString("tr-TR").slice(0, 10),
    added_date: obj.added_date.toLocaleDateString("tr-TR").slice(0, 10),
    poster_path: obj.url,
    id: obj.id,
  }));
  res.render("index", { data: data });
});

// Handling searchbar input

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
      }));
    res.render("index", { results: results });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Add and rate selected AMTs to the database

app.post("/add", async (req, res) => {
  const { title, poster, description, release_date, rate } = req.body;
  try {
    await db.query(
      `INSERT INTO AMTsDb (title, description, url, release_date) VALUES ($1, $2, $3, $4)`,
      [title, description, poster, release_date]
    );
    console.log(req.body);
    res.redirect("/");
  } catch (err) {
    console.log(err);
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

app.listen(port, () => {
  console.log(`API is running at http://localhost:${port}`);
});

// Puştlar bizim logomuzu koyacaksın uygulamana diyor

// https://www.themoviedb.org/about/logos-attribution

// Eklenenler arasından arama yapma. Eklenenlere yıldız verip puanı database e ekleme, login/register fonksiyonu, belki navbar
