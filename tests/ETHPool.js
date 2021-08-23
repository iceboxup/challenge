const chai = require("chai");
const { solidity } = require("ethereum-waffle");
const { ethers } = require("hardhat");
const { expect } = chai;

chai.use(solidity);

const units = (value) => ethers.utils.parseUnits(value.toString());

const checkAlmostSame = (a, b) => {
  expect(
    ethers.BigNumber.from(a).gte(ethers.BigNumber.from(b).mul(999).div(1000))
  ).to.be.true;
  expect(
    ethers.BigNumber.from(a).lte(ethers.BigNumber.from(b).mul(1001).div(1000))
  ).to.be.true;
};

describe("ETHPool", () => {
  let deployer, team, userA, userB;
  let ethPool;

  before(async () => {
    const accounts = await ethers.getSigners();
    deployer = accounts[0];
    team = accounts[1];
    userA = accounts[2];
    userB = accounts[3];

    const ETHPool = await ethers.getContractFactory("ETHPool");
    ethPool = await ETHPool.deploy(team.address);
    await ethPool.deployed();
  });

  it("A deposits 100, B deposits 300, T deposits 200 -> A withdraws 150, B withdraws 450", async () => {
    expect(await ethPool.userBalance(userA.address)).to.equal(0);
    expect(await ethPool.userBalance(userB.address)).to.equal(0);
    expect(await ethPool.totalBalance()).to.equal(0);

    await ethPool.connect(userA).deposit({ value: units(100) });
    await ethPool.connect(userB).deposit({ value: units(300) });

    expect(await ethPool.userBalance(userA.address)).to.equal(units(100));
    expect(await ethPool.userBalance(userB.address)).to.equal(units(300));
    expect(await ethPool.totalBalance()).to.equal(units(400));

    await ethPool.connect(team).distributeRewards({ value: units(200) });

    expect(await ethPool.userBalance(userA.address)).to.equal(units(150));
    expect(await ethPool.userBalance(userB.address)).to.equal(units(450));
    expect(await ethPool.totalBalance()).to.equal(units(600));

    const userABalanceBefore = await ethers.provider.getBalance(userA.address);
    const userBBalanceBefore = await ethers.provider.getBalance(userB.address);

    await ethPool.connect(userA).withdraw();
    await ethPool.connect(userB).withdraw();

    const userABalanceAfter = await ethers.provider.getBalance(userA.address);
    const userBBalanceAfter = await ethers.provider.getBalance(userB.address);

    // consider gas fee
    checkAlmostSame(userABalanceAfter, units(150).add(userABalanceBefore));
    checkAlmostSame(userBBalanceAfter, units(450).add(userBBalanceBefore));

    expect(await ethPool.userBalance(userA.address)).to.equal(0);
    expect(await ethPool.userBalance(userB.address)).to.equal(0);
    expect(await ethPool.totalBalance()).to.equal(0);
  });

  it("A deposits 100, T deposits 200, B deposits 300 -> A withdraws 300, B withdraws 300", async () => {
    await ethPool.connect(userA).deposit({ value: units(100) });

    expect(await ethPool.userBalance(userA.address)).to.equal(units(100));
    expect(await ethPool.userBalance(userB.address)).to.equal(0);
    expect(await ethPool.totalBalance()).to.equal(units(100));

    await ethPool.connect(team).distributeRewards({ value: units(200) });

    expect(await ethPool.userBalance(userA.address)).to.equal(units(300));
    expect(await ethPool.userBalance(userB.address)).to.equal(0);
    expect(await ethPool.totalBalance()).to.equal(units(300));

    await ethPool.connect(userB).deposit({ value: units(300) });

    expect(await ethPool.userBalance(userA.address)).to.equal(units(300));
    expect(await ethPool.userBalance(userB.address)).to.equal(units(300));
    expect(await ethPool.totalBalance()).to.equal(units(600));

    const userABalanceBefore = await ethers.provider.getBalance(userA.address);
    const userBBalanceBefore = await ethers.provider.getBalance(userB.address);

    await ethPool.connect(userA).withdraw();
    await ethPool.connect(userB).withdraw();

    const userABalanceAfter = await ethers.provider.getBalance(userA.address);
    const userBBalanceAfter = await ethers.provider.getBalance(userB.address);

    // consider gas fee
    checkAlmostSame(userABalanceAfter, units(300).add(userABalanceBefore));
    checkAlmostSame(userBBalanceAfter, units(300).add(userBBalanceBefore));

    expect(await ethPool.userBalance(userA.address)).to.equal(0);
    expect(await ethPool.userBalance(userB.address)).to.equal(0);
    expect(await ethPool.totalBalance()).to.equal(0);
  });

  it("A deposits 100, A withdraws 100, B deposits 300, T deposits 200 -> A can't withdraw, B withdraws 500", async () => {
    await ethPool.connect(userA).deposit({ value: units(100) });
    await ethPool.connect(userA).withdraw();
    await ethPool.connect(userB).deposit({ value: units(300) });

    expect(await ethPool.userBalance(userA.address)).to.equal(0);
    expect(await ethPool.userBalance(userB.address)).to.equal(units(300));
    expect(await ethPool.totalBalance()).to.equal(units(300));

    await ethPool.connect(team).distributeRewards({ value: units(200) });

    expect(await ethPool.userBalance(userA.address)).to.equal(0);
    expect(await ethPool.userBalance(userB.address)).to.equal(units(500));
    expect(await ethPool.totalBalance()).to.equal(units(500));

    const userBBalanceBefore = await ethers.provider.getBalance(userB.address);

    await expect(ethPool.connect(userA).withdraw()).revertedWith(
      "no withdrawl balance"
    );
    await ethPool.connect(userB).withdraw();

    const userBBalanceAfter = await ethers.provider.getBalance(userB.address);

    // consider gas fee
    checkAlmostSame(userBBalanceAfter, units(500).add(userBBalanceBefore));
  });

  it("only team can deposit rewards", async () => {
    await expect(
      ethPool.connect(userA).distributeRewards({ value: units(100) })
    ).revertedWith("caller is not the team");
  });
});
