const { ethers } = require("ethers");

const tokenABI =
    require("../abi/PointsTokenABI.json");

const CONTRACT_ADDRESS =
    "0xb4D74513f91b7146f60844f95885B8607DD1F4c6";

const provider =
    new ethers.JsonRpcProvider(
        process.env.SEPOLIA_RPC_URL
    );

const wallet =
    new ethers.Wallet(
        process.env.PRIVATE_KEY,
        provider
    );

const tokenContract =
    new ethers.Contract(
        CONTRACT_ADDRESS,
        tokenABI,
        wallet
    );


module.exports = {
    tokenContract
};