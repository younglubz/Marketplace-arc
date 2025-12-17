const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  let marketplace;
  let nft;
  let owner;
  let seller;
  let buyer;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();

    // Deploy NFT
    const MockNFT = await ethers.getContractFactory("MockNFT");
    nft = await MockNFT.deploy();
    await nft.waitForDeployment();

    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();

    // Minta NFT para o seller
    await nft.connect(seller).mint(seller.address, "ipfs://test-uri");
  });

  describe("Listagem de itens", function () {
    it("Deve listar um NFT com sucesso", async function () {
      const tokenId = 0;
      const price = ethers.parseEther("1");

      // Aprova o marketplace
      await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);

      // Lista o item
      await expect(
        marketplace.connect(seller).listItem(await nft.getAddress(), tokenId, price)
      )
        .to.emit(marketplace, "ItemListed")
        .withArgs(0, seller.address, await nft.getAddress(), tokenId, price);

      // Verifica a listagem
      const listing = await marketplace.getListing(0);
      expect(listing.seller).to.equal(seller.address);
      expect(listing.price).to.equal(price);
      expect(listing.active).to.be.true;
    });

    it("Não deve permitir listar com preço zero", async function () {
      await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
      
      await expect(
        marketplace.connect(seller).listItem(await nft.getAddress(), 0, 0)
      ).to.be.revertedWith("Preco deve ser maior que zero");
    });

    it("Não deve permitir listar NFT de outra pessoa", async function () {
      const price = ethers.parseEther("1");
      
      await expect(
        marketplace.connect(buyer).listItem(await nft.getAddress(), 0, price)
      ).to.be.revertedWith("Voce nao e o dono deste NFT");
    });
  });

  describe("Compra de itens", function () {
    beforeEach(async function () {
      await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(seller).listItem(
        await nft.getAddress(), 
        0, 
        ethers.parseEther("1")
      );
    });

    it("Deve comprar um NFT com sucesso", async function () {
      const price = ethers.parseEther("1");
      
      await expect(
        marketplace.connect(buyer).buyItem(0, { value: price })
      ).to.emit(marketplace, "ItemSold");

      // Verifica que o NFT foi transferido
      expect(await nft.ownerOf(0)).to.equal(buyer.address);

      // Verifica que a listagem foi desativada
      const listing = await marketplace.getListing(0);
      expect(listing.active).to.be.false;
    });

    it("Não deve permitir compra com valor insuficiente", async function () {
      await expect(
        marketplace.connect(buyer).buyItem(0, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Valor insuficiente");
    });

    it("Vendedor não pode comprar seu próprio item", async function () {
      await expect(
        marketplace.connect(seller).buyItem(0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("Vendedor nao pode comprar seu proprio item");
    });
  });

  describe("Cancelamento de listagem", function () {
    beforeEach(async function () {
      await nft.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);
      await marketplace.connect(seller).listItem(
        await nft.getAddress(), 
        0, 
        ethers.parseEther("1")
      );
    });

    it("Vendedor pode cancelar sua listagem", async function () {
      await expect(
        marketplace.connect(seller).cancelListing(0)
      ).to.emit(marketplace, "ListingCancelled").withArgs(0);

      const listing = await marketplace.getListing(0);
      expect(listing.active).to.be.false;
    });

    it("Owner pode cancelar qualquer listagem", async function () {
      await expect(
        marketplace.connect(owner).cancelListing(0)
      ).to.emit(marketplace, "ListingCancelled").withArgs(0);
    });

    it("Usuário sem permissão não pode cancelar", async function () {
      await expect(
        marketplace.connect(buyer).cancelListing(0)
      ).to.be.revertedWith("Sem permissao");
    });
  });

  describe("Taxas do marketplace", function () {
    it("Owner pode atualizar a taxa", async function () {
      const newFee = 500; // 5%
      
      await expect(
        marketplace.connect(owner).updateMarketplaceFee(newFee)
      ).to.emit(marketplace, "MarketplaceFeeUpdated").withArgs(newFee);

      expect(await marketplace.marketplaceFee()).to.equal(newFee);
    });

    it("Taxa não pode exceder 10%", async function () {
      await expect(
        marketplace.connect(owner).updateMarketplaceFee(1001)
      ).to.be.revertedWith("Taxa maxima: 10%");
    });
  });
});

