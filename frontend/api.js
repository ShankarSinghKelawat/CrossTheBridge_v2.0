const API_URL =
    "https://crossthebridge-v2-0.onrender.com/api";

window.API_URL = API_URL;

async function getProfile(wallet){

    try{

        const response =
            await fetch(
                `${API_URL}/game/profile/${wallet}`
            );

        if(!response.ok){
            return null;
        }

        return await response.json();

    }catch(error){
        return null;

    }

}

async function redeemTokens(wallet){

    try{

        const response =
            await fetch(
                `${API_URL}/rewards/redeem`,
                {
                    method:"POST",

                    headers:{
                        "Content-Type":
                            "application/json"
                    },

                    body:JSON.stringify({
                        wallet
                    })
                }
            );

        return await response.json();

    }catch(error){
        return {
            success:false,
            message:"Network error. Please try again."
        };

    }

}
