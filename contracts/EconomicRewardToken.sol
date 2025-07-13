// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

// OpenZeppelin v4.8.3 standard import paths for Remix and compatible environments
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.8.3/contracts/token/ERC20/ERC20.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.8.3/contracts/access/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.8.3/contracts/utils/math/SafeMath.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.8.3/contracts/utils/Address.sol";

/**
 * @title IVRC25
 * @dev Interface for the VRC25 token standard, including fee mechanisms.
 * This interface defines the events and functions required for VRC25 compatibility.
 */
interface IVRC25 {
    // Event emitted when a fee is charged.
    event Fee(address indexed from, address indexed to, address indexed issuer, uint256 amount);

    // Returns the address of the token issuer/owner.
    function issuer() external view returns (address);

    // Estimates the transaction fee for a given value.
    function estimateFee(uint256 value) external view returns (uint256);
}

/**
 * @title EconomicalRewardToken
 * @dev A custom ERC20 token with VRC25-like fee mechanism, reward sharing, and burning features.
 * This token is designed for an in-app economical currency and rewarding system.
 * It hardcodes initial supply, decimals, and minimum fee using a constructor.
 * Fee distribution: Adjusted based on new requirements (LGU, Platform, Emergency/Dev/Marketing, and a general operations fund).
 * Includes basic on-chain user data storage (levels, badges).
 * Adds functionality for token market value overview in PHP and USD, and LGU redemption signaling.
 * Introduces a daily token faucet for users to claim rewards, moving towards decentralization of token issuance.
 * Adds a general function for the owner to reward users for specific tasks/quests.
 */
