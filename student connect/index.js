import express from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";

const app = express();
const port = 8000;
const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "studentconnect",
  password: "123",
  port: 5432,
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, 'public')));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));
db.connect();

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/signin", (req, res) => {
  res.render("signin.ejs");
});

app.get("/signup", (req, res) => {
  res.render("signup.ejs");
});

app.post("/signup", async (req, res) => {
  const user = req.body["name"];
  const email = req.body["email"];
  const pass = req.body["password"];
  console.log(user);
  console.log(email);
  console.log(pass);
  await db.query("INSERT INTO login(name, email, sem, password) VALUES ($1, $2, $3, $4)", [user, email, req.body["sem"], pass]);
  res.redirect("/signin");
});

app.get("/home", (req, res) => {
  if (req.session.userId) {
    res.render("home.ejs");
  } else {
    res.redirect("/signin");
  }
});

app.post("/signin", async (req, res) => {
    const email = req.body["email"];
    const pass = req.body["password"];
    const result = await db.query("SELECT * FROM login WHERE email = $1", [email]);
    const data = result.rows[0];
    if (data && pass === data.password) {
      req.session.userId = data.id;
      req.session.userName = data.name;
      req.session.userSem = data.sem;
      res.redirect("/home");
    } else {
      res.send("INCORRECT PASSWORD");
    }
  });
  

app.get("/syllabus", async (req, res) => {
  const data = await db.query("SELECT * FROM semesters ORDER BY id ASC ");
  console.log(data.rows);
  res.render("syllabus.ejs", {
    data: data.rows
  });
});

app.get("/white", (req, res) => {
  res.render("board.ejs");
});

app.get("/clarifydoubts", (req, res) => {
  res.render("clarify.ejs");
});

app.post("/clarifydoubts", async (req, res) => {
    if (req.session.userId) {
        const userId = req.session.userId;
        const result = await db.query("SELECT * FROM login WHERE id = $1", [userId]);
        await db.query("INSERT INTO link(linkname,user_id) VALUES($1,$2)", [req.body["link"],userId]);
        res.redirect("/clarifydoubts");
    } else {
        res.redirect("/signin");
    }
});

app.get("/doubt", async (req, res) => {
  const result = await db.query("SELECT * FROM questions");
  console.log(result.rows);
  res.render("question.ejs", {
    data: result.rows
  });
});

app.get("/askdoubts", async (req, res) => {
    if (req.session.userId) {
        const userId = req.session.userId;
        const result = await db.query("SELECT * FROM login WHERE id = $1", [userId]);
        const data = result.rows[0];
        const result1=await db.query("SELECT * FROM link INNER JOIN login ON link.user_id = login.id");
        const data1=result1.rows;
        const meetingres=await db.query("select * from meetingcompleted")
        res.render("askdoubt.ejs",{
            data:data1,
            data1:meetingres.rows,
            id:userId
        });
      } else {
        res.redirect("/signin");
      }
    
});

app.post("/completed",async(req,res)=>{
    console.log(req.body["buttonName"]);
    const result1=await db.query("SELECT * FROM link INNER JOIN login ON link.user_id = login.id where linkid=$1",[req.body["buttonName"]]);
    const data=result1.rows[0];
    await db.query("insert into meetingcompleted(linkname) values($1)",[data.name]);
    await db.query("delete from link where linkid=$1",[req.body["buttonName"]])
    res.redirect("/askdoubts")
})

for (let i = 1; i <= 8; i++) {
  (function (index) {
    app.get(`/${index}`, async (req, res) => {
      const data = await db.query(`SELECT * FROM sem${index}`);
      console.log(data.rows);
      res.render("subject.ejs", {
        data: data.rows
      });
    });
  })(i);
}

app.post("/askdoubt", async (req, res) => {
    if (req.session.userId) {
      const userId = req.session.userId;
      const result = await db.query("SELECT * FROM login WHERE id = $1", [userId]);
      const data = result.rows[0];
      if (data) {
        await db.query("INSERT INTO questions(question, sem, name, description) VALUES ($1, $2, $3, $4)", 
          [req.body["title"], data.sem, data.name, req.body["body"]]);
        res.redirect("/doubt");
      } else {
        res.status(404).send("User not found");
      }
    } else {
      res.redirect("/signin");
    }
  });
  

app.get("/askdoubt", (req, res) => {
  res.render("askq.ejs");
});

app.get("/myquestion", async (req, res) => {
  const userId = req.session.userId;
      const result = await db.query("SELECT * FROM login WHERE id = $1", [userId]);
  const data = result.rows[0];
  const result1 = await db.query("SELECT * FROM questions WHERE name=$1", [data.name]);
  res.render("question.ejs", {
    data: result1.rows
  });
});

app.get("/meetings", async (req, res) => {
    try {
      const result = await db.query("SELECT * FROM link");
      res.render("meetings.ejs", {
        links: result.rows
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
});
  

const result = await db.query("SELECT * FROM questions");
const n = result.rowCount;
console.log(n);

for (let i = 1; i <= n; i++) {
  (function (index) {
    
    app.post(`/question/${index}`, async (req, res) => {
    if (req.session.userId) {
      const userId = req.session.userId;
      const result = await db.query("SELECT * FROM login WHERE id = $1", [userId]);
      const data = result.rows[0];
      const result1 = await db.query(`SELECT * FROM questions WHERE id=${index}`);
      const data1 = result1.rows[0];
      req.body["ans"];
      await db.query(`INSERT INTO question${index}(answer, name, sem) VALUES($1, $2, $3)`, [req.body["ans"], data.name, data.sem]);
      console.log(req.body["ans"]);
      res.redirect(`/question/${index}`);
    } else {
      res.redirect("/signin");
    }
        
    });
  })(i);
}

for (let i = 1; i <= 100; i++) {
  (function (index) {
    app.get(`/question/${index}`, async (req, res) => {
        if (req.session.userId) {
            const userId = req.session.userId;
            const result = await db.query("SELECT * FROM login WHERE id = $1", [userId]);
            const data = result.rows[0];
            await db.query(`CREATE TABLE IF NOT EXISTS question${index}(id SERIAL PRIMARY KEY, answer VARCHAR(1000000), name VARCHAR(40), sem INT)`);
      
      const result1 = await db.query(`SELECT * FROM questions WHERE id=${index}`);
     
      const data1 = result1.rows[0];
      console.log(data.sem);
      console.log(data1.sem);
      const result2 = await db.query(`SELECT * FROM question${index}`);
      if (data.sem > data1.sem) {
        if (result2.rowCount > 0) {
          res.render("answers.ejs", {
            data: data1,
            n: result2.rowCount,
            data1: result2.rows
          });
        } else {
          res.render("answers.ejs", {
            data: data1,
            n: result2.rowCount
          });
        }
      } else {
        res.render("view.ejs", {
          data: data1,
          n: result2.rowCount,
          data1: result2.rows
        });
      }
          } else {
            res.redirect("/signin");
          }
      
    });
  })(i);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
