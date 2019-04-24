const {
  BN,
  constants,
  shouldFail,
  time,
} = require('openzeppelin-test-helpers');
const { ZERO_ADDRESS } = constants;

const Keeper = artifacts.require('Keeper');
const Token = artifacts.require('SwgToken');

contract('Keeper', function ([owner, investor, otherAcct]) {
  // Advance to the next block to correctly read time
  // in the solidity "now" function interpreted by ganache
  before(async function () {
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.startUnfreeze = (await time.latest()).add(time.duration.weeks(1));
    this.totalUnfreeze = this.startUnfreeze.add(time.duration.weeks(1));
    this.afterStartUnfreeze = this.startUnfreeze.add(time.duration.hours(1));
    this.afterTotalUnfreeze = this.totalUnfreeze.add(time.duration.seconds(1));
    this.token = await Token.new();
  });

  it('unFreezeStartDate should be in future', async function () {
    await shouldFail.reverting(
      Keeper.new(
        this.token.address,
        (await time.latest()).sub(time.duration.days(1)),
        this.totalUnfreeze)
    );
  });

  it('totalUnFreezeDate should be more than unFreezeStartDate',
    async function () {
      await shouldFail.reverting(
        Keeper.new(this.token.address, this.totalUnfreeze, this.startUnfreeze)
      );
      await shouldFail.reverting(
        Keeper.new(this.token.address, this.startUnfreeze, this.startUnfreeze)
      );
    }
  );

  describe('test addBalance basic checks', function () {
    beforeEach(async function () {
      this.keeper = await Keeper.new(
        this.token.address, this.startUnfreeze, this.totalUnfreeze
      );
      await this.token.mint(this.keeper.address, new BN('10'));
    });
    it('cant add balance to ZERO_ADDRESS', async function () {
      await shouldFail(this.keeper.addBalance(ZERO_ADDRESS, new BN('10')));
    });
    it('cant increase balance on 0', async function () {
      await shouldFail(this.keeper.addBalance(investor, new BN('0')));
    });
    it('should be enougn unoccupied tokens', async function () {
      await shouldFail(this.keeper.addBalance(investor, new BN('20')));
    });
  });

  describe('test withdraw basic checks', function () {
    beforeEach(async function () {
      this.keeper = await Keeper.new(
        this.token.address, this.startUnfreeze, this.totalUnfreeze
      );
      await this.token.mint(this.keeper.address, new BN('10'));
      await this.keeper.addBalance(investor, new BN('10'));
    });
    it('cant withdraw to ZERO_ADDRESS', async function () {
      await shouldFail(
        this.keeper.withdraw(ZERO_ADDRESS, new BN('10'), { from: investor })
      );
    });
    it('cant withdraw 0 tokens', async function () {
      await shouldFail(
        this.keeper.withdraw(otherAcct, new BN('0'), { from: investor })
      );
    });
  });

  describe('all funds are frozen yet', function () {
    beforeEach(async function () {
      this.keeper = await Keeper.new(
        this.token.address, this.startUnfreeze, this.totalUnfreeze
      );
      await this.token.mint(this.keeper.address, new BN('500'));
      await this.keeper.addBalance(investor, new BN('123'));
    });
    describe('test getUnfrozenAmount', function () {
      it('no unfrozen funds', async function () {
        (await this.keeper.getUnfrozenAmount(investor))
          .should.be.bignumber.equal(new BN('0'));
        (await this.keeper.getUnfrozenAmount(otherAcct))
          .should.be.bignumber.equal(new BN('0'));
      });
    });
    describe('test withdraw', function () {
      it('unable to withdraw frozen funds', async function () {
        await shouldFail(
          this.keeper.withdraw(otherAcct, new BN('12'), { from: investor })
        );
      });
    });
  });

  describe('funds are partially unfrozen', function () {
    let unfrozen;
    beforeEach(async function () {
      this.keeper = await Keeper.new(
        this.token.address, this.startUnfreeze, this.totalUnfreeze
      );
      await this.token.mint(this.keeper.address, new BN('1234567890'));
      await this.keeper.addBalance(investor, new BN('1234567890'));
      await time.increaseTo(this.afterStartUnfreeze);
    });
    describe('test getUnfrozenAmount', function () {
      it('some funds are accessible', async function () {
        unfrozen = await this.keeper.getUnfrozenAmount(investor);
        unfrozen.should.be.bignumber.equal(new BN('7348618'));
      });
    });
    describe('test withdraw', function () {
      it('unable to withdraw more than unfrozen funds', async function () {
        await shouldFail.reverting(
          this.keeper.withdraw(
            otherAcct, new BN('7348619'), { from: investor }
          )
        );
      });
      it('able to withdraw within unfrozen funds', async function () {
        await this.keeper.withdraw(
          otherAcct, new BN('7348618'), { from: investor }
        );
      });
      it('unable to withdraw any more without waiting', async function () {
        await this.keeper.withdraw(
          otherAcct, new BN('7348618'), { from: investor }
        );
        await shouldFail.reverting(
          this.keeper.withdraw(otherAcct, new BN('1'), { from: investor })
        );
      });
      it('but can withdraw some after small wait', async function () {
        await this.keeper.withdraw(
          otherAcct, new BN('7348618'), { from: investor }
        );
        await time.increase(time.duration.hours(1));
        await this.keeper.withdraw(
          otherAcct, new BN('1'), { from: investor }
        );
      });
    });
  });

  describe('funds totally unfrozen', function () {
    beforeEach(async function () {
      this.keeper = await Keeper.new(
        this.token.address, this.startUnfreeze, this.totalUnfreeze
      );
      await this.token.mint(this.keeper.address, new BN('500'));
      await this.keeper.addBalance(investor, new BN('123'));
      await time.increaseTo(this.afterTotalUnfreeze);
    });
    describe('test getUnfrozenAmount', function () {
      it('can withdrawal funds within balance', async function () {
        (await this.keeper.getUnfrozenAmount(investor))
          .should.be.bignumber.equal(new BN('123'));
        (await this.keeper.getUnfrozenAmount(otherAcct))
          .should.be.bignumber.equal(new BN('0'));
      });
    });
    describe('test withdraw', function () {
      it('able to withdraw within balance', async function () {
        await this.keeper.withdraw(
          otherAcct, new BN('123'), { from: investor }
        );
      });
      it('unable to withdraw more than balance', async function () {
        await shouldFail(
          this.keeper.withdraw(otherAcct, new BN('124'), { from: investor })
        );
      });
    });
  });
});
