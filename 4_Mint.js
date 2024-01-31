import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";

import ConnectButton from "../components/ConnectButton";
import CurrencyField from "../components/CurrencyField";
import ConnectMeta from "../components/ConnectMeta";
import { activeChain } from "../utils/constants";

import {
  getBimContract,
  getUsdtContract,
  getFundBimContract,
  getMintBimUsdContract,
} from "../utils/importContracts";

function Mint() {
  const [wallet, setWallet] = useState({ accounts: [] });

  const [provider, setProvider] = useState(undefined);
  const [signer, setSigner] = useState(undefined);
  // const [signerAddress, setSignerAddress] = useState(undefined);
  const [chainId, setChainId] = useState(undefined);

  const [bimContract, setBimContract] = useState(undefined);
  const [usdtContract, setUsdtContract] = useState(undefined);
  const [fundBimContract, setFundBimContract] = useState(undefined);
  const [mintUsdContract, setMintUsdContract] = useState(undefined);

  const [usdtAmount, setUsdtAmount] = useState(undefined);
  const [ethAmount, setEthAmount] = useState(undefined);

  const [usdtOutAmount, setUsdtOutAmount] = useState(0);
  const [wethOutAmount, setWethOutAmount] = useState(0);

  const [mintBim, setMintBim] = useState(0);

  useEffect(() => {
    const onLoad = async () => {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);

      const chainId = await provider.getNetwork();
      setChainId(chainId.chainId);

      const bimContract = getBimContract();
      setBimContract(bimContract);

      const usdtContract = getUsdtContract();
      setUsdtContract(usdtContract);

      const fundBimContract = getFundBimContract();
      setFundBimContract(fundBimContract);

      const mintUsdContract = getMintBimUsdContract();
      setMintUsdContract(mintUsdContract);
    };

    onLoad();
  }, []);

  const toNumber = (hexnumber) => Number(ethers.utils.formatEther(hexnumber));

  //Check if wallet is connected
  const isConnected = () => wallet.accounts.length > 0;

  const getDataFromChain = async () => {
    if (
      bimContract &&
      fundBimContract &&
      usdtContract &&
      provider &&
      isConnected()
    ) {
      if (chainId === activeChain) {
        try {
          //get BIM balance in fundBIM contract
          const bimFund = await bimContract.balanceOf(fundBimContract.address);

          setMintBim(toNumber(bimFund));
        } catch (error) {
          console.log(error);
        }

        //get Usdt balance in user account
        const usdtSigner = await usdtContract.balanceOf(wallet.accounts[0]);
        setUsdtAmount(toNumber(usdtSigner));

        //get ETH balance in user account
        const ethSigner = await provider.getBalance(wallet.accounts[0]);
        setEthAmount(toNumber(ethSigner));
      }
    }
  };
  getDataFromChain();

  //function to get the object to interact with blockchain
  const getSigner = async (provider) => {
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    setSigner(signer);
  };

  const notify = (error) => {
    if (error.toLowerCase().includes("transfer amount exceeds balance")) {
      toast.error("Not enough tokens in smartcontract!", {
        theme: "colored",
      });
    } else {
      toast.error(error, {
        theme: "colored",
      });
    }
  };

  const toWei = (ether) => ethers.utils.parseEther(ether);

  const buyTokens = async () => {
    try {
      const wei = toWei(wethOutAmount);
      const tx = await fundBimContract
        .connect(signer)
        .buyTokens(wallet.accounts[0], { value: wei });
      await getTxInfo(tx);
    } catch (error) {
      notify(error.message);
    }
  };

  const getTx = async (tx) => {
    await tx.wait(1);

    const delayInMilliseconds = 1000 * 5; //1 second
    setTimeout(function () {
      getDataFromChain();
    }, delayInMilliseconds);
  };

  const getTxInfo = async (tx) => {
    toast.promise(getTx(tx), {
      pending: {
        render() {
          return "Pending transaction...";
        },
        icon: false,
      },
      success: {
        render() {
          return `Tx: ${tx.hash}`;
        },
        // other options
        icon: "🟢",
      },
      error: {
        render({ data }) {
          // When the promise reject, data will contains the error
          return `Error: ${data.message}}`;
        },
      },
    });
  };

  const mintBimUsd = async () => {
    const usdtQuantityWei = ethers.utils.parseEther(usdtOutAmount);

    try {
      await usdtContract
        .connect(signer)
        .approve(mintUsdContract.address, usdtQuantityWei);
      const tx = await mintUsdContract.connect(signer).mint(usdtQuantityWei);
      getTxInfo(tx);
    } catch (error) {
      notify(error.message);
    }
  };

  //Transfer to button
  const onChangeEth = (value) => {
    setWethOutAmount(value);
  };

  const onChangeUsdt = (value) => {
    setUsdtOutAmount(value);
  };

  const getWallet = (accounts) => {
    setWallet({ accounts });
  };

  return (
    <div className="App">
      <div className="appBody">
        <div className="row">
          <div className="col-md-6">
            {/* wallet connection */}
            <div className="connectContainer">
              <div className="swapHeader ">
                <span className="swapText">Main chain:</span>
                <span className="walletContainer">Arbitrum</span>
              </div>
              <div className="row currencyInput">
                <div className="col-md-4 numberContainer fs-5">Wallet:</div>
                <div className="col-md-8 tokenContainer">
                  <span className="walletContainer">
                    <ConnectMeta
                      getSigner={getSigner}
                      chainId={chainId}
                      getWallet={getWallet}
                    />
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            {/* info block */}
            <div className="  connectContainer">
              <div className="swapHeader ">
                <span className="swapText ">Mint price:</span>
              </div>

              <div className="swapHeader currencyInput">
                <span className="swapText ">bimUSD:</span>
                <span className="walletContainer ">{"1.00"} USDT</span>
              </div>
              <div className="swapHeader currencyInput">
                <span className="swapText">1mln BIM:</span>
                <span className="walletContainer"> {"0.5"} ETH</span>
                <div className="tokenContainer">
                  <span className="balanceAmount">
                    Available for minting BIM: {mintBim}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isConnected() && chainId === activeChain ? (
          <div className="row">
            <div className="col-md-6">
              <div className="connectContainer">
                <div className="swapBody">
                  <div className="swapHeader ">
                    <span className="swapText">Send USDT to mint</span>
                    <span className="walletContainer">bimUSD</span>
                  </div>
                  <CurrencyField
                    field="input"
                    tokenName="USDT"
                    signer={signer}
                    balance={usdtAmount}
                    value={usdtOutAmount}
                    onChange={onChangeUsdt}
                  />
                  <div>
                    <ConnectButton name={"Send"} onClick={mintBimUsd} />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="connectContainer">
                <div className="swapHeader">
                  <span className="swapText">Send ETH to mint</span>
                  <span className="walletContainer">BIM</span>
                </div>
                <CurrencyField
                  field="output"
                  tokenName="ETH"
                  value={wethOutAmount}
                  signer={signer}
                  balance={ethAmount}
                  onChange={onChangeEth}
                />
                <div>
                  <ConnectButton name={"Send"} onClick={buyTokens} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
export default Mint;