contract EconomicalRewardToken is ERC20, Ownable, IVRC25 {
    // Using SafeMath for all uint256 operations to prevent overflows/underflows.
    using SafeMath for uint256;
    // Using Address library for checking if an address is a contract.
    using Address for address;

    // --- VRC25 Required Storage Order ---
    // The order of _balances, _minFee, _owner MUST NOT be changed for gas sponsor validation [73]
    // _balances is handled by ERC20 from OpenZeppelin
    uint256 private _minFee; // Minimum fee, set in constructor
    // _owner is handled by Ownable from OpenZeppelin

    // --- Token Configuration (Hardcoded) ---
    string private constant _NAME = "JuanderQuest Token";
    string private constant _SYMBOL = "JDQ";
    uint8 private constant _DECIMALS = 16; // Hardcoded 16 decimals
    uint256 private constant _INITIAL_SUPPLY = 1000000 * (10**16); // Hardcoded 1,000,000 tokens with 16 decimals

    // --- Fee Distribution Addresses ---
    address public lguFundAddress;          // Address for the LGU fund's share
    address public platformFeeAddress;      // Address for the platform's share
    address public emergencyDevMarketingAddress; // Address for emergency/dev/marketing buffer
    address public operationalFundAddress;  // General fund for quests, DAO, etc.

    // --- Fee Distribution Percentages (Adjusted based on new request for transaction fees) ---
    uint256 private constant LGU_FUND_PERCENTAGE = 10;          // 10%
    uint256 private constant PLATFORM_FEE_PERCENTAGE = 5;       // 5%
    uint256 private constant EMERGENCY_DEV_MARKETING_PERCENTAGE = 5; // 5%
    uint256 private constant OPERATIONAL_FUND_PERCENTAGE = 80;  // 80% (Remaining for Quests, DAO, etc.)
    uint256 private constant TOTAL_PERCENTAGE = 100;            // Total should always be 100%

    // --- User Data Storage (Basic implementation using mappings) ---
    mapping(address => uint256) public userLevels;
    mapping(address => mapping(string => bool)) public userBadges;
    mapping(address => bool) public isRegisteredUser;
    mapping(address => string) public userUsernames;

    // --- Market Value Overview ---
    // Stores the price of 1 whole JDQ token in PHP cents (e.g., 200 for 2 PHP)
    uint256 public tokenPriceInPHP_Cents;
    // Stores the price of 1 whole JDQ token in USD cents (e.g., 4 for $0.04 USD)
    uint256 public tokenPriceInUSD_Cents;

    // --- Daily Faucet / Scheduled Minting ---
    // Amount of USD cents a user can claim daily (e.g., 5 for $0.05 USD)
    uint256 public dailyClaimAmountInUSD_Cents;
    // Mapping to store the last time a user claimed tokens from the faucet
    mapping(address => uint256) public lastClaimTime;
    // Cooldown period for daily claims (e.g., 24 hours in seconds)
    uint256 public constant DAILY_CLAIM_COOLDOWN = 1 days; // 1 day = 24 * 60 * 60 seconds

    // --- Events ---
    event FeeDistributed(address indexed from, uint256 lguAmount, uint256 platformAmount, uint256 emergencyDevMarketingAmount, uint256 operationalAmount);
    event Burnt(address indexed account, uint256 amount); // Keep for general burn function
    event LGUFundAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event PlatformFeeAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event EmergencyDevMarketingAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event OperationalFundAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event UserLevelUpdated(address indexed user, uint256 oldLevel, uint256 newLevel);
    event UserBadgeEarned(address indexed user, string badgeName);
    event UserRegistered(address indexed newUser, uint256 initialLevel);
    event UsernameUpdated(address indexed user, string oldUsername, string newUsername);
    event TokenPriceUpdated(uint256 oldPriceInCents, uint256 newPriceInCents); // Event for PHP price updates
    event TokenPriceInUSDUpdated(uint256 oldPriceInCents, uint256 newPriceInCents); // New event for USD price updates
    event TokensRedeemedForFiat(address indexed redeemer, uint256 tokenAmount, uint256 phpCentsValue); // Event for LGU redemption
    event DailyTokensClaimed(address indexed user, uint256 tokenAmount, uint256 usdCentsValue); // New event for daily claims
    event TaskRewardIssued(address indexed user, uint256 tokenAmount, string taskIdentifier); // New event for task rewards

    /**
     * @dev Constructor to initialize the contract.
     * It mints the initial supply, sets the minimum fee, and configures initial distribution addresses.
     * All parameters are hardcoded within the contract.
     */
    constructor() ERC20(_NAME, _SYMBOL)
    Ownable() {
        // Set hardcoded minimum fee
        _minFee = 10000; // 0.0001 token (10 * 10^9 with 16 decimals)

        // Mint initial supply to the contract deployer (owner)
        _mint(msg.sender, _INITIAL_SUPPLY);

        // Set initial distribution addresses to the deployer.
        // These should be updated by the owner after deployment to actual addresses.
        lguFundAddress = msg.sender;
        platformFeeAddress = msg.sender;
        emergencyDevMarketingAddress = msg.sender;
        operationalFundAddress = msg.sender;

        // Set initial token price: 2 PHP per token (200 cents)
        tokenPriceInPHP_Cents = 200;
        // Set initial token price: $0.04 USD per token (4 cents)
        tokenPriceInUSD_Cents = 4;

        // Set initial daily claim amount: $0.05 USD (5 cents)
        dailyClaimAmountInUSD_Cents = 5;
    }

    /**
     * @dev Overrides the ERC20 name function.
     */
    function name() public view virtual override returns (string memory) {
        return _NAME;
    }

    /**
     * @dev Overrides the ERC20 symbol function.
     */
    function symbol() public view virtual override returns (string memory) {
        return _SYMBOL;
    }

    /**
     * @dev Overrides the ERC20 decimals function to use the hardcoded value.
     */
    function decimals() public view virtual override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @dev Returns the address of the token issuer (contract owner).
     */
    function issuer() public view override returns (address) {
        return owner();
    }

    /**
     * @dev Returns the hardcoded minimum fee.
     */
    function minFee() public view returns (uint256) {
        return _minFee;
    }

    /**
     * @dev Allows the owner to set a new minimum fee.
     * @param newMinFee The new minimum fee value.
     */
    function setMinFee(uint256 newMinFee) public onlyOwner {
        _minFee = newMinFee;
    }

    /**
     * @dev Estimates the transaction fee.
     * The fee calculation is an example: 0.1% of value + minFee.
     * This can be customized by the token issuer.
     * @param value The value of the transaction.
     * @return The estimated fee amount.
     */
    function estimateFee(uint256 value) public view override returns (uint256) {
        // Example: 0.1% of value + minFee
        // value.div(1000) calculates 0.1% of the value.
        return value.div(1000).add(_minFee);
    }

    /**
     * @dev Checks if an account is a contract.
     * @param account The address to check.
     * @return True if the account is a contract, false otherwise.
     */
    function isContract(address account) public view returns (bool) {
        return account.code.length > 0;
    }

    /**
     * @dev Internal function to charge fees from a sender and distribute them.
     * Fees are transferred from the sender and then split according to the defined percentages:
     * 10% to LGU, 5% to Platform, 5% to Emergency/Dev/Marketing, 80% to Operational Fund.
     * Fees are not charged from contracts, as VRC25 gas sponsorship is typically for EOAs.
     * @param sender The address from which the fee is charged.
     * @param totalFeeAmount The total amount of fee to charge.
     */
    function _chargeFeeFrom(address sender, uint256 totalFeeAmount) internal {
        // Do not charge fees from contracts.
        if (isContract(sender)) {
            return;
        }

        if (totalFeeAmount > 0) {
            // Transfer the total fee from the sender to the contract itself first,
            // so the contract holds the funds for distribution.
            // This is a temporary holding before distribution.
            super._transfer(sender, address(this), totalFeeAmount);
            emit Fee(sender, address(this), owner(), totalFeeAmount);

            uint256 lguAmount = totalFeeAmount.mul(LGU_FUND_PERCENTAGE).div(TOTAL_PERCENTAGE);
            uint256 platformAmount = totalFeeAmount.mul(PLATFORM_FEE_PERCENTAGE).div(TOTAL_PERCENTAGE);
            uint256 emergencyDevMarketingAmount = totalFeeAmount.mul(EMERGENCY_DEV_MARKETING_PERCENTAGE).div(TOTAL_PERCENTAGE);
            uint256 operationalAmount = totalFeeAmount.mul(OPERATIONAL_FUND_PERCENTAGE).div(TOTAL_PERCENTAGE);

            // Transfer to LGU fund
            if (lguAmount > 0 && lguFundAddress != address(0)) {
                super._transfer(address(this), lguFundAddress, lguAmount);
            }

            // Transfer to Platform fund
            if (platformAmount > 0 && platformFeeAddress != address(0)) {
                super._transfer(address(this), platformFeeAddress, platformAmount);
            }

            // Transfer to Emergency/Dev/Marketing fund
            if (emergencyDevMarketingAmount > 0 && emergencyDevMarketingAddress != address(0)) {
                super._transfer(address(this), emergencyDevMarketingAddress, emergencyDevMarketingAmount);
            }

            // Transfer to Operational fund (for Quests, DAO, etc.)
            if (operationalAmount > 0 && operationalFundAddress != address(0)) {
                super._transfer(address(this), operationalFundAddress, operationalAmount);
            }

            emit FeeDistributed(sender, lguAmount, platformAmount, emergencyDevMarketingAmount, operationalAmount);
        }
    }

    /**
     * @dev Allows the owner to set the LGU fund's address.
     * @param _lguFundAddress The new address for the LGU fund.
     */
    function setLGUFundAddress(address _lguFundAddress) public onlyOwner {
        require(_lguFundAddress != address(0), "LGUFund: invalid address");
        emit LGUFundAddressUpdated(lguFundAddress, _lguFundAddress);
        lguFundAddress = _lguFundAddress;
    }

    /**
     * @dev Allows the owner to set the Platform Fee address.
     * @param _platformFeeAddress The new address for the platform fee.
     */
    function setPlatformFeeAddress(address _platformFeeAddress) public onlyOwner {
        require(_platformFeeAddress != address(0), "PlatformFee: invalid address");
        emit PlatformFeeAddressUpdated(platformFeeAddress, _platformFeeAddress);
        platformFeeAddress = _platformFeeAddress;
    }

    /**
     * @dev Allows the owner to set the Emergency/Dev/Marketing address.
     * @param _emergencyDevMarketingAddress The new address for the emergency/dev/marketing buffer.
     */
    function setEmergencyDevMarketingAddress(address _emergencyDevMarketingAddress) public onlyOwner {
        require(_emergencyDevMarketingAddress != address(0), "EmergencyDevMarketing: invalid address");
        emit EmergencyDevMarketingAddressUpdated(emergencyDevMarketingAddress, _emergencyDevMarketingAddress);
        emergencyDevMarketingAddress = _emergencyDevMarketingAddress;
    }

    /**
     * @dev Allows the owner to set the Operational Fund address.
     * This address receives the majority of transaction fees and is intended for
     * managing Quest rewards, DAO pool, etc.
     * @param _operationalFundAddress The new address for the operational fund.
     */
    function setOperationalFundAddress(address _operationalFundAddress) public onlyOwner {
        require(_operationalFundAddress != address(0), "OperationalFund: invalid address");
        emit OperationalFundAddressUpdated(operationalFundAddress, _operationalFundAddress);
        operationalFundAddress = _operationalFundAddress;
    }

    // --- User Data Management Functions (Decentralized Access) ---

    /**
     * @dev Allows any user to register themselves.
     * Sets the user's initial level to 1 and marks them as a registered user.
     * @param _username The initial username for the new user.
     */
    function registerUser(string memory _username) public {
        require(msg.sender != address(0), "Register: invalid sender address");
        require(!isRegisteredUser[msg.sender], "Register: user already registered");
        require(bytes(_username).length > 0, "Register: Username cannot be empty");

        userLevels[msg.sender] = 1; // Set initial level to 1
        isRegisteredUser[msg.sender] = true; // Mark as registered
        userUsernames[msg.sender] = _username; // Set initial username

        emit UserRegistered(msg.sender, 1);
        emit UsernameUpdated(msg.sender, "", _username); // Emit username update for initial set
    }

    /**
     * @dev Allows the owner to update a user's level.
     * This could be triggered by an external system after quest completion, etc.
     * This remains owner-only as game progression logic is often centralized.
     * @param user The address of the user.
     * @param newLevel The new level for the user.
     */
    function setUserLevel(address user, uint256 newLevel) public onlyOwner {
        require(user != address(0), "User: invalid address");
        require(isRegisteredUser[user], "User: not a registered user"); // Ensure user is registered
        uint256 oldLevel = userLevels[user];
        userLevels[user] = newLevel;
        emit UserLevelUpdated(user, oldLevel, newLevel);
    }

    /**
     * @dev Allows the owner to grant a badge to a user.
     * This remains owner-only as badge granting logic is often centralized.
     * @param user The address of the user.
     * @param badgeName The name of the badge to grant.
     */
    function grantBadge(address user, string memory badgeName) public onlyOwner {
        require(user != address(0), "User: invalid address");
        require(isRegisteredUser[user], "User: not a registered user"); // Ensure user is registered
        require(!userBadges[user][badgeName], "Badge: user already has this badge");
        userBadges[user][badgeName] = true;
        emit UserBadgeEarned(user, badgeName);
    }

    /**
     * @dev Allows a registered user to set or update their own username.
     * @param newUsername The new username for the caller.
     */
    function setMyUsername(string memory newUsername) public {
        require(isRegisteredUser[msg.sender], "Username: sender not a registered user");
        require(bytes(newUsername).length > 0, "Username: cannot be empty");
        string memory oldUsername = userUsernames[msg.sender];
        userUsernames[msg.sender] = newUsername;
        emit UsernameUpdated(msg.sender, oldUsername, newUsername);
    }

    /**
     * @dev Returns a user's level.
     * @param user The address of the user.
     * @return The user's level. Returns 0 if the user is not registered.
     */
    function getLevel(address user) public view returns (uint256) {
        return userLevels[user];
    }

    /**
     * @dev Checks if a user has a specific badge.
     * @param user The address of the user.
     * @param badgeName The name of the badge to check.
     * @return True if the user has the badge, false otherwise.
     */
    function hasBadge(address user, string memory badgeName) public view returns (bool) {
        return userBadges[user][badgeName];
    }

    /**
     * @dev Returns a user's username.
     * @param user The address of the user.
     * @return The user's username. Returns an empty string if not set.
     */
    function getUsername(address user) public view returns (string memory) {
        return userUsernames[user];
    }
    
    /**
     * @dev Returns a user's current token balance of this ERC20 token.
     * This function is inherited from the ERC20 contract.
     * @param account The address of the user.
     * @return The token balance of the account.
     */
    function getTokenBalance(address account) public view returns (uint256) {
        return balanceOf(account);
    }

    // --- Market Value Overview Functions ---

    /**
     * @dev Allows the owner to set the token's market value in PHP cents.
     * This acts as a centralized oracle for the token's fiat value.
     * @param _newPriceInCents The new price of 1 JDQ token in PHP cents (e.g., 200 for 2 PHP).
     */
    function setTokenPriceInPHP_Cents(uint256 _newPriceInCents) public onlyOwner {
        require(_newPriceInCents > 0, "PHP Price must be greater than zero");
        emit TokenPriceUpdated(tokenPriceInPHP_Cents, _newPriceInCents);
        tokenPriceInPHP_Cents = _newPriceInCents;
    }

    /**
     * @dev Allows the owner to set the token's market value in USD cents.
     * This acts as a centralized oracle for the token's USD value.
     * @param _newPriceInCents The new price of 1 JDQ token in USD cents (e.g., 4 for $0.04 USD).
     */
    function setTokenPriceInUSD_Cents(uint256 _newPriceInCents) public onlyOwner {
        require(_newPriceInCents > 0, "USD Price must be greater than zero");
        emit TokenPriceInUSDUpdated(tokenPriceInUSD_Cents, _newPriceInCents);
        tokenPriceInUSD_Cents = _newPriceInCents;
    }

    /**
     * @dev Returns the current market value of a given amount of tokens in PHP cents.
     * @param _amount The amount of tokens (in token's smallest units, e.g., 10^16 for 1 JDQ).
     * @return The calculated value in PHP cents.
     */
    function getTokenValueInPHP_Cents(uint256 _amount) public view returns (uint256) {
        // To calculate value: (amount_in_token_units / (10^decimals)) * tokenPriceInPHP_Cents
        // This is equivalent to: (amount_in_token_units * tokenPriceInPHP_Cents) / (10^decimals)
        // We use multiplication first to maintain precision, then division.
        // Ensure that _amount * tokenPriceInPHP_Cents does not overflow.
        return _amount.mul(tokenPriceInPHP_Cents).div(10**uint256(decimals()));
    }

    /**
     * @dev Returns the current market value of a given amount of tokens in USD cents.
     * @param _amount The amount of tokens (in token's smallest units, e.g., 10^16 for 1 JDQ).
     * @return The calculated value in USD cents.
     */
    function getTokenValueInUSD_Cents(uint256 _amount) public view returns (uint256) {
        // To calculate value: (amount_in_token_units / (10^decimals)) * tokenPriceInUSD_Cents
        // This is equivalent to: (amount_in_token_units * tokenPriceInUSD_Cents) / (10^decimals)
        // We use multiplication first to maintain precision, then division.
        // Ensure that _amount * tokenPriceInUSD_Cents does not overflow.
        return _amount.mul(tokenPriceInUSD_Cents).div(10**uint256(decimals()));
    }

    /**
     * @dev Allows the LGU fund address to "redeem" JDQ tokens for fiat currency off-chain.
     * This function burns the specified amount of tokens from the LGU's balance
     * and emits an event to signal an off-chain payment.
     * @param _amount The amount of JDQ tokens (in token's smallest units) to redeem.
     */
    function redeemTokensForFiat(uint256 _amount) public {
        // Only the LGU fund address can call this function
        require(msg.sender == lguFundAddress, "Redeem: Only LGU fund address can redeem");
        require(_amount > 0, "Redeem: Amount must be greater than zero");
        require(balanceOf(msg.sender) >= _amount, "Redeem: Insufficient token balance");

        // Calculate the PHP value based on the current market price
        uint256 phpCentsValue = getTokenValueInPHP_Cents(_amount);

        // Burn the tokens from the LGU's balance
        _burn(msg.sender, _amount);

        // Emit an event to signal the off-chain system for fiat payment
        emit TokensRedeemedForFiat(msg.sender, _amount, phpCentsValue);
    }

    // --- Daily Faucet / Scheduled Minting Functions ---

    /**
     * @dev Allows the owner to set the daily token claim amount in USD cents.
     * This determines the fiat value of tokens a user can claim daily.
     * @param _newAmountInCents The new daily claim amount in USD cents (e.g., 5 for $0.05 USD).
     */
    function setDailyClaimAmountInUSD_Cents(uint256 _newAmountInCents) public onlyOwner {
        require(_newAmountInCents > 0, "Daily claim amount must be greater than zero");
        dailyClaimAmountInUSD_Cents = _newAmountInCents;
    }

    /**
     * @dev Allows a registered user to claim their daily token reward.
     * The amount is calculated based on `dailyClaimAmountInUSD_Cents` and `tokenPriceInUSD_Cents`.
     * Can only be called once every `DAILY_CLAIM_COOLDOWN` (1 day) per user.
     */
    function claimDailyTokens() public {
        require(isRegisteredUser[msg.sender], "Claim: User not registered");
        require(block.timestamp >= lastClaimTime[msg.sender].add(DAILY_CLAIM_COOLDOWN), "Claim: Cooldown period not over");
        require(tokenPriceInUSD_Cents > 0, "Claim: Token price not set or is zero");

        // Calculate tokens to mint: (dailyClaimAmountInUSD_Cents * 10^decimals) / tokenPriceInUSD_Cents
        // This ensures the minted amount corresponds to the desired USD value,
        // accounting for the token's decimals.
        uint256 tokensToMint = dailyClaimAmountInUSD_Cents.mul(10**uint256(decimals())).div(tokenPriceInUSD_Cents);
        
        require(tokensToMint > 0, "Claim: Calculated tokens to mint is zero. Adjust daily amount or token price.");

        // Mint tokens to the caller
        _mint(msg.sender, tokensToMint);

        // Update last claim time
        lastClaimTime[msg.sender] = block.timestamp;

        // Emit event
        emit DailyTokensClaimed(msg.sender, tokensToMint, dailyClaimAmountInUSD_Cents);
    }

    // --- Task/Quest Reward Function ---

    /**
     * @dev Allows the contract owner to reward a user with tokens for completing a specific task/quest.
     * Tokens are minted and sent directly to the user.
     * @param _user The address of the user to reward.
     * @param _amount The amount of tokens to reward (in token's smallest units).
     * @param _taskIdentifier A string identifier for the task/quest (e.g., "CompleteLevel1", "DailyLoginBonus").
     */
    function rewardUserForTask(address _user, uint256 _amount, string memory _taskIdentifier) public onlyOwner {
        require(_user != address(0), "Reward: Invalid user address");
        require(isRegisteredUser[_user], "Reward: User not registered");
        require(_amount > 0, "Reward: Amount must be greater than zero");
        require(bytes(_taskIdentifier).length > 0, "Reward: Task identifier cannot be empty");

        // Mint tokens to the specified user
        _mint(_user, _amount);

        // Emit an event to log the reward
        emit TaskRewardIssued(_user, _amount, _taskIdentifier);
    }


    /**
     * @dev Allows burning of tokens by the caller.
     * @param amount The amount of tokens to burn.
     */
    function burn(uint256 amount) public virtual {
        _burn(_msgSender(), amount);
        emit Burnt(_msgSender(), amount);
    }

    /**
     * @dev Allows burning of tokens from another account by the caller,
     * provided the caller has sufficient allowance.
     * @param account The account from which tokens will be burnt.
     * @param amount The amount of tokens to burn.
     */
    function burnFrom(address account, uint256 amount) public virtual {
        uint256 decreasedAllowance = allowance(account, _msgSender()).sub(amount, "ERC20: burn amount exceeds allowance");
        _approve(account, _msgSender(), decreasedAllowance);
        _burn(account, amount);
        emit Burnt(account, amount);
    }

    /**
     * @dev Overrides ERC20 transfer function to include fee charging and distribution.
     * @param recipient The address of the recipient.
     * @param amount The amount of tokens to transfer.
     * @return A boolean indicating whether the transfer was successful.
     */
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        uint256 fee = estimateFee(amount);
        uint256 totalAmount = amount.add(fee);

        require(balanceOf(_msgSender()) >= totalAmount, "VRC25: not enough tokens for transfer and fee");

        _chargeFeeFrom(_msgSender(), fee); // Charge fee and distribute
        super._transfer(_msgSender(), recipient, amount); // Then transfer the actual amount
        return true;
    }

    /**
     * @dev Overrides ERC20 approve function to include fee charging and distribution.
     * @param spender The address to approve.
     * @param amount The amount to approve.
     * @return A boolean indicating whether the approval was successful.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        uint256 fee = estimateFee(0); // Fee for approval is usually based on 0 value
        require(balanceOf(_msgSender()) >= fee, "VRC25: not enough tokens for approval fee");

        _chargeFeeFrom(_msgSender(), fee); // Charge fee and distribute
        super._approve(_msgSender(), spender, amount); // Then perform approval
        return true;
    }

    /**
     * @dev Overrides ERC20 transferFrom function to include fee charging and distribution.
     * @param sender The address from which tokens are transferred.
     * @param recipient The address of the recipient.
     * @param amount The amount of tokens to transfer.
     * @return A boolean indicating whether the transfer was successful.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        uint256 fee = estimateFee(amount);
        uint256 totalAmount = amount.add(fee);

        require(allowance(sender, _msgSender()) >= totalAmount, "VRC25: not enough allowance for transfer and fee");
        require(balanceOf(sender) >= totalAmount, "VRC25: not enough tokens for transfer and fee");

        _chargeFeeFrom(sender, fee); // Charge fee and distribute from sender
        super._transfer(sender, recipient, amount); // Transfer the actual amount

        // Decrease allowance after transferFrom, considering the fee
        super._approve(sender, _msgSender(), allowance(sender, _msgSender()).sub(totalAmount));
        return true;
    }
}