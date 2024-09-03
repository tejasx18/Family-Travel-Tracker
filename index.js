import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import env from "dotenv";
env.config();

const app = express();
const port = 3000;

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

async function getUsers(){
  const result = await db.query("SELECT * FROM users;");
  return result.rows;
}
async function getColor(id){
  const result = await db.query("SELECT color FROM users where id =$1",[id]);
  return result.rows[0].color;
}

async function checkVisisted(user) {
  const result = await db.query("SELECT country_code FROM visited_countries where user_code = $1",[user]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

async function addUser(name,color){
  const result = await db.query("INSERT INTO users (name,color) VALUES ($1,$2) RETURNING id",
    [name,color]
  );
  return result.rows[0].id;
}

app.get("/", async (req, res) => {
  const users = await getUsers();
  const color = await getColor(currentUserId);
  const countries = await checkVisisted(currentUserId);
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body["country"];

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code,user_code) VALUES ($1,$2)",
        [countryCode,currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  if(req.body.add === "new"){
    res.render("new.ejs");
  }
  else{
  currentUserId = req.body.user;
  res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  currentUserId = await addUser(req.body.name,req.body.color);
  res.redirect("/");
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
