// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package bindings

import (
	"context"
	"errors"
	"math/big"
	"strings"
	"time"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
	_ = time.Tick
	_ = context.Background
)

// RegistryMetaData contains all meta data concerning the Registry contract.
var RegistryMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[{\"internalType\":\"contractIERC20\",\"name\":\"token_\",\"type\":\"address\"}],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"AlreadyRegistered\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"CheckpointUnorderedInsertion\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"EscrowAlreadySet\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"blockNumber\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"currentBlock\",\"type\":\"uint256\"}],\"name\":\"FutureLookup\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"NoRequestToCancel\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"NoTokenBalance\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"caller\",\"type\":\"address\"}],\"name\":\"NotDeployer\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"NotEligible\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"caller\",\"type\":\"address\"}],\"name\":\"NotEscrow\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"NotRegistered\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"bool\",\"name\":\"ready\",\"type\":\"bool\"}],\"name\":\"ReadyUnchanged\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"uint8\",\"name\":\"bits\",\"type\":\"uint8\"},{\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"}],\"name\":\"SafeCastOverflowedUintDowncast\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"ZeroAddress\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"escrow\",\"type\":\"address\"}],\"name\":\"EscrowSet\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"bool\",\"name\":\"ready\",\"type\":\"bool\"}],\"name\":\"ReadyChanged\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"Registered\",\"type\":\"event\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"},{\"internalType\":\"uint64\",\"name\":\"proofTag\",\"type\":\"uint64\"}],\"name\":\"canRequestWith\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"currentTag\",\"outputs\":[{\"internalType\":\"uint64\",\"name\":\"\",\"type\":\"uint64\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"escrow\",\"outputs\":[{\"internalType\":\"address\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"hasParticipated\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"isReady\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"isRegistered\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"readyCount\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"blockNumber\",\"type\":\"uint256\"}],\"name\":\"readyCountAt\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"recordCancel\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"recordParticipation\",\"outputs\":[{\"internalType\":\"uint64\",\"name\":\"tag\",\"type\":\"uint64\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"},{\"internalType\":\"uint64\",\"name\":\"proofTag\",\"type\":\"uint64\"}],\"name\":\"recordRequest\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"register\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"registeredCount\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"blockNumber\",\"type\":\"uint256\"}],\"name\":\"registeredCountAt\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"requestCount\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"}],\"name\":\"revokeParticipation\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"escrow_\",\"type\":\"address\"}],\"name\":\"setEscrow\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"bool\",\"name\":\"ready\",\"type\":\"bool\"}],\"name\":\"setReady\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"token\",\"outputs\":[{\"internalType\":\"contractIERC20\",\"name\":\"\",\"type\":\"address\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"blockNumber\",\"type\":\"uint256\"}],\"name\":\"wasReadyAt\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"member\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"blockNumber\",\"type\":\"uint256\"}],\"name\":\"wasRegisteredAt\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"view\",\"type\":\"function\"}]",
	Bin: "0x60c060405234801561000f575f5ffd5b506040516125e33803806125e383398181016040528101906100319190610173565b5f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603610096576040517fd92e233d00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b8073ffffffffffffffffffffffffffffffffffffffff1660808173ffffffffffffffffffffffffffffffffffffffff16815250503373ffffffffffffffffffffffffffffffffffffffff1660a08173ffffffffffffffffffffffffffffffffffffffff16815250505061019e565b5f5ffd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f61013182610108565b9050919050565b5f61014282610127565b9050919050565b61015281610138565b811461015c575f5ffd5b50565b5f8151905061016d81610149565b92915050565b5f6020828403121561018857610187610104565b5b5f6101958482850161015f565b91505092915050565b60805160a05161241d6101c65f395f610acd01525f8181610f1201526115bd015261241d5ff3fe608060405234801561000f575f5ffd5b5060043610610135575f3560e01c8063b4fb3ee3116100b6578063debb9d281161007a578063debb9d281461036f578063e2fdcc171461039f578063f0bff5fc146103bd578063f15d4ec5146103ed578063f1f23c3b1461041d578063fc0c546a1461043957610135565b8063b4fb3ee3146102bb578063c10c3546146102eb578063c3c5a54714610307578063d50d482214610337578063db3b35f61461035357610135565b80635f33de27116100fd5780635f33de27146101f157806381025afd14610221578063a0f54a921461023f578063a450d83b1461025b578063ab6ea09c1461028b57610135565b80631aa3a00814610139578063210ff9bb146101435780632c2b28a0146101615780633552f5a41461019157806336cdeff6146101c1575b5f5ffd5b610141610457565b005b61014b6105ab565b6040516101589190611d64565b60405180910390f35b61017b60048036038101906101769190611e05565b6105d7565b6040516101889190611e5d565b60405180910390f35b6101ab60048036038101906101a69190611e76565b610656565b6040516101b89190611e5d565b60405180910390f35b6101db60048036038101906101d69190611ea1565b6106c2565b6040516101e89190611d64565b60405180910390f35b61020b60048036038101906102069190611ea1565b610702565b6040516102189190611d64565b60405180910390f35b610229610742565b6040516102369190611d64565b60405180910390f35b61025960048036038101906102549190611f09565b61076e565b005b61027560048036038101906102709190611e05565b610977565b6040516102829190611e5d565b60405180910390f35b6102a560048036038101906102a09190611e76565b610a04565b6040516102b29190611f56565b60405180910390f35b6102d560048036038101906102d09190611e76565b610a6d565b6040516102e29190611e5d565b60405180910390f35b61030560048036038101906103009190611e76565b610acb565b005b610321600480360381019061031c9190611e76565b610cca565b60405161032e9190611e5d565b60405180910390f35b610351600480360381019061034c9190611e76565b610d1e565b005b61036d60048036038101906103689190611f99565b610e2a565b005b61038960048036038101906103849190611e76565b6110fa565b6040516103969190611d64565b60405180910390f35b6103a7611156565b6040516103b49190611fd3565b60405180910390f35b6103d760048036038101906103d29190611f09565b61117a565b6040516103e49190611e5d565b60405180910390f35b61040760048036038101906104029190611e76565b61128b565b6040516104149190611f56565b60405180910390f35b61043760048036038101906104329190611e76565b611419565b005b6104416115bb565b60405161044e9190612047565b60405180910390f35b5f60015f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900460ff16156104e957336040517f45ed80e90000000000000000000000000000000000000000000000000000000081526004016104e09190611fd3565b60405180910390fd5b6001815f015f6101000a81548160ff02191690831515021790555061050c6115df565b815f0160016101000a81548165ffffffffffff021916908365ffffffffffff16021790555061056361053c6115df565b600161054860046115ee565b61055291906120b2565b60046116509092919063ffffffff16565b50503373ffffffffffffffffffffffffffffffffffffffff167f2d3734a8e47ac8316e500ac231c90a6e1848ca2285f40d07eaa52005e4b3a0e960405160405180910390a250565b5f6105b660046115ee565b79ffffffffffffffffffffffffffffffffffffffffffffffffffff16905090565b5f60016106316105e68461166b565b60025f8773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206116c290919063ffffffff16565b79ffffffffffffffffffffffffffffffffffffffffffffffffffff1614905092915050565b5f600161069e60025f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206115ee565b79ffffffffffffffffffffffffffffffffffffffffffffffffffff16149050919050565b5f6106df6106cf8361166b565b60036116c290919063ffffffff16565b79ffffffffffffffffffffffffffffffffffffffffffffffffffff169050919050565b5f61071f61070f8361166b565b60046116c290919063ffffffff16565b79ffffffffffffffffffffffffffffffffffffffffffffffffffff169050919050565b5f61074d60036115ee565b79ffffffffffffffffffffffffffffffffffffffffffffffffffff16905090565b5f5f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146107fe57336040517f088fb38a0000000000000000000000000000000000000000000000000000000081526004016107f59190611fd3565b60405180910390fd5b610808828261117a565b61084957816040517f3a1c15450000000000000000000000000000000000000000000000000000000081526004016108409190611fd3565b60405180910390fd5b5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f0160119054906101000a900463ffffffff16815f0160156101000a81548163ffffffff021916908363ffffffff1602179055506001815f01600d8282829054906101000a900463ffffffff166108e1919061210e565b92506101000a81548163ffffffff021916908363ffffffff160217905550805f01600d9054906101000a900463ffffffff16815f0160116101000a81548163ffffffff021916908363ffffffff1602179055506001815f0160078282829054906101000a900462ffffff166109569190612153565b92506101000a81548162ffffff021916908362ffffff160217905550505050565b5f6109818261166b565b505f60015f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900460ff1680156109fb575082815f0160019054906101000a900465ffffffffffff1665ffffffffffff1611155b91505092915050565b5f6001805f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f01600d9054906101000a900463ffffffff1663ffffffff16610a669190612189565b9050919050565b5f5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f01600a9054906101000a900462ffffff1662ffffff16119050919050565b7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610b5b57336040517f0c8cc036000000000000000000000000000000000000000000000000000000008152600401610b529190611fd3565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff165f5f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614610be0576040517f8ee0acc000000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603610c45576040517fd92e233d00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b805f5f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508073ffffffffffffffffffffffffffffffffffffffff167fa585aec3a6cb0e1a084ed18c7638024e40cc3e3ea815166e2cb6fc17d7f1392b60405160405180910390a250565b5f60015f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f015f9054906101000a900460ff169050919050565b5f5f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610dae57336040517f088fb38a000000000000000000000000000000000000000000000000000000008152600401610da59190611fd3565b60405180910390fd5b6001805f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f01600a8282829054906101000a900462ffffff16610e0b91906121c4565b92506101000a81548162ffffff021916908362ffffff16021790555050565b60015f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f015f9054906101000a900460ff16610eb757336040517fbfc6c337000000000000000000000000000000000000000000000000000000008152600401610eae9190611fd3565b60405180910390fd5b610ec033610656565b151581151503610f0757806040517fe8476893000000000000000000000000000000000000000000000000000000008152600401610efe9190611e5d565b60405180910390fd5b808015610faa57505f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff166370a08231336040518263ffffffff1660e01b8152600401610f699190611fd3565b602060405180830381865afa158015610f84573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610fa8919061220e565b145b15610fec57336040517f25723252000000000000000000000000000000000000000000000000000000008152600401610fe39190611fd3565b60405180910390fd5b5f610ff56115df565b90506110588183611006575f611009565b60015b60ff1660025f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f206116509092919063ffffffff16565b50506110a6818361107e57600161106f60036115ee565b6110799190612239565b611095565b600161108a60036115ee565b61109491906120b2565b5b60036116509092919063ffffffff16565b50503373ffffffffffffffffffffffffffffffffffffffff167f48bb182cc3077cac68b79f38c16e58a8df9b95cfb3e38e05bcaaf57d7f32bb5b836040516110ee9190611e5d565b60405180910390a25050565b5f60015f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f0160079054906101000a900462ffffff1662ffffff169050919050565b5f5f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b5f5f60015f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900460ff166111d8575f915050611285565b5f815f0160079054906101000a900462ffffff1662ffffff1603611200576001915050611285565b5f8367ffffffffffffffff160361121a575f915050611285565b5f6001846112289190612286565b9050815f0160119054906101000a900463ffffffff1663ffffffff168167ffffffffffffffff16101580156112805750815f01600d9054906101000a900463ffffffff1663ffffffff168167ffffffffffffffff1611155b925050505b92915050565b5f5f5f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461131c57336040517f088fb38a0000000000000000000000000000000000000000000000000000000081526004016113139190611fd3565b60405180910390fd5b5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f209050805f015f9054906101000a900460ff166113ad57826040517fbfc6c3370000000000000000000000000000000000000000000000000000000081526004016113a49190611fd3565b60405180910390fd5b6001815f01600a8282829054906101000a900462ffffff166113cf9190612153565b92506101000a81548162ffffff021916908362ffffff1602179055506001815f01600d9054906101000a900463ffffffff1663ffffffff166114119190612189565b915050919050565b5f5f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146114a957336040517f088fb38a0000000000000000000000000000000000000000000000000000000081526004016114a09190611fd3565b60405180910390fd5b5f60015f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2090505f815f0160079054906101000a900462ffffff1662ffffff160361154457816040517f5e4fa4c800000000000000000000000000000000000000000000000000000000815260040161153b9190611fd3565b60405180910390fd5b6001815f0160078282829054906101000a900462ffffff1661156691906121c4565b92506101000a81548162ffffff021916908362ffffff160217905550805f0160159054906101000a900463ffffffff16815f0160116101000a81548163ffffffff021916908363ffffffff1602179055505050565b7f000000000000000000000000000000000000000000000000000000000000000081565b5f6115e9436117b2565b905090565b5f5f825f018054905090505f811461164657611618835f0160018361161391906122c1565b61180b565b5f0160069054906101000a900479ffffffffffffffffffffffffffffffffffffffffffffffffffff16611648565b5f5b915050919050565b5f5f61165f855f01858561181d565b91509150935093915050565b5f4382106116b25781436040517f7f07449b0000000000000000000000000000000000000000000000000000000081526004016116a99291906122f4565b60405180910390fd5b6116bb826117b2565b9050919050565b5f5f835f018054905090505f5f90505f8290506005831115611746575f6116e884611b11565b846116f391906122c1565b9050611701875f018261180b565b5f015f9054906101000a900465ffffffffffff1665ffffffffffff168665ffffffffffff16101561173457809150611744565b600181611741919061231b565b92505b505b5f611755875f01878585611cab565b90505f81146117a457611776875f0160018361177191906122c1565b61180b565b5f0160069054906101000a900479ffffffffffffffffffffffffffffffffffffffffffffffffffff166117a6565b5f5b94505050505092915050565b5f65ffffffffffff8016821115611803576030826040517f6dfcc6500000000000000000000000000000000000000000000000000000000081526004016117fa929190612393565b60405180910390fd5b819050919050565b5f825f528160205f2001905092915050565b5f5f5f858054905090505f811115611a29575f6118468760018461184191906122c1565b61180b565b90505f815f015f9054906101000a900465ffffffffffff1690505f825f0160069054906101000a900479ffffffffffffffffffffffffffffffffffffffffffffffffffff1690508765ffffffffffff168265ffffffffffff1611156118d7576040517f2520601d00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b8765ffffffffffff168265ffffffffffff16036119415786835f0160066101000a81548179ffffffffffffffffffffffffffffffffffffffffffffffffffff021916908379ffffffffffffffffffffffffffffffffffffffffffffffffffff160217905550611a1a565b8860405180604001604052808a65ffffffffffff1681526020018979ffffffffffffffffffffffffffffffffffffffffffffffffffff16815250908060018154018082558091505060019003905f5260205f20015f909190919091505f820151815f015f6101000a81548165ffffffffffff021916908365ffffffffffff1602179055506020820151815f0160066101000a81548179ffffffffffffffffffffffffffffffffffffffffffffffffffff021916908379ffffffffffffffffffffffffffffffffffffffffffffffffffff16021790555050505b80879550955050505050611b09565b8560405180604001604052808765ffffffffffff1681526020018679ffffffffffffffffffffffffffffffffffffffffffffffffffff16815250908060018154018082558091505060019003905f5260205f20015f909190919091505f820151815f015f6101000a81548165ffffffffffff021916908365ffffffffffff1602179055506020820151815f0160066101000a81548179ffffffffffffffffffffffffffffffffffffffffffffffffffff021916908379ffffffffffffffffffffffffffffffffffffffffffffffffffff16021790555050505f8492509250505b935093915050565b5f60018211611b2257819050611ca6565b5f8290505f600190507001000000000000000000000000000000008210611b5257608082901c9150604081901b90505b680100000000000000008210611b7157604082901c9150602081901b90505b6401000000008210611b8c57602082901c9150601081901b90505b620100008210611ba557601082901c9150600881901b90505b6101008210611bbd57600882901c9150600481901b90505b60108210611bd457600482901c9150600281901b90505b60048210611be457600181901b90505b600181600302901c90506001818581611c0057611bff6123ba565b5b048201901c90506001818581611c1957611c186123ba565b5b048201901c90506001818581611c3257611c316123ba565b5b048201901c90506001818581611c4b57611c4a6123ba565b5b048201901c90506001818581611c6457611c636123ba565b5b048201901c90506001818581611c7d57611c7c6123ba565b5b048201901c9050611c9f818581611c9757611c966123ba565b5b048211611d20565b8103925050505b919050565b5f5b81831015611d15575f611cc08484611d2b565b90508465ffffffffffff16611cd5878361180b565b5f015f9054906101000a900465ffffffffffff1665ffffffffffff161115611cff57809250611d0f565b600181611d0c919061231b565b93505b50611cad565b819050949350505050565b5f8115159050919050565b5f600282841881611d3f57611d3e6123ba565b5b0482841601905092915050565b5f819050919050565b611d5e81611d4c565b82525050565b5f602082019050611d775f830184611d55565b92915050565b5f5ffd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f611daa82611d81565b9050919050565b611dba81611da0565b8114611dc4575f5ffd5b50565b5f81359050611dd581611db1565b92915050565b611de481611d4c565b8114611dee575f5ffd5b50565b5f81359050611dff81611ddb565b92915050565b5f5f60408385031215611e1b57611e1a611d7d565b5b5f611e2885828601611dc7565b9250506020611e3985828601611df1565b9150509250929050565b5f8115159050919050565b611e5781611e43565b82525050565b5f602082019050611e705f830184611e4e565b92915050565b5f60208284031215611e8b57611e8a611d7d565b5b5f611e9884828501611dc7565b91505092915050565b5f60208284031215611eb657611eb5611d7d565b5b5f611ec384828501611df1565b91505092915050565b5f67ffffffffffffffff82169050919050565b611ee881611ecc565b8114611ef2575f5ffd5b50565b5f81359050611f0381611edf565b92915050565b5f5f60408385031215611f1f57611f1e611d7d565b5b5f611f2c85828601611dc7565b9250506020611f3d85828601611ef5565b9150509250929050565b611f5081611ecc565b82525050565b5f602082019050611f695f830184611f47565b92915050565b611f7881611e43565b8114611f82575f5ffd5b50565b5f81359050611f9381611f6f565b92915050565b5f60208284031215611fae57611fad611d7d565b5b5f611fbb84828501611f85565b91505092915050565b611fcd81611da0565b82525050565b5f602082019050611fe65f830184611fc4565b92915050565b5f819050919050565b5f61200f61200a61200584611d81565b611fec565b611d81565b9050919050565b5f61202082611ff5565b9050919050565b5f61203182612016565b9050919050565b61204181612027565b82525050565b5f60208201905061205a5f830184612038565b92915050565b5f79ffffffffffffffffffffffffffffffffffffffffffffffffffff82169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6120bc82612060565b91506120c783612060565b9250828201905079ffffffffffffffffffffffffffffffffffffffffffffffffffff8111156120f9576120f8612085565b5b92915050565b5f63ffffffff82169050919050565b5f612118826120ff565b9150612123836120ff565b9250828201905063ffffffff81111561213f5761213e612085565b5b92915050565b5f62ffffff82169050919050565b5f61215d82612145565b915061216883612145565b9250828201905062ffffff81111561218357612182612085565b5b92915050565b5f61219382611ecc565b915061219e83611ecc565b9250828201905067ffffffffffffffff8111156121be576121bd612085565b5b92915050565b5f6121ce82612145565b91506121d983612145565b9250828203905062ffffff8111156121f4576121f3612085565b5b92915050565b5f8151905061220881611ddb565b92915050565b5f6020828403121561222357612222611d7d565b5b5f612230848285016121fa565b91505092915050565b5f61224382612060565b915061224e83612060565b9250828203905079ffffffffffffffffffffffffffffffffffffffffffffffffffff8111156122805761227f612085565b5b92915050565b5f61229082611ecc565b915061229b83611ecc565b9250828203905067ffffffffffffffff8111156122bb576122ba612085565b5b92915050565b5f6122cb82611d4c565b91506122d683611d4c565b92508282039050818111156122ee576122ed612085565b5b92915050565b5f6040820190506123075f830185611d55565b6123146020830184611d55565b9392505050565b5f61232582611d4c565b915061233083611d4c565b925082820190508082111561234857612347612085565b5b92915050565b5f819050919050565b5f60ff82169050919050565b5f61237d6123786123738461234e565b611fec565b612357565b9050919050565b61238d81612363565b82525050565b5f6040820190506123a65f830185612384565b6123b36020830184611d55565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffdfea2646970667358221220d1f8350c80e8fcde2380c99a00ed0c0e7a5d602bbce1e617e2e3af675953e13564736f6c63430008250033",
}

