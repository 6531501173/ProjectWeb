const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();
var mysql = require('mysql2');
const fs = require("fs");
const multer = require("multer");
const session = require("express-session");
const upload = multer({ dest: "uploads/" });
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "library"
});

app.use(session({
  cookie: { maxAge: 24 * 60 * 60 * 1000 },
  secret: "mysecretcode",
  resave: false,
  saveUninitialized: true
}));

app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));





app.get("/logout", function (req, res) {
  // Clear session variable
  req.session.destroy(function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Cannot clear session");
    } else {
      res.redirect("/Home");
    }
  });
});





// --LOGIN PAGE----

// -----varchar to hash------
// app.get("/password/:pass", function (req, res) {
//     const password = req.params.pass;
//     const saltRounds = 10;

//     bcrypt.hash(password, saltRounds, function (err, hash) {
//         if (err) {
//             return res.status(500).send("Hashing error");
//         }
//         res.send(hash);
//     });
// });


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
        req.session.userID = results[0].user_id;
        req.session.username = username;
        req.session.role = results[0].role; // Set the user's role in the session
        const redirectTo = "/assetlist";
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

//  ------Assetlist-------
app.get("/assetlist", function (req, res) {
  // Check if the user is logged in
  if (!req.session.userID) {
    return res.status(200).redirect("/Home");
  }
  let sql;
  // Fetch user role from the session
  let filePath;
  const userRole = req.session.role;
  switch (userRole) {
    case "admin":
      filePath = path.join(__dirname, "views", "staff", "Assetlist.html");
      break;
    case "lender":
      filePath = path.join(__dirname, "views", "lender", "Assetlist.html");
      break;
    case "borrower":
      filePath = path.join(__dirname, "views", "borrower", "Assetlist.html");
      break;
    default:
      return res.status(404).send("Page not found");
  }
  res.sendFile(filePath);
});

app.get("/getbooklist", function (req, res) {
  const userRole = req.session.role;
  if (userRole == 'admin' || userRole == 'lender') {
    sql = "SELECT assetlist.*, user_info.name AS lender_name FROM assetlist INNER JOIN user_info ON assetlist.lender_id = user_info.user_id";
  } else {
    sql = "SELECT * FROM assetlist WHERE status = 'available'";
  }
  con.query(sql, function (err, results) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database server error");
    }
    res.json(results);
  });
});

// ------EDIT ASSETLIST(ADMIN)------
app.get("/assetlist/edit/bookid=:bookid", function (req, res) {
  if (!req.session.userID) {
    return res.status(200).redirect("/Home");
  }
  res.sendFile(path.join(__dirname, "/views/staff/Edit.html"));
});

app.get("/create", function (req, res) {
  if (!req.session.userID) {
    return res.status(200).redirect("/Home");
  }
  res.sendFile(path.join(__dirname, "/views/staff/Create.html"));
});

// Route to handle asset creation
app.post('/add_asset', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    const { title, author, status } = req.body;
    // Check if file exists
    if (!file) {
      return res.status(400).send("No file uploaded");
    }

    // If file exists, proceed with file upload
    const tempPath = file.path;
    const targetPath = path.join(__dirname, "/public/img/bookimg", file.originalname);
    fs.rename(tempPath, targetPath, function (err) {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(500).send("Error uploading file");
      }

      // Update database with title, author, status, and file name
      const sql = 'INSERT INTO assetlist (title, author, status, image) VALUES (?, ?, ?, ?)';
      con.query(sql, [title, author, status, file.originalname], function (err, result) {
        if (err) {
          console.error('Error updating database:', err);
          return res.status(500).send("Error updating database");
        }
        console.log('Asset added successfully');
        res.status(200).send("Asset added successfully");
      });
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send("Internal server error");
  }
});

app.post("/upload", upload.single("file"), function (req, res) {
  try {
    const file = req.file;
    const { title, author, status, bookId } = req.body; // Retrieve the book ID from the request body

    // Check if file exists
    if (!file && !title && !author && !status) {
      return res.status(400).send("No file uploaded and no data to update.");
    }

    // If file exists, proceed with file upload
    if (file) {
      const tempPath = file.path;
      const targetPath = path.join(__dirname, "/public/img/bookimg", file.originalname);
      fs.rename(tempPath, targetPath, function (err) {
        if (err) {
          console.error(err);
          return res.status(500).send("Error uploading file");
        }
        // Update database with title, author, status, and file name
        const sql = "UPDATE assetlist SET title=?, author=?, status=?, image=? WHERE book_id=?";

        con.query(sql, [title, author, status, file.originalname, bookId], function (err, result) {
          if (err) {
            console.error(err);
            res.status(500).send("Error updating database");
          } else {
            res.status(200).send("UPDATED DATA");
          }
        });
      });
    } else {
      // Update database with title, author, and status only
      const sql = "UPDATE assetlist SET title=?, author=?, status=? WHERE book_id=?";

      con.query(sql, [title, author, status, bookId], function (err, result) {
        if (err) {
          console.error(err);
          res.status(500).send("Error updating database");
        } else {
          res.status(200).send("UPDATED DATA");
        }
      });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send("Internal server error");
  }
});




// ------Borrow request-----

//  findbook use to get bookID from url params use to find book by using bookID
app.get("/findbook", function (req, res) {
  const bookId = req.query.bookid; // Retrieve the bookid from the query parameters
  const sql = "SELECT * FROM assetlist WHERE book_id = ?";
  con.query(sql, [bookId], function (err, results) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database server error");
    }
    if (results.length !== 1) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json(results[0]); // Return the book information
  });
});

