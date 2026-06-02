const User = require("../models/User");

const addWin = async (req, res) => {

    try {

        const { wallet } = req.body;

        const user =
            await User.findOne({ wallet });

        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }

        user.points += 100;

        user.wins += 1;

        await user.save();

        res.json(user);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

};

const getProfile = async (req, res) => {

    try {

        const { wallet } = req.params;

        const user =
            await User.findOne({ wallet });

        if (!user) {

            return res.status(404).json({
                message: "User not found"
            });

        }

        res.json(user);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: "Server Error"
        });

    }

};

module.exports = {
    addWin,
    getProfile
};