const crypto = require("crypto");
const express = require("express");

const router = express.Router();

const User = require("../models/User");

const rows = 4;
const cols = 2;

const games = new Map();

async function findUserByWallet(wallet){

    if(!wallet) return null;

    return User.findOne({
        wallet
    });

}

function createSafeTiles(){

    return Array.from(
        { length: rows },
        () => crypto.randomInt(cols)
    );

}

function getGameOrFail(gameId, res){

    const game = games.get(gameId);

    if(!game){

        res.status(404).json({
            message: "Game session not found"
        });

        return null;

    }

    return game;

}

// START GAME
router.post("/start", (req, res) => {

    const { wallet } = req.body;

    if(!wallet){

        return res.status(400).json({
            message: "Wallet required"
        });

    }

    const gameId = crypto.randomUUID();

    games.set(gameId, {

        wallet,

        safeTiles: createSafeTiles(),

        currentStep: -1,

        pebbles: 2,

        gameOver: false,

        createdAt: Date.now()

    });

    res.json({

        gameId,

        rows,

        cols

    });

});

// PLAYER PROFILE
router.get("/profile/:wallet", async (req, res) => {

    try{

        const user =
            await findUserByWallet(req.params.wallet);

        if(!user){

            return res.status(404).json({
                message: "User not found"
            });

        }

        return res.json(user);

    }catch(error){

        console.log(error);

        return res.status(500).json({
            message: "Server Error"
        });

    }

});

// PLAYER ACTION
router.post("/choose", async (req, res) => {

    try{

        const {
            gameId,
            wallet,
            row,
            col,
            action
        } = req.body;

        const game =
            getGameOrFail(gameId, res);

        if(!game) return;

        if(
            !wallet ||
            wallet.toLowerCase() !== game.wallet.toLowerCase()
        ){

            return res.status(401).json({
                message:
                    "Wallet no longer matches this game session"
            });

        }

        if(game.gameOver){

            return res.status(409).json({
                message:
                    "Game session already ended"
            });

        }

        const expectedRow =
            game.currentStep + 1;

        if(
            row !== expectedRow ||
            col < 0 ||
            col >= cols
        ){

            return res.status(400).json({
                message:
                    "Invalid tile choice"
            });

        }

        const safe =
            col === game.safeTiles[row];

        // PEBBLE ACTION
        if(action === "pebble"){

            if(game.pebbles <= 0){

                return res.status(409).json({
                    message:
                        "No pebbles remaining"
                });

            }

            if(!safe){

                game.pebbles -= 1;

            }

            return res.json({

                safe,

                pebbles: game.pebbles

            });

        }

        // INVALID ACTION
        if(action !== "jump"){

            return res.status(400).json({
                message:
                    "Invalid action"
            });

        }

        // PLAYER LOST
        if(!safe){

            game.gameOver = true;

            return res.json({

                safe,

                gameOver: true,

                revealedSafeTiles:
                    game.safeTiles.slice(row)

            });

        }

        // PLAYER SAFE
        game.currentStep = row;

        const won =
            game.currentStep === rows - 1;

        let updatedUser = null;

        // PLAYER WON
        if(won){

            game.gameOver = true;

            try{

                const user =
                    await findUserByWallet(game.wallet);

                if(user){

                    user.points += 100;

                    user.wins += 1;

                    await user.save();

                    updatedUser = user;

                }

            }catch(error){

                console.log(
                    "Reward Error:",
                    error
                );

            }

        }

        return res.json({

            safe,

            won,

            gameOver: won,

            points:
                updatedUser?.points || 0,

            wins:
                updatedUser?.wins || 0

        });

    }catch(error){

        console.log(error);

        return res.status(500).json({
            message: "Server Error"
        });

    }

});

module.exports = router;
