const { shouldFail, BN } = require('openzeppelin-test-helpers');

const Keeper = artifacts.require('Keeper');
const Token = artifacts.require('SwgToken');

contract('Keeper', function ([owner, investor, otherAcct]) {
  beforeEach(async function () {
    this.token = await Token.new();
  });

  describe('locked (now < unFreezeStartDate)', function () {
    beforeEach(async function () {
      this.keeper = await Keeper.new(this.token.address, 1666666666, 1999999999);
      await this.token.mint(this.keeper.address, 500);
      await this.keeper.addBalance(investor, 123);
    });
    describe('checks', function () {
      it('check getUnfrozenAmount', async function () {
        (await this.keeper.getUnfrozenAmount(investor)).should.be.bignumber.equal(new BN('0'));
        (await this.keeper.getUnfrozenAmount(otherAcct)).should.be.bignumber.equal(new BN('0'));
      });
    });
    describe('withdrawals', function () {
      it('unable to withdraw within balance', async function () {
        await shouldFail(this.keeper.withdraw(otherAcct, 12, { from: investor }));
      });
    });
  });

  describe('partially unlocked (unFreezeStartDate < now < totalUnFreezeDate)', function () {
    let unfrozen;
    beforeEach(async function () {
      this.keeper = await Keeper.new(this.token.address, 1444444444, 1666666666);
      await this.token.mint(this.keeper.address, 1234567890);
      await this.keeper.addBalance(investor, 1234567890);
    });
    describe('checks', function () {
      it('check getUnfrozenAmount', async function () {
        unfrozen = await this.keeper.getUnfrozenAmount(investor);
        unfrozen.should.be.bignumber.lessThan(new BN('1234567890'));
        unfrozen.should.be.bignumber.greaterThan(new BN('0'));
      });
    });
  });

  describe('totally unlocked (totalUnFreezeDate < now)', function () {
    beforeEach(async function () {
      this.keeper = await Keeper.new(this.token.address, 1333333333, 1444444444);
      await this.token.mint(this.keeper.address, 500);
      await this.keeper.addBalance(investor, 123);
    });
    describe('checks', function () {
      it('check getUnfrozenAmount', async function () {
        (await this.keeper.getUnfrozenAmount(investor)).should.be.bignumber.equal(new BN('123'));
        (await this.keeper.getUnfrozenAmount(otherAcct)).should.be.bignumber.equal(new BN('0'));
      });
    });
    describe('withdrawals', function () {
      it('able to withdraw within balance', async function () {
        await this.keeper.withdraw(otherAcct, 123, { from: investor });
      });
      it('unable to withdraw more than balance', async function () {
        await shouldFail(this.keeper.withdraw(otherAcct, 124, { from: investor }));
      });
    });
  });
});
