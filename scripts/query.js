const hre = require("hardhat");
const { ethers } = hre;

const ETHPOOL_ADDRESS = "0xc255831059f88a723Ca588b9421620e1cEbf2B6d";

main = async () => {
  console.log("1. Total ETH balance in the pool without contract interaction: ", (await ethers.provider.getBalance(ETHPOOL_ADDRESS)).toString());

  const ethPool = await ethers.getContractAt("ETHPool", ETHPOOL_ADDRESS);
  console.log("2. Total ETH balance in the pool with contract interaction: ", (await ethPool.totalBalance()).toString());
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
