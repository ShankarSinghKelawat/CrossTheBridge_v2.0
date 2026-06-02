const express = require("express");

const router = express.Router();

const {
    connectWallet
} = require("../controllers/userController");

router.post("/connect", connectWallet);

module.exports = router;