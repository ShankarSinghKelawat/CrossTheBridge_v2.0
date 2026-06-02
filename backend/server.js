require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/users",
    require("./routes/userRoutes")
);

app.use("/api/game",
    require("./routes/gameRoutes")
);

app.use(
    "/api/rewards",
    require("./routes/rewardRoutes")
);

app.get("/", (req, res) => {
    res.send("API Running");
});

const PORT =
    process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `Server running on ${PORT}`
    );
});
