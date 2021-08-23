// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @notice ETHPool provides a service where people can deposit ETH and they will receive weekly rewards.
 */
contract ETHPool is ReentrancyGuard {
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    address public team;
    uint256 public totalBalance; // totalBalance = pool's ETH balance
    uint256 public totalScaledBalance; // index = totalBalance / totalScaledBalance
    mapping(address => uint256) public userScaledBalance; // userBalance = userScaledBalance * index

    /**
     * @dev Throws if called by any account other than the team.
     */
    modifier onlyTeam() {
        require(team == msg.sender, "caller is not the team");
        _;
    }

    constructor(address _team) ReentrancyGuard() {
        team = _team;
    }

    /**
     * @dev Returns the user's balance including rewards. (balance = scaled balance * index)
     */
    function userBalance(address user) public view returns (uint256) {
        if (userScaledBalance[user] == 0) {
            return 0;
        }

        return (userScaledBalance[user] * totalBalance) / totalScaledBalance;
    }

    /**
     * @notice Users can deposit ETH
     * @dev Calculate user's scaled balance based on the current index.
     */
    function deposit() external payable {
        uint256 scaledBalance = msg.value;
        if (totalBalance != 0) {
            scaledBalance = (scaledBalance * totalScaledBalance) / totalBalance;
        }

        userScaledBalance[msg.sender] += scaledBalance;
        totalScaledBalance += scaledBalance;
        totalBalance += msg.value;

        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Users can withdraw ETH
     * @dev Calculate user's balance based on the current index.
     */
    function withdraw() external nonReentrant {
        uint256 withdrawAmount = userBalance(msg.sender);
        require(withdrawAmount != 0, "no withdrawl balance");

        totalScaledBalance -= userScaledBalance[msg.sender];
        userScaledBalance[msg.sender] = 0;
        totalBalance -= withdrawAmount;

        (bool success, ) = msg.sender.call{value: withdrawAmount}("");
        require(success, "failed to withdraw");

        emit Withdraw(msg.sender, withdrawAmount);
    }

    /**
     * @notice Team can deposit rewards in ETH
     */
    function distributeRewards() external payable onlyTeam {
        totalBalance += msg.value;
    }
}