app.get("/requestborrow/bookid=:bookId", function (req, res) {
  if (!req.session.userID) {
    return res.status(200).redirect("/Home");
  }
  res.sendFile(path.join(__dirname, "/views/borrower/Requestborrow.html"));
});

app.post("/sendData", function (req, res) {
  const bookId = req.body.bookId;
  const userId = req.session.userID;
  let sql = `SELECT request_status FROM request WHERE borrower_id=? AND (request_status ="approved" OR request_status ="pending")`;
  con.query(sql, [userId], function (err, result) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
    if (result.length > 0) {
      return res.status(400).json({ message: 'You cannot borrow another book until your current request is approved or returned.' });
    } else {
      res.status(200).json({ redirectTo: `/requestborrow/bookid=${bookId}`, bookId: bookId });
    }
  });
});

app.get("/getDate", function (req, res) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Format today's date
  const formattedToday = formatDate(today);
  // Format tomorrow's date
  const formattedTomorrow = formatDate(tomorrow);
  // Create an object containing both dates
  const dateInfo = {
    today: formattedToday,
    tomorrow: formattedTomorrow
  };
  // Send the object as JSON response
  res.json(dateInfo);
});

function formatDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// ------Request Status-----
app.get("/requestStatus", function (req, res) {
  if (!req.session.userID) {
    return res.status(200).redirect("/Home");
  }
  const userRole = req.session.role;
  if (userRole == "lender") {
    return res.sendFile(path.join(__dirname, "/views/lender/Requeststatus.html"));
  }
  if (userRole == "borrower") {
    return res.sendFile(path.join(__dirname, "/views/borrower/Requeststatus.html"));
  }
  if (userRole == "admin") {
    return res.sendFile(path.join(__dirname, "/views/staff/Requeststatus.html"));
  }
});

app.get("/getAcc", function (req, res) {
  const userId = req.session.userID;
  let sql = `SELECT username,name,email from user_info WHERE user_id=?`;
  con.query(sql, [userId], function (err, result) {
    if (err) {
      console.error(err);
      return
    }
    res.json(result);
  });
});

app.get("/getStatus", function (req, res) {
  const userId = req.session.userID;
  const userRole = req.session.role;
  let sql;

  if (userRole == "admin") {
    sql = `
    SELECT r.*, a.image, 
           u1.name AS borrower_name,
           u2.name AS lender_name
    FROM request r 
    JOIN assetlist a ON r.book_id = a.book_id 
    LEFT JOIN user_info u1 ON r.borrower_id = u1.user_id 
    LEFT JOIN user_info u2 ON a.lender_id = u2.user_id`;

  } else {
    sql = `SELECT r.*, a.image, 
    CASE 
      WHEN ? = 'borrower' THEN u2.name 
      ELSE u.name 
    END AS borrower_name,
    CASE 
      WHEN ? = 'lender' THEN u2.name 
      ELSE u.name 
    END AS lender_name
FROM request r 
JOIN assetlist a ON r.book_id = a.book_id 
LEFT JOIN user_info u ON a.lender_id = u.user_id 
LEFT JOIN user_info u2 ON r.borrower_id = u2.user_id 
WHERE (r.borrower_id = ? AND ? = 'borrower') OR (a.lender_id = ? AND ? = 'lender');
`;
  }

  con.query(sql, [userRole, userRole, userId, userRole, userId, userRole], function (err, results) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database server error");
    }
    res.json(results);
  });
});

