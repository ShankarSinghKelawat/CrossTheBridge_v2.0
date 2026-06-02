const User = require("../models/User");

const connectWallet = async (req, res) => {

    try {

        const { wallet } = req.body;

        let user =
            await User.findOne({ wallet });

        if (!user) {

            user = await User.create({
                wallet
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
    connectWallet
};