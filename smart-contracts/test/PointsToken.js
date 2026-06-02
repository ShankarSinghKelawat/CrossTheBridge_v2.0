const { expect } = require("chai");

describe("PointsToken", function () {
    async function deployPointsTokenFixture() {
        const [owner, otherAccount] = await ethers.getSigners();
        const PointsToken = await ethers.getContractFactory("PointsToken");
        const token = await PointsToken.deploy();

        return {
            token,
            owner,
            otherAccount
        };
    }

    it("deploys with the expected name and symbol", async function () {
        const { token } = await deployPointsTokenFixture();

        expect(await token.name()).to.equal("Points Tokens");
        expect(await token.symbol()).to.equal("PTS");
    });

    it("mints the initial supply to the deployer", async function () {
        const { token, owner } = await deployPointsTokenFixture();
        const initialSupply = ethers.parseUnits("1000000", 18);

        expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
    });

    it("allows only the owner to mint", async function () {
        const { token, owner, otherAccount } = await deployPointsTokenFixture();
        const amount = ethers.parseUnits("100", 18);

        await token.mint(otherAccount.address, amount);

        expect(await token.balanceOf(otherAccount.address)).to.equal(amount);

        await expect(
            token.connect(otherAccount).mint(owner.address, amount)
        ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
});
