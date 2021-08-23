const fs = require("fs");
const hre = require("hardhat");
const { ethers } = hre;

main = async () => {
  const [deployer] = await ethers.getSigners();
  const team = deployer;
  console.log("Deployer address = ", deployer.address);
  console.log("team address = ", team.address);

  const ETHPool = await ethers.getContractFactory("ETHPool");
  const ethPool = await ETHPool.deploy(team.address);
  await ethPool.deployed();
  console.log("ETHPool deployed at", ethPool.address);

  fs.writeFileSync(
    "publish/" + process.env.HARDHAT_NETWORK + ".json",
    JSON.stringify(
      {
        ethPool: ethPool.address,
      },
      null,
      2
    )
  );
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
