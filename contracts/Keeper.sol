pragma solidity ^0.5.0;

import "../openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./Claimable.sol";

/**
* @title Keeper
*
* @dev The contract which holds tokens until get unlocked
*/
contract Keeper is Claimable {
    using SafeMath for uint256;
    IERC20 public token;
    // the date when withdrawals become possible
    uint256 public unFreezeStartDate;
    // the date when all funds get unfrozen
    uint256 public totalUnFreezeDate;
    // the records about individual balances
    mapping(address => uint256) public balances;
    // the records about already withdrawn amounts
    mapping(address => uint256) public withdrawnBalances;
    // the sum of registered balance
    uint256 public totalBalance;

    constructor(
        IERC20 _token,
        uint256 _unFreezeStartDate,
        uint256 _totalUnFreezeDate
    ) public {
        // solhint-disable-next-line not-rely-on-time
        require(_unFreezeStartDate >= block.timestamp);
        require(_totalUnFreezeDate > _unFreezeStartDate);
        token = _token;
        unFreezeStartDate = _unFreezeStartDate;
        totalUnFreezeDate = _totalUnFreezeDate;
    }

    function addBalance(address _to, uint256 _value) public onlyOwner {
        require(_to != address(0));
        require(_value > 0);
        require(totalBalance.add(_value)
                <= token.balanceOf(address(this)), "not enough tokens");
        balances[_to] = balances[_to].add(_value);
        totalBalance = totalBalance.add(_value);
    }

    function withdraw(address _to, uint256 _value) public {
        require(_to != address(0));
        require(_value > 0);
        require(unFreezeStartDate < now, "not unfrozen yet");
        require(
            (getUnfrozenAmount(msg.sender).sub(withdrawnBalances[msg.sender]))
            >= _value
        );
        balances[msg.sender] = balances[msg.sender].sub(_value);
        withdrawnBalances[msg.sender] = withdrawnBalances[msg.sender].add(_value);
        totalBalance = totalBalance.sub(_value);
        token.transfer(_to, _value);
    }

    function getUnfrozenAmount(address _holder) public view returns (uint256) {
        if (now > unFreezeStartDate) {
            if (now > totalUnFreezeDate) {
                // tokens are totally unfrozen
                return balances[_holder];
            }
            // tokens are partially unfrozen
            uint256 partialFreezePeriodLen =
                totalUnFreezeDate.sub(unFreezeStartDate);
            uint256 secondsSincePeriodStart = now.sub(unFreezeStartDate);
            uint256 amount = balances[_holder]
                .mul(secondsSincePeriodStart)
                .div(partialFreezePeriodLen);
            return amount;
        }
        // tokens are totally frozen
        return 0;
    }
}
