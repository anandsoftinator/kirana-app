require("dotenv").config();
require("express-async-errors");
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const morgan = require("morgan");
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

const path = require("path");
const cookieParser = require("cookie-parser");
const rateLimiter = require("express-rate-limit");
const cors = require("cors");
const port = process.env.PORT || 5000;
app.use(cors());
app.use(morgan());

const authRouter = require("./routes/authRoutes");
const userRoleRouter = require("./routes/userRoleRouter");
const userRouter = require("./routes/userRoutes");
const shopRouter = require("./routes/shopRoutes");
const postRouter = require("./routes/postRoutes");

// middleware
const notFoundMiddleware = require("./middleware/not-found");
const errorHandlerMiddleware = require("./middleware/error-handler");
const {
  authorizePermissions,
  authenticateUser,
} = require("./middleware/authentication");
const onConnection = require("./socket");

// app.use(
//   rateLimiter({
//     windowMs: 15 * 60 * 1000,
//     max: 60,
//   })
// );

app.use(express.json());
app.use(cookieParser(process.env.JWT_SECRET));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

// routes
app.use(
  "/api/v1/users",
  [authenticateUser, authorizePermissions("admin")],
  userRouter
);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/shop", shopRouter);
app.use("/api/v1/post", postRouter);
app.use(
  "/api/role",
  [authenticateUser, authorizePermissions("admin")],
  userRoleRouter
);

io.on("connection", onConnection(io));

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

//share to public ip address
const host = "0.0.0.0";

server.listen(port, host, () => {
  console.log(`Server is listening on port ${port}...`);
});
