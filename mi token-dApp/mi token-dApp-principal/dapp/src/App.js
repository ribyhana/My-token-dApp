import './App.css';
import React, { useState, useEffect } from 'react';
import * as StellarSdk from 'stellar-sdk';
import freighterApi from "@stellar/freighter-api";

const App = () => {
  const [publicKey, setPublicKey] = useState('');
  const [balance, setBalance] = useState('');
  const [to, setTo] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const rpc = new StellarSdk.SorobanRpc.Server('https://soroban-testnet.stellar.org');
  const contractId = 'CCOCB24RH7R2TKF4QVS4J6GBLZ5IZK4FXWQWMQ6GYRGHNUFPW53VJOFU';
  const contract = new StellarSdk.Contract(contractId);

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      const inputFrom = StellarSdk.nativeToScVal(publicKey, { type: "address" });
      const inputTo = StellarSdk.nativeToScVal(to, { type: "address" });
      const inputValue = StellarSdk.nativeToScVal(value, { type: "i128" });
      const account = await rpc.getAccount(publicKey);
      const network = await freighterApi.getNetwork()
      const tx = new StellarSdk.TransactionBuilder(account, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        })
        .addOperation(contract.call("transfer", inputFrom, inputTo, inputValue))
        .setTimeout(30)
        .build();
      console.log('tx.toXDR()',tx.toXDR());
      const preTx = await rpc.prepareTransaction(tx);
      const signedTX = await freighterApi.signTransaction(preTx.toXDR(), network);
      console.log('signedTransaction', signedTX);
      const preparedTx = StellarSdk.TransactionBuilder.fromXDR(signedTX.signedTxXdr, StellarSdk.Networks.TESTNET);
      console.log('preparedTx',preparedTx);
      const txResult = await rpc.sendTransaction(preparedTx);
      console.log('txResult', txResult);
      setTo('');
      setValue('');
    } catch (err) {
      setError('Failed to set value: ' + err.message);
    }
  };

  const connectWallet = async () => {
    const isAppConnected = await freighterApi.isConnected();
    if (!isAppConnected.isConnected) {
      alert("Please install the Freighter wallet");
      window.open('https://freighter.app');
    }
    const accessObj = await freighterApi.requestAccess();
    if (accessObj.error) {
      alert('Error connecting freighter wallet');
    } else {
      setPublicKey(accessObj.address);
    }
  }

  const getBalance = async () => {
    if (!publicKey) {
      console.log('No public key to fetch balance');
      return;
    }
    //console.log('publicKey', publicKey);
    try {
      const inputAddressID = StellarSdk.nativeToScVal(publicKey, { type: "address" });
      //console.log('inputAddressID',inputAddressID);
      const account = await rpc.getAccount(publicKey);
      //console.log('account', account)
      const tx = new StellarSdk.TransactionBuilder(account, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        })
        .addOperation(contract.call("balance", inputAddressID))
        .setTimeout(30)
        .build();
      //console.log('tx', tx);
      rpc.simulateTransaction(tx).then((sim) => {
        const decoded = StellarSdk.scValToNative(sim.result?.retval);
        //console.log('decoded', decoded);
        setBalance(decoded.toString());
      });
    } catch (err) {
      setError('Failed to get value: ' + err.message);
    }
  }

  useEffect(() => {
    connectWallet();
  }, []);

  getBalance();


  return (
    <div className="app">
      <h1 className="app-title">Soroban Token dApp</h1>

      <div className="wallet">Wallet: <span className="public-key">{publicKey}</span></div>
      <div className="balance">Balance: <span className="balance-amount">{balance}</span></div>

      {error && (
        <div className="error-message">
          <strong>Error: </strong>
          <span>{error}</span>
        </div>
      )}

      <div className="section">
        <h2 className="section-title">Send Tokens</h2>
        <form onSubmit={handleSend} className="form">
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="To Address"
            className="input"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Value"
            className="input"
          />
          <button type="submit" className="button">Send</button>
        </form>
      </div>
    </div>
  );
};

export default App;