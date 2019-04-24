const { expectEvent, shouldFail } = require('openzeppelin-test-helpers');

const Claimable = artifacts.require('Claimable');

contract('Claimable', function ([owner, account, otherAccount]) {
  beforeEach(async function () {
    this.claimable = await Claimable.new();
  });

  it('should have an owner', async function () {
    (await this.claimable.owner()).should.not.equal(0);
  });

  it('changes pendingOwner after transfer', async function () {
    await this.claimable.transferOwnership(account);
    (await this.claimable.pendingOwner()).should.equal(account);
  });

  it('should prevent to claimOwnership from no pendingOwner',
    async function () {
      await shouldFail.reverting(
        this.claimable.claimOwnership({ from: otherAccount })
      );
    }
  );

  it('should prevent non-owners from transfering', async function () {
    (await this.claimable.owner.call()).should.not.equal(otherAccount);
    await shouldFail.reverting(
      this.claimable.transferOwnership(otherAccount, { from: otherAccount })
    );
  });

  describe('after initiating a transfer', function () {
    beforeEach(async function () {
      await this.claimable.transferOwnership(account);
    });

    it('changes allow pending owner to claim ownership', async function () {
      const { logs } = await this.claimable.claimOwnership({ from: account });
      expectEvent.inLogs(
        logs, 'OwnershipTransferred', {
          previousOwner: owner,
          newOwner: account,
        }
      );
      (await this.claimable.owner()).should.equal(account);
    });
  });
});
