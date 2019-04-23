const { shouldFail } = require('openzeppelin-test-helpers');

const Claimable = artifacts.require('Claimable');

contract('Claimable', function (accounts) {
  let claimable;

  beforeEach(async function () {
    claimable = await Claimable.new();
  });

  it('should have an owner', async function () {
    const owner = await claimable.owner();
    owner.should.not.equal(0);
  });

  it('changes pendingOwner after transfer', async function () {
    const newOwner = accounts[1];
    await claimable.transferOwnership(newOwner);
    const pendingOwner = await claimable.pendingOwner();

    pendingOwner.should.equal(newOwner);
  });

  it('should prevent to claimOwnership from no pendingOwner',
    async function () {
      await shouldFail.reverting(
        claimable.claimOwnership({ from: accounts[2] })
      );
    }
  );

  it('should prevent non-owners from transfering', async function () {
    const other = accounts[2];
    const owner = await claimable.owner.call();

    owner.should.not.equal(other);
    await shouldFail.reverting(
      claimable.transferOwnership(other, { from: other })
    );
  });

  describe('after initiating a transfer', function () {
    let newOwner;

    beforeEach(async function () {
      newOwner = accounts[1];
      await claimable.transferOwnership(newOwner);
    });

    it('changes allow pending owner to claim ownership', async function () {
      await claimable.claimOwnership({ from: newOwner });
      const owner = await claimable.owner();

      owner.should.equal(newOwner);
    });
  });
});