// RegistryABI is the input ABI used to generate the binding from.
// Deprecated: Use RegistryMetaData.ABI instead.
var RegistryABI = RegistryMetaData.ABI

// RegistryBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use RegistryMetaData.Bin instead.
var RegistryBin = RegistryMetaData.Bin

// DeployRegistry deploys a new Ethereum contract, binding an instance of Registry to it.
func DeployRegistry(auth *bind.TransactOpts, backend bind.ContractBackend, token_ common.Address) (common.Address, *types.Transaction, *Registry, error) {
	parsed, err := RegistryMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(RegistryBin), backend, token_)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &Registry{RegistryCaller: RegistryCaller{contract: contract}, RegistryTransactor: RegistryTransactor{contract: contract}, RegistryFilterer: RegistryFilterer{contract: contract}}, nil
}

// Registry is an auto generated Go binding around an Ethereum contract.
type Registry struct {
	RegistryCaller     // Read-only binding to the contract
	RegistryTransactor // Write-only binding to the contract
	RegistryFilterer   // Log filterer for contract events
}

// RegistryCaller is an auto generated read-only Go binding around an Ethereum contract.
type RegistryCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RegistryTransactor is an auto generated write-only Go binding around an Ethereum contract.
type RegistryTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RegistryFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type RegistryFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// RegistrySession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type RegistrySession struct {
	Contract     *Registry         // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// RegistryCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type RegistryCallerSession struct {
	Contract *RegistryCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts   // Call options to use throughout this session
}

// RegistryTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type RegistryTransactorSession struct {
	Contract     *RegistryTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts   // Transaction auth options to use throughout this session
}

// RegistryRaw is an auto generated low-level Go binding around an Ethereum contract.
type RegistryRaw struct {
	Contract *Registry // Generic contract binding to access the raw methods on
}

// RegistryCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type RegistryCallerRaw struct {
	Contract *RegistryCaller // Generic read-only contract binding to access the raw methods on
}

// RegistryTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type RegistryTransactorRaw struct {
	Contract *RegistryTransactor // Generic write-only contract binding to access the raw methods on
}

// NewRegistry creates a new instance of Registry, bound to a specific deployed contract.
func NewRegistry(address common.Address, backend bind.ContractBackend) (*Registry, error) {
	contract, err := bindRegistry(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &Registry{RegistryCaller: RegistryCaller{contract: contract}, RegistryTransactor: RegistryTransactor{contract: contract}, RegistryFilterer: RegistryFilterer{contract: contract}}, nil
}

// NewRegistryCaller creates a new read-only instance of Registry, bound to a specific deployed contract.
func NewRegistryCaller(address common.Address, caller bind.ContractCaller) (*RegistryCaller, error) {
	contract, err := bindRegistry(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &RegistryCaller{contract: contract}, nil
}

// NewRegistryTransactor creates a new write-only instance of Registry, bound to a specific deployed contract.
func NewRegistryTransactor(address common.Address, transactor bind.ContractTransactor) (*RegistryTransactor, error) {
	contract, err := bindRegistry(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &RegistryTransactor{contract: contract}, nil
}

// NewRegistryFilterer creates a new log filterer instance of Registry, bound to a specific deployed contract.
func NewRegistryFilterer(address common.Address, filterer bind.ContractFilterer) (*RegistryFilterer, error) {
	contract, err := bindRegistry(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &RegistryFilterer{contract: contract}, nil
}

// bindRegistry binds a generic wrapper to an already deployed contract.
func bindRegistry(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := RegistryMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Registry *RegistryRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Registry.Contract.RegistryCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Registry *RegistryRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Registry.Contract.RegistryTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Registry *RegistryRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Registry.Contract.RegistryTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_Registry *RegistryCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _Registry.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_Registry *RegistryTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Registry.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_Registry *RegistryTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _Registry.Contract.contract.Transact(opts, method, params...)
}

// CanRequestWith is a free data retrieval call binding the contract method 0xf0bff5fc.
//
// Solidity: function canRequestWith(address member, uint64 proofTag) view returns(bool)
func (_Registry *RegistryCaller) CanRequestWith(opts *bind.CallOpts, member common.Address, proofTag uint64) (bool, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "canRequestWith", member, proofTag)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// CanRequestWith is a free data retrieval call binding the contract method 0xf0bff5fc.
//
// Solidity: function canRequestWith(address member, uint64 proofTag) view returns(bool)
func (_Registry *RegistrySession) CanRequestWith(member common.Address, proofTag uint64) (bool, error) {
	return _Registry.Contract.CanRequestWith(&_Registry.CallOpts, member, proofTag)
}

// CanRequestWith is a free data retrieval call binding the contract method 0xf0bff5fc.
//
// Solidity: function canRequestWith(address member, uint64 proofTag) view returns(bool)
func (_Registry *RegistryCallerSession) CanRequestWith(member common.Address, proofTag uint64) (bool, error) {
	return _Registry.Contract.CanRequestWith(&_Registry.CallOpts, member, proofTag)
}

// CurrentTag is a free data retrieval call binding the contract method 0xab6ea09c.
//
// Solidity: function currentTag(address member) view returns(uint64)
func (_Registry *RegistryCaller) CurrentTag(opts *bind.CallOpts, member common.Address) (uint64, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "currentTag", member)

	if err != nil {
		return *new(uint64), err
	}

	out0 := *abi.ConvertType(out[0], new(uint64)).(*uint64)

	return out0, err

}

// CurrentTag is a free data retrieval call binding the contract method 0xab6ea09c.
//
// Solidity: function currentTag(address member) view returns(uint64)
func (_Registry *RegistrySession) CurrentTag(member common.Address) (uint64, error) {
	return _Registry.Contract.CurrentTag(&_Registry.CallOpts, member)
}

// CurrentTag is a free data retrieval call binding the contract method 0xab6ea09c.
//
// Solidity: function currentTag(address member) view returns(uint64)
func (_Registry *RegistryCallerSession) CurrentTag(member common.Address) (uint64, error) {
	return _Registry.Contract.CurrentTag(&_Registry.CallOpts, member)
}

// Escrow is a free data retrieval call binding the contract method 0xe2fdcc17.
//
// Solidity: function escrow() view returns(address)
func (_Registry *RegistryCaller) Escrow(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "escrow")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Escrow is a free data retrieval call binding the contract method 0xe2fdcc17.
//
// Solidity: function escrow() view returns(address)
func (_Registry *RegistrySession) Escrow() (common.Address, error) {
	return _Registry.Contract.Escrow(&_Registry.CallOpts)
}

// Escrow is a free data retrieval call binding the contract method 0xe2fdcc17.
//
// Solidity: function escrow() view returns(address)
func (_Registry *RegistryCallerSession) Escrow() (common.Address, error) {
	return _Registry.Contract.Escrow(&_Registry.CallOpts)
}

// HasParticipated is a free data retrieval call binding the contract method 0xb4fb3ee3.
//
// Solidity: function hasParticipated(address member) view returns(bool)
func (_Registry *RegistryCaller) HasParticipated(opts *bind.CallOpts, member common.Address) (bool, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "hasParticipated", member)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// HasParticipated is a free data retrieval call binding the contract method 0xb4fb3ee3.
//
// Solidity: function hasParticipated(address member) view returns(bool)
func (_Registry *RegistrySession) HasParticipated(member common.Address) (bool, error) {
	return _Registry.Contract.HasParticipated(&_Registry.CallOpts, member)
}

// HasParticipated is a free data retrieval call binding the contract method 0xb4fb3ee3.
//
// Solidity: function hasParticipated(address member) view returns(bool)
func (_Registry *RegistryCallerSession) HasParticipated(member common.Address) (bool, error) {
	return _Registry.Contract.HasParticipated(&_Registry.CallOpts, member)
}

// IsReady is a free data retrieval call binding the contract method 0x3552f5a4.
//
// Solidity: function isReady(address member) view returns(bool)
func (_Registry *RegistryCaller) IsReady(opts *bind.CallOpts, member common.Address) (bool, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "isReady", member)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsReady is a free data retrieval call binding the contract method 0x3552f5a4.
//
// Solidity: function isReady(address member) view returns(bool)
func (_Registry *RegistrySession) IsReady(member common.Address) (bool, error) {
	return _Registry.Contract.IsReady(&_Registry.CallOpts, member)
}

// IsReady is a free data retrieval call binding the contract method 0x3552f5a4.
//
// Solidity: function isReady(address member) view returns(bool)
func (_Registry *RegistryCallerSession) IsReady(member common.Address) (bool, error) {
	return _Registry.Contract.IsReady(&_Registry.CallOpts, member)
}

// IsRegistered is a free data retrieval call binding the contract method 0xc3c5a547.
//
// Solidity: function isRegistered(address member) view returns(bool)
func (_Registry *RegistryCaller) IsRegistered(opts *bind.CallOpts, member common.Address) (bool, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "isRegistered", member)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// IsRegistered is a free data retrieval call binding the contract method 0xc3c5a547.
//
// Solidity: function isRegistered(address member) view returns(bool)
func (_Registry *RegistrySession) IsRegistered(member common.Address) (bool, error) {
	return _Registry.Contract.IsRegistered(&_Registry.CallOpts, member)
}

// IsRegistered is a free data retrieval call binding the contract method 0xc3c5a547.
//
// Solidity: function isRegistered(address member) view returns(bool)
func (_Registry *RegistryCallerSession) IsRegistered(member common.Address) (bool, error) {
	return _Registry.Contract.IsRegistered(&_Registry.CallOpts, member)
}

// ReadyCount is a free data retrieval call binding the contract method 0x81025afd.
//
// Solidity: function readyCount() view returns(uint256)
func (_Registry *RegistryCaller) ReadyCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "readyCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// ReadyCount is a free data retrieval call binding the contract method 0x81025afd.
//
// Solidity: function readyCount() view returns(uint256)
func (_Registry *RegistrySession) ReadyCount() (*big.Int, error) {
	return _Registry.Contract.ReadyCount(&_Registry.CallOpts)
}

// ReadyCount is a free data retrieval call binding the contract method 0x81025afd.
//
// Solidity: function readyCount() view returns(uint256)
func (_Registry *RegistryCallerSession) ReadyCount() (*big.Int, error) {
	return _Registry.Contract.ReadyCount(&_Registry.CallOpts)
}

// ReadyCountAt is a free data retrieval call binding the contract method 0x36cdeff6.
//
// Solidity: function readyCountAt(uint256 blockNumber) view returns(uint256)
func (_Registry *RegistryCaller) ReadyCountAt(opts *bind.CallOpts, blockNumber *big.Int) (*big.Int, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "readyCountAt", blockNumber)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// ReadyCountAt is a free data retrieval call binding the contract method 0x36cdeff6.
//
// Solidity: function readyCountAt(uint256 blockNumber) view returns(uint256)
func (_Registry *RegistrySession) ReadyCountAt(blockNumber *big.Int) (*big.Int, error) {
	return _Registry.Contract.ReadyCountAt(&_Registry.CallOpts, blockNumber)
}

// ReadyCountAt is a free data retrieval call binding the contract method 0x36cdeff6.
//
// Solidity: function readyCountAt(uint256 blockNumber) view returns(uint256)
func (_Registry *RegistryCallerSession) ReadyCountAt(blockNumber *big.Int) (*big.Int, error) {
	return _Registry.Contract.ReadyCountAt(&_Registry.CallOpts, blockNumber)
}

// RegisteredCount is a free data retrieval call binding the contract method 0x210ff9bb.
//
// Solidity: function registeredCount() view returns(uint256)
func (_Registry *RegistryCaller) RegisteredCount(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "registeredCount")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// RegisteredCount is a free data retrieval call binding the contract method 0x210ff9bb.
//
// Solidity: function registeredCount() view returns(uint256)
func (_Registry *RegistrySession) RegisteredCount() (*big.Int, error) {
	return _Registry.Contract.RegisteredCount(&_Registry.CallOpts)
}

// RegisteredCount is a free data retrieval call binding the contract method 0x210ff9bb.
//
// Solidity: function registeredCount() view returns(uint256)
func (_Registry *RegistryCallerSession) RegisteredCount() (*big.Int, error) {
	return _Registry.Contract.RegisteredCount(&_Registry.CallOpts)
}

// RegisteredCountAt is a free data retrieval call binding the contract method 0x5f33de27.
//
// Solidity: function registeredCountAt(uint256 blockNumber) view returns(uint256)
func (_Registry *RegistryCaller) RegisteredCountAt(opts *bind.CallOpts, blockNumber *big.Int) (*big.Int, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "registeredCountAt", blockNumber)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// RegisteredCountAt is a free data retrieval call binding the contract method 0x5f33de27.
//
// Solidity: function registeredCountAt(uint256 blockNumber) view returns(uint256)
func (_Registry *RegistrySession) RegisteredCountAt(blockNumber *big.Int) (*big.Int, error) {
	return _Registry.Contract.RegisteredCountAt(&_Registry.CallOpts, blockNumber)
}

// RegisteredCountAt is a free data retrieval call binding the contract method 0x5f33de27.
//
// Solidity: function registeredCountAt(uint256 blockNumber) view returns(uint256)
func (_Registry *RegistryCallerSession) RegisteredCountAt(blockNumber *big.Int) (*big.Int, error) {
	return _Registry.Contract.RegisteredCountAt(&_Registry.CallOpts, blockNumber)
}

// RequestCount is a free data retrieval call binding the contract method 0xdebb9d28.
//
// Solidity: function requestCount(address member) view returns(uint256)
func (_Registry *RegistryCaller) RequestCount(opts *bind.CallOpts, member common.Address) (*big.Int, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "requestCount", member)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// RequestCount is a free data retrieval call binding the contract method 0xdebb9d28.
//
// Solidity: function requestCount(address member) view returns(uint256)
func (_Registry *RegistrySession) RequestCount(member common.Address) (*big.Int, error) {
	return _Registry.Contract.RequestCount(&_Registry.CallOpts, member)
}

// RequestCount is a free data retrieval call binding the contract method 0xdebb9d28.
//
// Solidity: function requestCount(address member) view returns(uint256)
func (_Registry *RegistryCallerSession) RequestCount(member common.Address) (*big.Int, error) {
	return _Registry.Contract.RequestCount(&_Registry.CallOpts, member)
}

// Token is a free data retrieval call binding the contract method 0xfc0c546a.
//
// Solidity: function token() view returns(address)
func (_Registry *RegistryCaller) Token(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "token")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// Token is a free data retrieval call binding the contract method 0xfc0c546a.
//
// Solidity: function token() view returns(address)
func (_Registry *RegistrySession) Token() (common.Address, error) {
	return _Registry.Contract.Token(&_Registry.CallOpts)
}

// Token is a free data retrieval call binding the contract method 0xfc0c546a.
//
// Solidity: function token() view returns(address)
func (_Registry *RegistryCallerSession) Token() (common.Address, error) {
	return _Registry.Contract.Token(&_Registry.CallOpts)
}

// WasReadyAt is a free data retrieval call binding the contract method 0x2c2b28a0.
//
// Solidity: function wasReadyAt(address member, uint256 blockNumber) view returns(bool)
func (_Registry *RegistryCaller) WasReadyAt(opts *bind.CallOpts, member common.Address, blockNumber *big.Int) (bool, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "wasReadyAt", member, blockNumber)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// WasReadyAt is a free data retrieval call binding the contract method 0x2c2b28a0.
//
// Solidity: function wasReadyAt(address member, uint256 blockNumber) view returns(bool)
func (_Registry *RegistrySession) WasReadyAt(member common.Address, blockNumber *big.Int) (bool, error) {
	return _Registry.Contract.WasReadyAt(&_Registry.CallOpts, member, blockNumber)
}

// WasReadyAt is a free data retrieval call binding the contract method 0x2c2b28a0.
//
// Solidity: function wasReadyAt(address member, uint256 blockNumber) view returns(bool)
func (_Registry *RegistryCallerSession) WasReadyAt(member common.Address, blockNumber *big.Int) (bool, error) {
	return _Registry.Contract.WasReadyAt(&_Registry.CallOpts, member, blockNumber)
}

// WasRegisteredAt is a free data retrieval call binding the contract method 0xa450d83b.
//
// Solidity: function wasRegisteredAt(address member, uint256 blockNumber) view returns(bool)
func (_Registry *RegistryCaller) WasRegisteredAt(opts *bind.CallOpts, member common.Address, blockNumber *big.Int) (bool, error) {
	var out []interface{}
	err := _Registry.contract.Call(opts, &out, "wasRegisteredAt", member, blockNumber)

	if err != nil {
		return *new(bool), err
	}

	out0 := *abi.ConvertType(out[0], new(bool)).(*bool)

	return out0, err

}

// WasRegisteredAt is a free data retrieval call binding the contract method 0xa450d83b.
//
// Solidity: function wasRegisteredAt(address member, uint256 blockNumber) view returns(bool)
func (_Registry *RegistrySession) WasRegisteredAt(member common.Address, blockNumber *big.Int) (bool, error) {
	return _Registry.Contract.WasRegisteredAt(&_Registry.CallOpts, member, blockNumber)
}

// WasRegisteredAt is a free data retrieval call binding the contract method 0xa450d83b.
//
// Solidity: function wasRegisteredAt(address member, uint256 blockNumber) view returns(bool)
func (_Registry *RegistryCallerSession) WasRegisteredAt(member common.Address, blockNumber *big.Int) (bool, error) {
	return _Registry.Contract.WasRegisteredAt(&_Registry.CallOpts, member, blockNumber)
}

// RecordCancel is a paid mutator transaction binding the contract method 0xf1f23c3b.
//
// Solidity: function recordCancel(address member) returns()
func (_Registry *RegistryTransactor) RecordCancel(opts *bind.TransactOpts, member common.Address) (*types.Transaction, error) {
	return _Registry.contract.Transact(opts, "recordCancel", member)
}

// RecordCancel is a paid mutator transaction binding the contract method 0xf1f23c3b.
//
// Solidity: function recordCancel(address member) returns()
func (_Registry *RegistrySession) RecordCancel(member common.Address) (*types.Transaction, error) {
	return _Registry.Contract.RecordCancel(&_Registry.TransactOpts, member)
}

// RecordCancel is a paid mutator transaction binding the contract method 0xf1f23c3b.
//
// Solidity: function recordCancel(address member) returns()
func (_Registry *RegistryTransactorSession) RecordCancel(member common.Address) (*types.Transaction, error) {
	return _Registry.Contract.RecordCancel(&_Registry.TransactOpts, member)
}

// RecordParticipation is a paid mutator transaction binding the contract method 0xf15d4ec5.
//
// Solidity: function recordParticipation(address member) returns(uint64 tag)
func (_Registry *RegistryTransactor) RecordParticipation(opts *bind.TransactOpts, member common.Address) (*types.Transaction, error) {
	return _Registry.contract.Transact(opts, "recordParticipation", member)
}

// RecordParticipation is a paid mutator transaction binding the contract method 0xf15d4ec5.
//
// Solidity: function recordParticipation(address member) returns(uint64 tag)
func (_Registry *RegistrySession) RecordParticipation(member common.Address) (*types.Transaction, error) {
	return _Registry.Contract.RecordParticipation(&_Registry.TransactOpts, member)
}

// RecordParticipation is a paid mutator transaction binding the contract method 0xf15d4ec5.
//
// Solidity: function recordParticipation(address member) returns(uint64 tag)
func (_Registry *RegistryTransactorSession) RecordParticipation(member common.Address) (*types.Transaction, error) {
	return _Registry.Contract.RecordParticipation(&_Registry.TransactOpts, member)
}

// RecordRequest is a paid mutator transaction binding the contract method 0xa0f54a92.
//
// Solidity: function recordRequest(address member, uint64 proofTag) returns()
func (_Registry *RegistryTransactor) RecordRequest(opts *bind.TransactOpts, member common.Address, proofTag uint64) (*types.Transaction, error) {
	return _Registry.contract.Transact(opts, "recordRequest", member, proofTag)
}

// RecordRequest is a paid mutator transaction binding the contract method 0xa0f54a92.
//
// Solidity: function recordRequest(address member, uint64 proofTag) returns()
func (_Registry *RegistrySession) RecordRequest(member common.Address, proofTag uint64) (*types.Transaction, error) {
	return _Registry.Contract.RecordRequest(&_Registry.TransactOpts, member, proofTag)
}

// RecordRequest is a paid mutator transaction binding the contract method 0xa0f54a92.
//
// Solidity: function recordRequest(address member, uint64 proofTag) returns()
func (_Registry *RegistryTransactorSession) RecordRequest(member common.Address, proofTag uint64) (*types.Transaction, error) {
	return _Registry.Contract.RecordRequest(&_Registry.TransactOpts, member, proofTag)
}

// Register is a paid mutator transaction binding the contract method 0x1aa3a008.
//
// Solidity: function register() returns()
func (_Registry *RegistryTransactor) Register(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _Registry.contract.Transact(opts, "register")
}

// Register is a paid mutator transaction binding the contract method 0x1aa3a008.
//
// Solidity: function register() returns()
func (_Registry *RegistrySession) Register() (*types.Transaction, error) {
	return _Registry.Contract.Register(&_Registry.TransactOpts)
}

// Register is a paid mutator transaction binding the contract method 0x1aa3a008.
//
// Solidity: function register() returns()
func (_Registry *RegistryTransactorSession) Register() (*types.Transaction, error) {
	return _Registry.Contract.Register(&_Registry.TransactOpts)
}

// RevokeParticipation is a paid mutator transaction binding the contract method 0xd50d4822.
//
// Solidity: function revokeParticipation(address member) returns()
func (_Registry *RegistryTransactor) RevokeParticipation(opts *bind.TransactOpts, member common.Address) (*types.Transaction, error) {
	return _Registry.contract.Transact(opts, "revokeParticipation", member)
}

// RevokeParticipation is a paid mutator transaction binding the contract method 0xd50d4822.
//
// Solidity: function revokeParticipation(address member) returns()
func (_Registry *RegistrySession) RevokeParticipation(member common.Address) (*types.Transaction, error) {
	return _Registry.Contract.RevokeParticipation(&_Registry.TransactOpts, member)
}

// RevokeParticipation is a paid mutator transaction binding the contract method 0xd50d4822.
//
// Solidity: function revokeParticipation(address member) returns()
func (_Registry *RegistryTransactorSession) RevokeParticipation(member common.Address) (*types.Transaction, error) {
	return _Registry.Contract.RevokeParticipation(&_Registry.TransactOpts, member)
}

// SetEscrow is a paid mutator transaction binding the contract method 0xc10c3546.
//
// Solidity: function setEscrow(address escrow_) returns()
func (_Registry *RegistryTransactor) SetEscrow(opts *bind.TransactOpts, escrow_ common.Address) (*types.Transaction, error) {
	return _Registry.contract.Transact(opts, "setEscrow", escrow_)
}

// SetEscrow is a paid mutator transaction binding the contract method 0xc10c3546.
//
// Solidity: function setEscrow(address escrow_) returns()
func (_Registry *RegistrySession) SetEscrow(escrow_ common.Address) (*types.Transaction, error) {
	return _Registry.Contract.SetEscrow(&_Registry.TransactOpts, escrow_)
}

// SetEscrow is a paid mutator transaction binding the contract method 0xc10c3546.
//
// Solidity: function setEscrow(address escrow_) returns()
func (_Registry *RegistryTransactorSession) SetEscrow(escrow_ common.Address) (*types.Transaction, error) {
	return _Registry.Contract.SetEscrow(&_Registry.TransactOpts, escrow_)
}

// SetReady is a paid mutator transaction binding the contract method 0xdb3b35f6.
//
// Solidity: function setReady(bool ready) returns()
func (_Registry *RegistryTransactor) SetReady(opts *bind.TransactOpts, ready bool) (*types.Transaction, error) {
	return _Registry.contract.Transact(opts, "setReady", ready)
}

// SetReady is a paid mutator transaction binding the contract method 0xdb3b35f6.
//
// Solidity: function setReady(bool ready) returns()
func (_Registry *RegistrySession) SetReady(ready bool) (*types.Transaction, error) {
	return _Registry.Contract.SetReady(&_Registry.TransactOpts, ready)
}

// SetReady is a paid mutator transaction binding the contract method 0xdb3b35f6.
//
// Solidity: function setReady(bool ready) returns()
func (_Registry *RegistryTransactorSession) SetReady(ready bool) (*types.Transaction, error) {
	return _Registry.Contract.SetReady(&_Registry.TransactOpts, ready)
}

// RegistryEscrowSetIterator is returned from FilterEscrowSet and is used to iterate over the raw logs and unpacked data for EscrowSet events raised by the Registry contract.
type RegistryEscrowSetIterator struct {
	Event *RegistryEscrowSet // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *RegistryEscrowSetIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RegistryEscrowSet)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(RegistryEscrowSet)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *RegistryEscrowSetIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RegistryEscrowSetIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RegistryEscrowSet represents a EscrowSet event raised by the Registry contract.
type RegistryEscrowSet struct {
	Escrow common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterEscrowSet is a free log retrieval operation binding the contract event 0xa585aec3a6cb0e1a084ed18c7638024e40cc3e3ea815166e2cb6fc17d7f1392b.
//
// Solidity: event EscrowSet(address indexed escrow)
func (_Registry *RegistryFilterer) FilterEscrowSet(opts *bind.FilterOpts, escrow []common.Address) (*RegistryEscrowSetIterator, error) {

	var escrowRule []interface{}
	for _, escrowItem := range escrow {
		escrowRule = append(escrowRule, escrowItem)
	}

	logs, sub, err := _Registry.contract.FilterLogs(opts, "EscrowSet", escrowRule)
	if err != nil {
		return nil, err
	}
	return &RegistryEscrowSetIterator{contract: _Registry.contract, event: "EscrowSet", logs: logs, sub: sub}, nil
}

// WatchEscrowSet is a free log subscription operation binding the contract event 0xa585aec3a6cb0e1a084ed18c7638024e40cc3e3ea815166e2cb6fc17d7f1392b.
//
// Solidity: event EscrowSet(address indexed escrow)
func (_Registry *RegistryFilterer) WatchEscrowSet(opts *bind.WatchOpts, sink chan<- *RegistryEscrowSet, escrow []common.Address) (event.Subscription, error) {

	var escrowRule []interface{}
	for _, escrowItem := range escrow {
		escrowRule = append(escrowRule, escrowItem)
	}

	logs, sub, err := _Registry.contract.WatchLogs(opts, "EscrowSet", escrowRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RegistryEscrowSet)
				if err := _Registry.contract.UnpackLog(event, "EscrowSet", log); err != nil {
					// If the signature doesn't match, skip this log.
					if errors.Is(err, bind.ErrEventSignatureMismatch) {
						continue
					}
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseEscrowSet is a log parse operation binding the contract event 0xa585aec3a6cb0e1a084ed18c7638024e40cc3e3ea815166e2cb6fc17d7f1392b.
//
// Solidity: event EscrowSet(address indexed escrow)
func (_Registry *RegistryFilterer) ParseEscrowSet(log types.Log) (*RegistryEscrowSet, error) {
	event := new(RegistryEscrowSet)
	if err := _Registry.contract.UnpackLog(event, "EscrowSet", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RegistryReadyChangedIterator is returned from FilterReadyChanged and is used to iterate over the raw logs and unpacked data for ReadyChanged events raised by the Registry contract.
type RegistryReadyChangedIterator struct {
	Event *RegistryReadyChanged // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *RegistryReadyChangedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RegistryReadyChanged)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(RegistryReadyChanged)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *RegistryReadyChangedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RegistryReadyChangedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RegistryReadyChanged represents a ReadyChanged event raised by the Registry contract.
type RegistryReadyChanged struct {
	Member common.Address
	Ready  bool
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterReadyChanged is a free log retrieval operation binding the contract event 0x48bb182cc3077cac68b79f38c16e58a8df9b95cfb3e38e05bcaaf57d7f32bb5b.
//
// Solidity: event ReadyChanged(address indexed member, bool ready)
func (_Registry *RegistryFilterer) FilterReadyChanged(opts *bind.FilterOpts, member []common.Address) (*RegistryReadyChangedIterator, error) {

	var memberRule []interface{}
	for _, memberItem := range member {
		memberRule = append(memberRule, memberItem)
	}

	logs, sub, err := _Registry.contract.FilterLogs(opts, "ReadyChanged", memberRule)
	if err != nil {
		return nil, err
	}
	return &RegistryReadyChangedIterator{contract: _Registry.contract, event: "ReadyChanged", logs: logs, sub: sub}, nil
}

// WatchReadyChanged is a free log subscription operation binding the contract event 0x48bb182cc3077cac68b79f38c16e58a8df9b95cfb3e38e05bcaaf57d7f32bb5b.
//
// Solidity: event ReadyChanged(address indexed member, bool ready)
func (_Registry *RegistryFilterer) WatchReadyChanged(opts *bind.WatchOpts, sink chan<- *RegistryReadyChanged, member []common.Address) (event.Subscription, error) {

	var memberRule []interface{}
	for _, memberItem := range member {
		memberRule = append(memberRule, memberItem)
	}

	logs, sub, err := _Registry.contract.WatchLogs(opts, "ReadyChanged", memberRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RegistryReadyChanged)
				if err := _Registry.contract.UnpackLog(event, "ReadyChanged", log); err != nil {
					// If the signature doesn't match, skip this log.
					if errors.Is(err, bind.ErrEventSignatureMismatch) {
						continue
					}
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseReadyChanged is a log parse operation binding the contract event 0x48bb182cc3077cac68b79f38c16e58a8df9b95cfb3e38e05bcaaf57d7f32bb5b.
//
// Solidity: event ReadyChanged(address indexed member, bool ready)
func (_Registry *RegistryFilterer) ParseReadyChanged(log types.Log) (*RegistryReadyChanged, error) {
	event := new(RegistryReadyChanged)
	if err := _Registry.contract.UnpackLog(event, "ReadyChanged", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// RegistryRegisteredIterator is returned from FilterRegistered and is used to iterate over the raw logs and unpacked data for Registered events raised by the Registry contract.
type RegistryRegisteredIterator struct {
	Event *RegistryRegistered // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *RegistryRegisteredIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(RegistryRegistered)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(RegistryRegistered)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *RegistryRegisteredIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *RegistryRegisteredIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// RegistryRegistered represents a Registered event raised by the Registry contract.
type RegistryRegistered struct {
	Member common.Address
	Raw    types.Log // Blockchain specific contextual infos
}

// FilterRegistered is a free log retrieval operation binding the contract event 0x2d3734a8e47ac8316e500ac231c90a6e1848ca2285f40d07eaa52005e4b3a0e9.
//
// Solidity: event Registered(address indexed member)
func (_Registry *RegistryFilterer) FilterRegistered(opts *bind.FilterOpts, member []common.Address) (*RegistryRegisteredIterator, error) {

	var memberRule []interface{}
	for _, memberItem := range member {
		memberRule = append(memberRule, memberItem)
	}

	logs, sub, err := _Registry.contract.FilterLogs(opts, "Registered", memberRule)
	if err != nil {
		return nil, err
	}
	return &RegistryRegisteredIterator{contract: _Registry.contract, event: "Registered", logs: logs, sub: sub}, nil
}

// WatchRegistered is a free log subscription operation binding the contract event 0x2d3734a8e47ac8316e500ac231c90a6e1848ca2285f40d07eaa52005e4b3a0e9.
//
// Solidity: event Registered(address indexed member)
func (_Registry *RegistryFilterer) WatchRegistered(opts *bind.WatchOpts, sink chan<- *RegistryRegistered, member []common.Address) (event.Subscription, error) {

	var memberRule []interface{}
	for _, memberItem := range member {
		memberRule = append(memberRule, memberItem)
	}

	logs, sub, err := _Registry.contract.WatchLogs(opts, "Registered", memberRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(RegistryRegistered)
				if err := _Registry.contract.UnpackLog(event, "Registered", log); err != nil {
					// If the signature doesn't match, skip this log.
					if errors.Is(err, bind.ErrEventSignatureMismatch) {
						continue
					}
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseRegistered is a log parse operation binding the contract event 0x2d3734a8e47ac8316e500ac231c90a6e1848ca2285f40d07eaa52005e4b3a0e9.
//
// Solidity: event Registered(address indexed member)
func (_Registry *RegistryFilterer) ParseRegistered(log types.Log) (*RegistryRegistered, error) {
	event := new(RegistryRegistered)
	if err := _Registry.contract.UnpackLog(event, "Registered", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
