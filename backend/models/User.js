const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    wallet: {
        type: String,
        required: true,
        unique: true
    },

    points: {
        type: Number,
        default: 0
    },

    wins: {
        type: Number,
        default: 0
    },

    redeemedTokens: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

module.exports =
    mongoose.model("User", userSchema);