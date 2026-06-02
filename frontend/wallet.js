let userWallet = null;
let walletConnected = false;

window.userWallet = null;
window.walletConnected = false;

function setWalletState(wallet) {

    userWallet = wallet;

    window.userWallet = wallet;

    walletConnected = Boolean(wallet);

    window.walletConnected = walletConnected;

}

function notifyWalletChange(type) {

    window.dispatchEvent(
        new CustomEvent(
            type,
            {
                detail: {
                    wallet: window.userWallet
                }
            }
        )
    );

}

function showWalletMessage(message) {

    const walletMessage =
        document.querySelector(".wallet-card p");

    if (!walletMessage) return;

    walletMessage.innerText = message;

}

async function connectWallet() {

    try {

        if (!window.ethereum) {

            showWalletMessage("MetaMask is required to connect your wallet.");
            return false;

        }

        const accounts =
            await window.ethereum.request({
                method: "eth_requestAccounts"
            });

        if (!accounts.length) {

            setWalletState(null);
            return false;

        }

        setWalletState(accounts[0]);

        await fetch(
            `${API_URL}/users/connect`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    wallet: userWallet
                })
            }
        );

        updateWalletUI();

        notifyWalletChange("wallet-connected");

        return true;

    } catch (error) {
        showWalletMessage("Wallet connection was cancelled or failed.");
        return false;

    }

}

async function isWalletStillConnected(requirePermission = false) {

    try {

        if (!window.ethereum || !window.userWallet) {

            setWalletState(null);
            return false;

        }

        const selectedWallet =
            window.ethereum.selectedAddress || null;

        if (
            !selectedWallet ||
            selectedWallet.toLowerCase() !==
                window.userWallet.toLowerCase()
        ) {

            setWalletState(selectedWallet);
            notifyWalletChange(selectedWallet ? "wallet-changed" : "wallet-disconnected");
            return false;

        }

        const accounts =
            await window.ethereum.request({
                method: requirePermission
                    ? "eth_requestAccounts"
                    : "eth_accounts"
            });

        const activeWallet =
            accounts[0] || null;

        if (
            !activeWallet ||
            activeWallet.toLowerCase() !==
                window.userWallet.toLowerCase()
        ) {

            setWalletState(activeWallet);
            notifyWalletChange(activeWallet ? "wallet-changed" : "wallet-disconnected");
            return false;

        }

        return true;

    } catch (error) {
        setWalletState(null);
        notifyWalletChange("wallet-disconnected");
        return false;

    }

}

function updateWalletUI() {

    const walletText =
        document.getElementById("walletText");

    if (!walletText) return;

    if (!userWallet) {

        walletText.innerText = "Wallet";
        return;

    }

    walletText.innerText =
        `${userWallet.slice(0,6)}...${userWallet.slice(-4)}`;

}

// AUTO RECONNECT
window.addEventListener("load", async () => {

    try {

        if (!window.ethereum) return;

        const accounts =
            await window.ethereum.request({
                method: "eth_accounts"
            });

        if (accounts.length > 0) {

            setWalletState(accounts[0]);

            updateWalletUI();
            notifyWalletChange("wallet-connected");

        }

    } catch (error) {

    }

});

if (window.ethereum) {

    window.ethereum.on("accountsChanged", (accounts) => {

        setWalletState(accounts[0] || null);
        notifyWalletChange(window.userWallet ? "wallet-changed" : "wallet-disconnected");
        updateWalletUI();

    });

    window.ethereum.on("disconnect", () => {

        setWalletState(null);
        notifyWalletChange("wallet-disconnected");

    });

}
