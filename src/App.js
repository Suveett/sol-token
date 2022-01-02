import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import React, { useState, /*useEffect*/ } from 'react';




const App = () => {
    const [walletConnected, setWalletConnected] = useState(false);
    const [provider, setProvider] = useState();
    const [loading, setLoading] = useState();
    const [isTokenCreated, setIsTokenCreated] = useState(false);
    const [createdTokenPublicKey, setCreatedTokenPublicKey] = useState(null);
    const [mintingWalletSecretKey, setMintingWalletSecretKey] = useState(null);
    const [supplyCapped,setSupplyCapped]=useState(false);   





    const getProvider = async () => {
        if ("solana" in window) {
            const provider = window.solana;
            if (provider.isPhantom) {
                return provider;
            }
        } else {
            window.open("https://www.phantom.app/", "_blank");
        }
    };

    const walletConnectionHelper = async () => {
        if (walletConnected) {
            //Disconnect Wallet
            setProvider();
            setWalletConnected(false);
        } else {
            const userWallet = await getProvider();
            if (userWallet) {
                await userWallet.connect();
                userWallet.on("connect", async () => {
                    setProvider(userWallet);
                    setWalletConnected(true);

                });
            }
        }
    }



    const airDropHelper = async () => {
        try {
            setLoading(true);
            const connection = new Connection(
                clusterApiUrl("devnet"),
                "confirmed"
            );
            const fromAirDropSignature = await connection.requestAirdrop(new PublicKey(provider.publicKey), LAMPORTS_PER_SOL);
            await connection.confirmTransaction(fromAirDropSignature, { commitment: "confirmed" });

            console.log(`1 SOL airdropped to your wallet ${provider.publicKey.toString()} successfully`);
            setLoading(false);
        } catch (err) {
            console.log(err);
            setLoading(false);
        }
    }



    const initialMintHelper = async () => {
        try {
            setLoading(true);
            const connection = new Connection(
                clusterApiUrl("devnet"),
                "confirmed"
            );

            const mintRequester = await provider.publicKey;
            const mintingFromWallet = await Keypair.generate();//4p4iqPwDLKG6g41n2KZ5c34X7VB17CX52onndUikcA8R : The initial Owner(7u9HWZpLhgVC9NgnbXyEs3fHwYt8eDuKZ9jfqn3c2LfC) of the Minted TokenAddress(48e8f4zqnzFF4pZauiCE51Yjpu2DSXY6TMwGrjPF7eoJ)
            console.log("mintingFromWallet: " , mintingFromWallet);

            setMintingWalletSecretKey(JSON.stringify(mintingFromWallet.secretKey));

            const fromAirDropSignature = await connection.requestAirdrop(mintingFromWallet.publicKey, LAMPORTS_PER_SOL);
            await connection.confirmTransaction(fromAirDropSignature, { commitment: "confirmed" });

            const creatorToken = await Token.createMint(connection, mintingFromWallet, mintingFromWallet.publicKey, null, 6, TOKEN_PROGRAM_ID); //(Token Object is created : TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
            console.log("creatorToken :", creatorToken);

            const fromTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(mintingFromWallet.publicKey);//7u9HWZpLhgVC9NgnbXyEs3fHwYt8eDuKZ9jfqn3c2LfC
            console.log("fromTokenAccount :", fromTokenAccount);

            await creatorToken.mintTo(fromTokenAccount.address, mintingFromWallet.publicKey, [], 1000000);// Generates this address: 48e8f4zqnzFF4pZauiCE51Yjpu2DSXY6TMwGrjPF7eoJ (TokenAddress)

            const toTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(mintRequester);//9n7U1QqQDxfeiVpgNMQARES3LNx6ee8eJmRwWdKRq8hG (The owner of this Address is the UserWallet PubKey :4S5tnrLzMn1cMyCiRj4HSE3ZUcMyKjNsaxiG4NmTx3J5)
            console.log("toTokenAccount:", toTokenAccount);
            
            const transaction = new Transaction().add(
                Token.createTransferInstruction(
                    TOKEN_PROGRAM_ID,
                    fromTokenAccount.address,
                    toTokenAccount.address,
                    mintingFromWallet.publicKey,
                    [],
                    1000000
                )
            );
            const signature = await sendAndConfirmTransaction(connection, transaction, [mintingFromWallet], { commitment: "confirmed" });

            console.log("SIGNATURE:", signature);

            setCreatedTokenPublicKey(creatorToken.publicKey.toString());// 48e8f4zqnzFF4pZauiCE51Yjpu2DSXY6TMwGrjPF7eoJ (TokenAddress)
            console.log("setCreatedTokenPublicKey: ", creatorToken.publicKey.toString() );
            setIsTokenCreated(true);
            setLoading(false);
        } catch (err) {
            console.log(err)
            setLoading(false);
        }
    }

    const mintAgainHelper=async () => {
        try {
            setLoading(true);
            const connection = new Connection(
                clusterApiUrl("devnet"),
                "confirmed"
            );
            const createMintingWallet = await Keypair.fromSecretKey(Uint8Array.from(Object.values(JSON.parse(mintingWalletSecretKey))));
            console.log("Created a new Minting Wallet :", createMintingWallet);

            const mintRequester = await provider.publicKey;
            console.log("Mint Requester is Keypair account :" , mintRequester);
            
            const fromAirDropSignature = await connection.requestAirdrop(createMintingWallet.publicKey,LAMPORTS_PER_SOL);
            await connection.confirmTransaction(fromAirDropSignature, { commitment: "confirmed" });
            
            const creatorToken = new Token(connection, createdTokenPublicKey, TOKEN_PROGRAM_ID, createMintingWallet);
            
            const fromTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(createMintingWallet.publicKey);
            console.log("fromTokenAccount :", fromTokenAccount);

            const toTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(mintRequester);
            console.log("toTokenAccount: ", toTokenAccount);

            await creatorToken.mintTo(fromTokenAccount.address, createMintingWallet.publicKey, [], 100000000);

            
            const transaction = new Transaction().add(
                Token.createTransferInstruction(
                    TOKEN_PROGRAM_ID,
                    fromTokenAccount.address,
                    toTokenAccount.address,
                    createMintingWallet.publicKey,
                    [],
                    100000000
                )
            );
            await sendAndConfirmTransaction(connection, transaction, [createMintingWallet], { commitment: "confirmed" });
            
            setLoading(false);
        } catch(err) {
            console.log(err);
            setLoading(false);
        }
     }

     const transferTokenHelper = async () => {
        try {
           setLoading(true);
           
           const connection = new Connection(
              clusterApiUrl("devnet"),
              "confirmed"
           );
           
           const createMintingWallet = Keypair.fromSecretKey(Uint8Array.from(Object.values(JSON.parse(mintingWalletSecretKey))));
           const receiverWallet = new PublicKey("EuRKRa8Dt27RNcp1ZQgkupM8i5QUjmSMT4v8Un7VVZGL");
           
           const fromAirDropSignature = await connection.requestAirdrop(createMintingWallet.publicKey, LAMPORTS_PER_SOL);
           await connection.confirmTransaction(fromAirDropSignature, { commitment: "confirmed" });
           console.log('1 SOL airdropped to the wallet for fee');
           
           const creatorToken = new Token(connection, createdTokenPublicKey, TOKEN_PROGRAM_ID, createMintingWallet);
           const fromTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(provider.publicKey);
           const toTokenAccount = await creatorToken.getOrCreateAssociatedAccountInfo(receiverWallet);
           
           const transaction = new Transaction().add(
              Token.createTransferInstruction(TOKEN_PROGRAM_ID, fromTokenAccount.address, toTokenAccount.address, provider.publicKey, [], 10000000)
           );
           transaction.feePayer=provider.publicKey;
           let blockhashObj = await connection.getRecentBlockhash();
           console.log("blockhashObj", blockhashObj);
           transaction.recentBlockhash = await blockhashObj.blockhash;
     
           if (transaction) {
              console.log("Txn created successfully");
           }
           
           let signed = await provider.signTransaction(transaction);
           let signature = await connection.sendRawTransaction(signed.serialize());
           await connection.confirmTransaction(signature);
           
           console.log("SIGNATURE: ", signature);
           setLoading(false);
        } catch(err) {
           console.log(err)
           setLoading(false);
        }
     }
     

    return (
        <div>
            <h1>🖼 Create your own SPL token using JavaScript</h1>

            {
                walletConnected ? (
                    <p><strong>Public Key:</strong> {provider.publicKey.toString()}</p>

                ) : <p></p>
            }

            <button onClick={walletConnectionHelper} disabled={loading}>
                {!walletConnected ? "Connect Wallet" : "Disconnect Wallet"}
            </button>


            {
                walletConnected ? (
                    <p>Airdrop 1 SOL into your wallet
                        <button onClick={airDropHelper} disabled={loading} >AirDrop SOL </button>
                    </p>) : <></>
            }

            {
                walletConnected ? (
                    <p>Create Your own Token
                        <button onClick={initialMintHelper} disabled={loading}>Mint Initial Token</button>
                    </p>) : <></>

            }

            {
                isTokenCreated ? (
                <li>Mint More 100 tokens: 
                    <button disabled={loading || supplyCapped} onClick={mintAgainHelper}>Mint Again</button>
                </li>) : <></>
            }
                    
            {
                isTokenCreated ? (
                    <p>Wanna send Token to a friend ??
                        <button onClick={transferTokenHelper} disabled={loading}>Send now</button>
                    </p>) : <></>
                
            }
            



        </div>
    )





};

export default App;
