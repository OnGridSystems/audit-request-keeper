pragma solidity ^0.5.0;

import "./Claimable.sol";
import "../openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";


contract SwgToken is ERC20, ERC20Burnable, Claimable {
    string public name = "SkyWay Global Token";
    string public symbol = "SWG";
    uint8 public decimals = 8;

    /**
     * @dev Function to mint tokens
     * @param to The address that will receive the minted tokens.
     * @param value The amount of tokens to mint.
     * @return A boolean that indicates if the operation was successful.
     */
    function mint(address to, uint256 value) public onlyOwner returns (bool) {
        _mint(to, value);
        return true;
    }
}
