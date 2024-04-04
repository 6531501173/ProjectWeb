const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();
var mysql = require('mysql2');


var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "bookshop"
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
app.post("/login", function (req, res) {
    const username = req.body.username;
    const raw = req.body.password;

    const sql = "SELECT id, password, role FROM user WHERE username = ?";
    con.query(sql, [username], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.length !== 1) {
            return res.status(401).send("Wrong username");
        }
        bcrypt.compare(raw, results[0].password, function (err, same) {
            if (err) {
                return res.status(500).send("Authentication server error");
            }
            if (same) {
                if (results[0].role === 1) {
                    // If the user is an admin, send a JSON response with redirect URL
                    return res.status(200).json({ redirectTo: "/staff/dashboard" });
                } else {
                    // Handle other roles or scenarios if needed
                }
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
        var sql = `INSERT INTO user (name, username, email, password) VALUES (?, ?, ?, ?)`;
        con.query(sql, [name, username, email, hash], function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).send("Database error");
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
app.get("/staff/assetlist", function (req, res) {
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




// ------Root-----------
app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "views/index/Home.html"));
});

const port = 3000;
app.listen(port, function () {
    console.log("Server is ready at " + port);
});
