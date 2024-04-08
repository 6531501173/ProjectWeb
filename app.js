const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();
var mysql = require('mysql2');


var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "library"
});

app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----varchar to hash------
app.get("/password/:pass", function (req, res) {
    const password = req.params.pass;
    const saltRounds = 10;

    bcrypt.hash(password, saltRounds, function (err, hash) {
        if (err) {
            return res.status(500).send("Hashing error");
        }
        res.send(hash);
    });
});

// --LOGIN PAGE----
app.get("/login", function (req, res) {
    res.sendFile(path.join(__dirname, "views/index/login.html"));
});
app.post("/login", (req, res) => {
    const { username, password } = req.body;
  
    const sql = "SELECT user_id, password, role FROM user_info WHERE username = ?";
    con.query(sql, [username], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Database server error");
      }
      if (results.length !== 1) {
        return res.status(401).send("Wrong username");
      }
      bcrypt.compare(password, results[0].password, (err, same) => {
        if (err) {
          return res.status(500).send("Authentication server error");
        }
        if (same) {
          // Redirect based on user's       role ไปตามหน้าของแต่ละrole
          let redirectTo;
          switch (results[0].role) {
            case "admin":
              redirectTo = "/staff/dashboard";
              break;
            case "lender":
              redirectTo = "/lender/booklist";
              break;
            case "borrower":
              redirectTo = "/borrower/booklist";
              break;
            default:
              redirectTo = "/";
              break;
          }
          return res.status(200).json({ redirectTo });
        } else {
          return res.status(401).send("Wrong password");
        }
      });
    });
  });



// ------REGISTER PAGE------

app.get("/register", function (req, res) {
    res.sendFile(path.join(__dirname, "views/index/register.html"));
});

app.post("/register", function (req, res) {
    const name = req.body.name;
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    bcrypt.hash(password, 10, function (err, hash) {
        if (err) {
            return res.status(500).send("Hashing error");
        }
        var sql = `INSERT INTO user_info (name, username, email, password) VALUES (?, ?, ?, ?)`; // mysql ใส่ตารางทั้งหมดของดาต้า user
        con.query(sql, [name, username, email, hash], function (err, result) {// ส่งคำสั่งไปใน mysql ดาต้าของเรา
            if (err) {
                console.error(err);
                return res.status(500).send("Database server error");
            }
            // If registration is successful, send a success response
            return res.status(200).send("Registration successful");
        });
    });
});


// -------STAFF----------
app.get("/staff/dashboard", function (req, res) {
    res.sendFile(path.join(__dirname, "views/staff/Dashboard.html"));
});
app.get("/staff/booklist", function (req, res) {
    res.sendFile(path.join(__dirname, "views/staff/Assetlist.html"));
});
app.get("/staff/create", function (req, res) {
    res.sendFile(path.join(__dirname, "views/staff/Create.html"));
});
app.get("/staff/edit", function (req, res) {
    res.sendFile(path.join(__dirname, "views/staff/Edit.html"));
});
app.get("/staff/history", function (req, res) {
    res.sendFile(path.join(__dirname, "views/staff/History.html"));
});
app.get("/staff/returnasset", function (req, res) {
    res.sendFile(path.join(__dirname, "views/staff/Returnasset.html"));
});

// ------Lender----------
app.get("/lender/booklist", function (req, res) {
    res.sendFile(path.join(__dirname, "views/Lender/Assetlist.html"));
});

// ------Borrower--------
app.get("/borrower/booklist", function (req, res) {
    res.sendFile(path.join(__dirname, "views/borrower/Assetlist.html"));
});
// ------Root-----------
app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "views/index/Home.html"));
});

const port = 3000;
app.listen(port, function () {
    console.log("Server is ready at " + port);
});
