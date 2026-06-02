const express = require("express");

const router = express.Router();

const {
    redeemTokens
} = require(
    "../controllers/rewardController"
);

router.post(
    "/redeem",
    redeemTokens
);

module.exports = router;