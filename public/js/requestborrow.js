// Get current date
var currentDate = new Date();

// Set max attribute to current date
document.getElementById("Date").setAttribute("max", currentDate.toISOString().split("T")[0]);

// Calculate and set min attribute to one day before current date
var oneDayBefore = new Date(currentDate);
oneDayBefore.setDate(currentDate.getDate() - 1);
document.getElementById("Date").setAttribute("min", oneDayBefore.toISOString().split("T")[0]);
