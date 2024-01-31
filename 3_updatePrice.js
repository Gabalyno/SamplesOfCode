var cron = require("node-cron");
const _ = require("lodash");
const axios = require("axios");

const Token = require("../models/token");

let symbolsArray;

//Get token symbols from DB
const getCoinGeckoNames = async () => {
  let tokenSymbols;
  try {
    tokenSymbols = await Token.find(
      { activeted: true },
      { coinGecko: 1, _id: 0 }
    );

    symbolsArray = _.map(tokenSymbols, "coinGecko");
  } catch (err) {
    console.log(`DB error getGescko: ${err}`);
  }

  return symbolsArray;
};

const updateToken = async (coinGecko, newPrice, next) => {
  let token;
  try {
    token = await Token.findOne({ coinGecko: coinGecko });
  } catch (err) {
    console.log(`DB did not responde, error: ${err}`);
  }
  if (!token.is1000) {
    token.tokenPrice = newPrice;
  } else {
    token.tokenPrice = newPrice * 1000;
  }

  try {
    await token.save();
  } catch (err) {
    console.log(`DB did not save, error: ${err}`);
  }
};

const priceHandler = async (symbolsArray) => {
  if (symbolsArray) {
    try {
      const responseData = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${symbolsArray.toString()}&vs_currencies=usd`
      );

      let coinGeckoNames = Object.keys(responseData.data);
      //console.log(`List of tokens from Coingecko: ${coinGeckoNames}`);

      for (let i = 0; i < coinGeckoNames.length; i++) {
        let coinGecko = coinGeckoNames[i];
        let tokenPrice = _.get(_.get(responseData.data, coinGecko), "usd");
        //console.log(`In For: ${coinGecko}, new price:${tokenPrice}`);
        await updateToken(coinGecko, tokenPrice);
      }
    } catch (err) {
      console.log(err);
    }
  } else {
    console.log("No data from DB.");
  }
};

const updateBase = cron.schedule("* * * * *", async () => {
  await getCoinGeckoNames();
  await priceHandler(symbolsArray);
});

module.exports = updateBase;
