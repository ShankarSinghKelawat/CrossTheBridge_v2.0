const { ethers } = require("ethers");

const User = require("../models/User");

const {
    tokenContract
} = require("../config/blockchain");

const redeemTokens = async (req, res) => {

    try {

        const { wallet } = req.body;

        // VALIDATE WALLET
        if (!wallet) {

            return res.status(400).json({
                success: false,
                message: "Wallet address required"
            });

        }

        // FIND USER
        const user =
            await User.findOne({ wallet });

        if (!user) {

            return res.status(404).json({
                success: false,
                message: "User not found"
            });

        }

        // CHECK POINTS
        if (user.points < 1000) {

            return res.status(400).json({
                success: false,
                message:
                    "You need 1000 points to redeem"
            });

        }

        // CONVERT 10 TOKENS TO 18 DECIMALS
        const tokenAmount =
            ethers.parseUnits("10", 18);

        console.log(
            "Sending Tokens..."
        );

        // SEND TOKENS
        const tx =
            await tokenContract.transfer(
                wallet,
                tokenAmount
            );

        console.log(
            "Transaction Submitted:",
            tx.hash
        );

        // WAIT FOR CONFIRMATION
        await tx.wait();

        console.log(
            "Transaction Confirmed"
        );

        // UPDATE DATABASE
        user.points -= 1000;

        user.redeemedTokens += 10;

        await user.save();

        // SUCCESS RESPONSE
        return res.json({

            success: true,

            message:
                "10 PTS redeemed successfully",

            txHash: tx.hash,

            points: user.points,

            redeemedTokens:
                user.redeemedTokens

        });

    } catch (error) {

        console.log(
            "Redeem Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                error.reason ||
                error.message ||
                "Redeem failed"

        });

    }

};

module.exports = {
    redeemTokens
};