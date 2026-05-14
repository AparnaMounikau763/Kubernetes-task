const express = require("express");
const mongoose = require("mongoose");
const client = require("prom-client");

const app = express();

app.use(express.json());

/* ---------------- PROMETHEUS METRICS ---------------- */

// Collect default metrics
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

// Custom HTTP request counter
const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

// Middleware to count requests
app.use((req, res, next) => {
  res.on("finish", () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status: res.statusCode,
    });
  });

  next();
});

/* ---------------- MONGODB CONNECTION ---------------- */

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

/* ---------------- TASK MODEL ---------------- */

const Task = mongoose.model("Task", {
  title: String,
  completed: Boolean,
});

/* ---------------- ROUTES ---------------- */

app.get("/", (req, res) => {
  res.send("Task Manager API Running");
});

app.get("/tasks", async (req, res) => {
  const tasks = await Task.find();
  res.json(tasks);
});

app.post("/tasks", async (req, res) => {
  const task = new Task(req.body);
  await task.save();
  res.json(task);
});

app.delete("/tasks/:id", async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.send("Deleted");
});

/* ---------------- METRICS ENDPOINT ---------------- */

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

/* ---------------- SERVER ---------------- */

app.listen(3000, () => {
  console.log("Server running on port 3000");
});