app.put("/changeRequestStatus", function (req, res) {
  const requestId = req.query.requestId;
  const action = req.query.action; // Action can be 'cancel', 'approve', or 'disapprove'
  let sqlUpdateRequest, sqlUpdateAsset;
  switch (action) {
    case 'cancel':
      sqlUpdateRequest = "UPDATE request SET request_status = 'cancelled' WHERE request_id = ?";
      sqlUpdateAsset = "UPDATE assetlist SET status = 'available' WHERE book_id = (SELECT book_id FROM request WHERE request_id = ?)";
      break;
    case 'approved':
      sqlUpdateRequest = "UPDATE request SET request_status = 'approved' WHERE request_id = ?";
      sqlUpdateAsset = "UPDATE assetlist SET status = 'borrowed' WHERE book_id = (SELECT book_id FROM request WHERE request_id = ?)";
      break;
    case 'disapprove':
      sqlUpdateRequest = "UPDATE request SET request_status = 'disapproved' WHERE request_id = ?";
      sqlUpdateAsset = "UPDATE assetlist SET status = 'available' WHERE book_id = (SELECT book_id FROM request WHERE request_id = ?)";
      break;
    case 'return':
      sqlUpdateRequest = "UPDATE request SET request_status = 'returned' WHERE request_id = ?";
      sqlUpdateAsset = "UPDATE assetlist SET status = 'available' WHERE book_id = (SELECT book_id FROM request WHERE request_id = ?)";
      break;
    default:
      return res.status(400).send("Invalid action");
  }

  con.beginTransaction(function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database server error");
    }

    // Update request status
    con.query(sqlUpdateRequest, [requestId], function (err, result) {
      if (err) {
        con.rollback(function () {
          console.error(err);
          return res.status(500).send("Database server error");
        });
      }
      if (result.affectedRows === 0) {
        con.rollback(function () {
          return res.status(404).send("Request not found");
        });
      }

      // If action is cancel, approve, or disapprove, update asset status if required
      if (sqlUpdateAsset) {
        con.query(sqlUpdateAsset, [requestId], function (err, result) {
          if (err) {
            con.rollback(function () {
              console.error(err);
              return res.status(500).send("Database server error");
            });
          }

          con.commit(function (err) {
            if (err) {
              con.rollback(function () {
                console.error(err);
                return res.status(500).send("Database server error");
              });
            }
            return res.status(200).send(action === 'cancel' ? "Request cancelled successfully" : "Request approved successfully");
          });
        });
      } else { // If action is disapprove, directly commit the transaction
        con.commit(function (err) {
          if (err) {
            con.rollback(function () {
              console.error(err);
              return res.status(500).send("Database server error");
            });
          }
          return res.status(200).send("Request disapproved successfully");
        });
      }
    });
  });
});



app.post("/requestStatus", function (req, res) {
  const bookId = req.body.bookid; // Retrieve bookId from the request body
  const sql = "SELECT * FROM assetlist WHERE book_id = ?";
  const borrower_id = req.session.userID;
  const borrow_date = req.body.borrowerDate;
  const return_date = req.body.returnDate;
  con.query(sql, [bookId], function (err, results) {
    if (err) {
      console.error(err);
      return res.status(500).send("Database server error");
    }
    if (results.length !== 1) {
      return res.status(404).json({ error: "Book not found" });
    }
    const sql_ins = "INSERT INTO request (book_id, lender_id, borrower_id, borrow_date, return_date, title) VALUES (?, ?, ?, ?, ?, ?)";
    const params = [results[0].book_id, results[0].lender_id, borrower_id, borrow_date, return_date, results[0].title];
    con.query(sql_ins, params, function (err, req) {
      if (err) {
        console.error(err);
        return res.status(500).send("Database server error");
      }
      res.status(200).send("INSERT COMPLETED!!!");
    });
  });
});

// ----History----
app.get("/history", function (req, res) {
  if (!req.session.userID) {
    return res.status(200).redirect("/Home");
  }
  const userRole = req.session.role;
  if (userRole == "borrower") {
    return res.sendFile(path.join(__dirname, "views", "borrower", "History.html"));
  }
  if (userRole == "lender") {
    return res.sendFile(path.join(__dirname, "views", "Lender", "History.html"));
  }
  if (userRole == "admin") {
    return res.sendFile(path.join(__dirname, "views", "staff", "History.html"));
  }
});

//------Dashboard-----------
app.get("/dashboard", function (req, res) {
  let userRole = req.session.role;
  if (!req.session.userID) {
    return res.status(200).redirect("/Home");
  }
  else if (userRole == "admin") {
    res.sendFile(path.join(__dirname, "views", "staff", "Dashboard.html"));
  } else if (userRole == "lender") {
    res.sendFile(path.join(__dirname, "views", "lender", "Dashboard.html"));
  }
});

// -------Return assetlist-----
app.get("/returnasset", function (req, res) {
  let userRole = req.session.role;
  if (!req.session.userID) {
    return res.status(200).redirect("/Home");
  }
  res.sendFile(path.join(__dirname, "views", "staff", "Returnasset.html"));
});


// ------Root-----------
app.get("/Home", function (req, res) {
  if (req.session.username) {
    res.redirect("/Assetlist");
  } else {
    res.sendFile(path.join(__dirname, "views", "index", "Home.html"));
  }
});


const port = 3000;
app.listen(port, function () {
  console.log("Server is ready at " + port);
});
