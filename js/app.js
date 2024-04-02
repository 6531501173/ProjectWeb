const express = require("express");
const app = express();
const path = require("path");
const con = require("./config/db.js");
const bcrypt = require("bcrypt");


app.use("/public", express.static(path.join(__dirname, "public")));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    // console.log(username, password);

    const sql = "SELECT id, password, role FROM user WHERE username = ?";
    con.query(sql, [username], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Server error");
        }
        else{
            if(results.length)
        }
        bcrypt.compare(password, results[0].password, function (err, same) {
            if (err) {
                res.status(500).send("Authentication server error");
            }
            else if (same == true) {
                res.send("Same");
            }
            else {
                res.status(401).send("Wrong password");
            }
        });
    });
});

const port = 3000;
app.listen(port, function () {
    console.log("Server is ready at " + port);
});