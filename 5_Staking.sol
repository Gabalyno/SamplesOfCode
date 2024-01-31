// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

error Staking__TransferFailed();
error Withdraw__TransferFailed();
error Staking__NeedsMoreThanZero();

contract Staking is ReentrancyGuard, Ownable, Pausable {
    IERC20 public s_stakingToken;
    IERC20 public s_rewardToken;

    uint256 public s_reward_rate;
    uint256 public s_totalSupply;
    uint256 private s_rewardPerTokenStored;
    uint256 private s_lastUpdateTime;

    /** @dev Mapping from address to the amount the user has staked */
    mapping(address => uint256) private s_balances;

    /** @dev Mapping from address to the amount the user has been rewarded */
    mapping(address => uint256) private s_userRewardPerTokenPaid;

    /** @dev Mapping from address to the rewards claimable for user */
    mapping(address => uint256) private s_rewards;

    /** @dev Mapping from address to the last deposit time of user */
    mapping(address => uint256) private s_lastDepositTime;

    modifier updateReward(address account) {
        // how much reward per token?
        // get last timestamp
        // between 12 - 1pm , user earned X tokens. Needs to verify time staked to distribute correct amount to each
        // participant
        s_rewardPerTokenStored = rewardPerToken();
        s_lastUpdateTime = block.timestamp;
        s_rewards[account] = earned(account);
        s_userRewardPerTokenPaid[account] = s_rewardPerTokenStored;

        _;
    }

    modifier moreThanZero(uint256 amount) {
        if (amount == 0) {
            revert Staking__NeedsMoreThanZero();
        }
        _;
    }

    /**
     * Event for setting the rate
     * @param setter who set the rate
     * @param rate amount of tokens purchased
     */
    event RewardRateSet(address indexed setter, uint256 rate);

    /**
     * Event for token stake logging
     * @param staker who paid for the tokens
     * @param amount amount of tokens purchased
     */
    event BimUsdStake(address indexed staker, uint256 amount);

    /**
     * Event for reward claim logging
     * @param claimer who paid for the tokens
     * @param amount amount of tokens purchased
     */
    event RewardClaim(address indexed claimer, uint256 amount);

    /**
     * Event for token withdraw logging
     * @param unstaker who paid for the tokens
     * @param amount amount of tokens purchased
     */
    event BimUsdWithdraw(address indexed unstaker, uint256 amount);

    event Pause();
    event Unpause();

    constructor(
        address stakingToken,
        address rewardToken,
        uint256 _reward_rate
    ) {
        s_stakingToken = IERC20(stakingToken);
        s_rewardToken = IERC20(rewardToken);
        s_reward_rate = _reward_rate;
    }

    /**
     * @notice Checks if the msg.sender is a contract or a proxy
     */
    modifier notContract() {
        require(!_isContract(msg.sender), "contract not allowed");
        require(msg.sender == tx.origin, "proxy contract not allowed");
        _;
    }

    function setRewardRate(uint256 _reward_rate) external onlyOwner {
        s_reward_rate = _reward_rate;
        emit RewardRateSet(msg.sender, _reward_rate);
    }

    function earned(address account) public view returns (uint256) {
        uint256 currentBalance = s_balances[account];
        // how much they were paid already
        uint256 amountPaid = s_userRewardPerTokenPaid[account];
        uint256 currentRewardPerToken = rewardPerToken();
        uint256 pastRewards = s_rewards[account];
        uint256 _earned = ((currentBalance *
            (currentRewardPerToken - amountPaid)) / 1e18) + pastRewards;

        return _earned;
    }

    /** @dev Basis of how long it's been during the most recent snapshot/block */
    function rewardPerToken() public view returns (uint256) {
        if (s_totalSupply == 0) {
            return s_rewardPerTokenStored;
        } else {
            return
                s_rewardPerTokenStored +
                (((block.timestamp - s_lastUpdateTime) * s_reward_rate * 1e9));
        }
    }

    function stake(
        uint256 amount
    )
        external
        updateReward(msg.sender)
        moreThanZero(amount)
        whenNotPaused
        notContract
    {
        // keep track of how much this user has staked
        // keep track of how much token we have total
        // transfer the tokens to this contract
        /** @notice Be mindful of reentrancy attack here */
        s_balances[msg.sender] += amount;
        s_totalSupply += amount;
        s_lastDepositTime[msg.sender] = block.timestamp;
        //emit event
        bool success = s_stakingToken.transferFrom(
            msg.sender,
            address(this),
            amount
        );
        // require(success, "Failed"); Save gas fees here
        if (!success) {
            revert Staking__TransferFailed();
        } else {
            emit BimUsdStake(msg.sender, amount);
        }
    }

    // Withdraw with rewards.

    function withdraw(
        uint256 amount
    )
        external
        updateReward(msg.sender)
        moreThanZero(amount)
        nonReentrant
        notContract
        whenNotPaused
    {
        if (block.timestamp > s_lastDepositTime[msg.sender] + 48 hours) {
            //withdraw token
            s_balances[msg.sender] -= amount;
            s_totalSupply -= amount;
            bool success = s_stakingToken.transfer(msg.sender, amount);
            if (!success) {
                revert Withdraw__TransferFailed();
            }
            emit BimUsdWithdraw(msg.sender, amount);

            //Claim reward
            uint256 reward = s_rewards[msg.sender];
            s_rewards[msg.sender] = 0;
            bool successReward = s_rewardToken.transfer(msg.sender, reward);
            if (!successReward) {
                revert Staking__TransferFailed();
            }
            emit RewardClaim(msg.sender, reward);
        } else {
            //reward to 0
            s_rewards[msg.sender] = 0;
            s_balances[msg.sender] -= amount;
            s_totalSupply -= amount;
            // emit event
            bool success = s_stakingToken.transfer(msg.sender, amount);
            if (!success) {
                revert Withdraw__TransferFailed();
            }
            emit BimUsdWithdraw(msg.sender, amount);
        }
    }

    function claimReward()
        external
        updateReward(msg.sender)
        nonReentrant
        notContract
        whenNotPaused
    {
        if (block.timestamp > s_lastDepositTime[msg.sender] + 48 hours) {
            uint256 reward = s_rewards[msg.sender];
            s_rewards[msg.sender] = 0;
            bool success = s_rewardToken.transfer(msg.sender, reward);
            if (!success) {
                revert Staking__TransferFailed();
            }
            emit RewardClaim(msg.sender, reward);
        } else {
            //reward to 0
            s_rewards[msg.sender] = 0;
            emit RewardClaim(msg.sender, 0);
        }
    }

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(
        uint256 amount
    )
        external
        updateReward(msg.sender)
        moreThanZero(amount)
        nonReentrant
        notContract
    {
        //reward to 0
        s_rewards[msg.sender] = 0;
        s_balances[msg.sender] -= amount;
        s_totalSupply -= amount;
        // emit event
        bool success = s_stakingToken.transfer(msg.sender, amount);
        if (!success) {
            revert Withdraw__TransferFailed();
        }
        emit BimUsdWithdraw(msg.sender, amount);
    }

    //Pause functions
    /**
     * @notice Triggers stopped state
     * @dev Only possible when contract not paused.
     */
    function pause() external onlyOwner whenNotPaused {
        _pause();
        emit Pause();
    }

    /**
     * @notice Returns to normal state
     * @dev Only possible when contract is paused.
     */
    function unpause() external onlyOwner whenPaused {
        _unpause();
        emit Unpause();
    }

    // Getter for UI
    function getStaked(address account) public view returns (uint256) {
        return s_balances[account];
    }

    /**
     * @notice Checks if address is a contract
     * @dev It prevents contract from being targetted
     */
    function _isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }
}
