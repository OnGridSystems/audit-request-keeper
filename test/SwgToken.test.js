const {
  BN,
  constants,
  expectEvent,
  shouldFail,
} = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const Token = artifacts.require('SwgToken');

contract('Token', function ([owner, account]) {
  beforeEach(async function () {
    this.token = await Token.new();
  });

  describe('test token initialization', function () {
    it('token name', async function () {
      (await this.token.name()).should.equal('SkyWay Global Token');
    });
    it('token symbol', async function () {
      (await this.token.symbol()).should.equal('SWG');
    });
    it('token symbol', async function () {
      (await this.token.decimals()).should.be.bignumber.equal(new BN('8'));
    });
    it('totalSupply is zero', async function () {
      (await this.token.totalSupply()).should.be.bignumber.equal(new BN('0'));
    });
    it('balanceOf returns zeros', async function () {
      (await this.token.balanceOf(owner))
        .should.be.bignumber.equal(new BN('0'));
      (await this.token.balanceOf(account))
        .should.be.bignumber.equal(new BN('0'));
    });
    it('allowance returns zeros', async function () {
      (await this.token.allowance(owner, account))
        .should.be.bignumber.equal(new BN('0'));
      (await this.token.allowance(account, owner))
        .should.be.bignumber.equal(new BN('0'));
    });
  });

  describe('test approve', function () {
    beforeEach(async function () {
      this.initialAmount = new BN('10');
      await this.token.mint(owner, this.initialAmount);
    });
    it('cant allow ZERO_ADDRESS to spend tokens', async function () {
      await shouldFail.reverting(
        this.token.approve(ZERO_ADDRESS, this.initialAmount)
      );
    });
    it('share some tokens', async function () {
      (await this.token.allowance(owner, account))
        .should.be.bignumber.equal(new BN('0'));
      const { logs } = await this.token.approve(account, this.initialAmount);
      expectEvent.inLogs(
        logs, 'Approval', {
          owner: owner,
          spender: account,
          value: this.initialAmount,
        });
      (await this.token.allowance(owner, account))
        .should.be.bignumber.equal(this.initialAmount);
    });
  });

  describe('test increaseAllowance', function () {
    beforeEach(async function () {
      this.initialAmount = new BN('10');
      await this.token.mint(owner, this.initialAmount);
    });
    it('increase amount of shared tokens', async function () {
      const amount = new BN('4');
      await this.token.approve(account, amount);
      const { logs } = await this.token.increaseAllowance(
        account, this.initialAmount.sub(amount)
      );
      expectEvent.inLogs(
        logs, 'Approval', {
          owner: owner,
          spender: account,
          value: this.initialAmount,
        }
      );
      (await this.token.allowance(owner, account))
        .should.be.bignumber.equal(this.initialAmount);
    });
  });

  describe('test decreaseAllowance', function () {
    beforeEach(async function () {
      this.initialAmount = new BN('10');
      await this.token.mint(owner, this.initialAmount);
    });
    it('decrease amount of shared tokens', async function () {
      const amount = new BN('4');
      await this.token.approve(account, this.initialAmount);
      const { logs } = await this.token.decreaseAllowance(account, amount);
      expectEvent.inLogs(
        logs, 'Approval', {
          owner: owner,
          spender: account,
          value: this.initialAmount.sub(amount),
        }
      );
      (await this.token.allowance(owner, account))
        .should.be.bignumber.equal(this.initialAmount.sub(amount));
    });
  });

  describe('test transfer', function () {
    beforeEach(async function () {
      this.initialAmount = new BN('10');
      await this.token.mint(owner, this.initialAmount);
    });
    it('transfer some tokens', async function () {
      const amount = new BN('4');
      const { logs } = await this.token.transfer(account, amount);
      expectEvent.inLogs(
        logs, 'Transfer', {
          from: owner,
          to: account,
          value: amount,
        }
      );
      (await this.token.balanceOf(account))
        .should.be.bignumber.equal(amount);
      (await this.token.balanceOf(owner))
        .should.be.bignumber.equal(this.initialAmount.sub(amount));
    });
  });

  describe('test transferFrom', function () {
    beforeEach(async function () {
      this.initialAmount = new BN('10');
      await this.token.mint(owner, this.initialAmount);
    });
    it('transfer some allowed tokens from other account', async function () {
      await this.token.approve(account, this.initialAmount);
      const { logs } = await this.token.transferFrom(
        owner,
        account,
        this.initialAmount,
        { from: account }
      );
      expectEvent.inLogs(
        logs, 'Transfer', {
          from: owner,
          to: account,
          value: this.initialAmount,
        }
      );
      (await this.token.allowance(owner, account))
        .should.be.bignumber.equal(new BN('0'));
      (await this.token.balanceOf(account))
        .should.be.bignumber.equal(this.initialAmount);
    });
  });

  describe('test token minting', function () {
    it('cant mint to ZERO_ADDRESS', async function () {
      await shouldFail.reverting(
        this.token.mint(ZERO_ADDRESS, new BN('10'))
      );
    });
    it('cant mint 0 tokens', async function () {
      await shouldFail.reverting(
        this.token.mint(owner, new BN('0'))
      );
    });
    it('mint to some account', async function () {
      const amount = new BN('10');
      await this.token.mint(owner, amount);
      (await this.token.totalSupply()).should.be.bignumber.equal(amount);
      (await this.token.balanceOf(owner)).should.be.bignumber.equal(amount);
    });
  });

  describe('test token burning', function () {
    beforeEach(async function () {
      this.initialAmount = new BN('10');
      await this.token.mint(owner, this.initialAmount);
    });
    it('burn some tokens', async function () {
      const amount = new BN('4');
      await this.token.burn(amount);
      (await this.token.totalSupply()).should.be.bignumber.equal(
        this.initialAmount.sub(amount)
      );
      (await this.token.balanceOf(owner))
        .should.be.bignumber.equal(this.initialAmount.sub(amount));
    });
  });

  describe('test burnFrom', function () {
    beforeEach(async function () {
      this.initialAmount = new BN('10');
      await this.token.mint(owner, this.initialAmount);
    });
    it('burn some shared tokens', async function () {
      await this.token.approve(account, this.initialAmount);
      const { logs } = await this.token.burnFrom(
        owner,
        this.initialAmount,
        { from: account }
      );
      expectEvent.inLogs(
        logs, 'Transfer', {
          from: owner,
          to: ZERO_ADDRESS,
          value: this.initialAmount,
        }
      );
      expectEvent.inLogs(
        logs, 'Approval', {
          owner: owner,
          spender: account,
          value: new BN('0'),
        }
      );
      (await this.token.balanceOf(owner))
        .should.be.bignumber.equal(new BN('0'));
      (await this.token.allowance(owner, account))
        .should.be.bignumber.equal(new BN('0'));
    });
  });
});
