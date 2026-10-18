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

// WhitzardTokenMetaData contains all meta data concerning the WhitzardToken contract.
var WhitzardTokenMetaData = &bind.MetaData{
	ABI: "[{\"inputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"inputs\":[],\"name\":\"ECDSAInvalidSignature\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"length\",\"type\":\"uint256\"}],\"name\":\"ECDSAInvalidSignatureLength\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"bytes32\",\"name\":\"s\",\"type\":\"bytes32\"}],\"name\":\"ECDSAInvalidSignatureS\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"spender\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"allowance\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"needed\",\"type\":\"uint256\"}],\"name\":\"ERC20InsufficientAllowance\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"sender\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"balance\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"needed\",\"type\":\"uint256\"}],\"name\":\"ERC20InsufficientBalance\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"approver\",\"type\":\"address\"}],\"name\":\"ERC20InvalidApprover\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"receiver\",\"type\":\"address\"}],\"name\":\"ERC20InvalidReceiver\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"sender\",\"type\":\"address\"}],\"name\":\"ERC20InvalidSender\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"spender\",\"type\":\"address\"}],\"name\":\"ERC20InvalidSpender\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"deadline\",\"type\":\"uint256\"}],\"name\":\"ERC2612ExpiredSignature\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"signer\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"}],\"name\":\"ERC2612InvalidSigner\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"FaucetCapReached\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"nextClaimAt\",\"type\":\"uint256\"}],\"name\":\"FaucetCooldown\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"currentNonce\",\"type\":\"uint256\"}],\"name\":\"InvalidAccountNonce\",\"type\":\"error\"},{\"inputs\":[],\"name\":\"InvalidShortString\",\"type\":\"error\"},{\"inputs\":[{\"internalType\":\"string\",\"name\":\"str\",\"type\":\"string\"}],\"name\":\"StringTooLong\",\"type\":\"error\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"spender\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"}],\"name\":\"Approval\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[],\"name\":\"EIP712DomainChanged\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"amount\",\"type\":\"uint256\"}],\"name\":\"FaucetClaimed\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"indexed\":true,\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"indexed\":false,\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"}],\"name\":\"Transfer\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"DOMAIN_SEPARATOR\",\"outputs\":[{\"internalType\":\"bytes32\",\"name\":\"\",\"type\":\"bytes32\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"FAUCET_AMOUNT\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"FAUCET_COOLDOWN\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"FAUCET_LIFETIME_CAP\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"spender\",\"type\":\"address\"}],\"name\":\"allowance\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"spender\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"}],\"name\":\"approve\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"balanceOf\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"claimedTotal\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"decimals\",\"outputs\":[{\"internalType\":\"uint8\",\"name\":\"\",\"type\":\"uint8\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"eip712Domain\",\"outputs\":[{\"internalType\":\"bytes1\",\"name\":\"fields\",\"type\":\"bytes1\"},{\"internalType\":\"string\",\"name\":\"name\",\"type\":\"string\"},{\"internalType\":\"string\",\"name\":\"version\",\"type\":\"string\"},{\"internalType\":\"uint256\",\"name\":\"chainId\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"verifyingContract\",\"type\":\"address\"},{\"internalType\":\"bytes32\",\"name\":\"salt\",\"type\":\"bytes32\"},{\"internalType\":\"uint256[]\",\"name\":\"extensions\",\"type\":\"uint256[]\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"faucet\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"name\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"account\",\"type\":\"address\"}],\"name\":\"nextClaimAt\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"}],\"name\":\"nonces\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"spender\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"deadline\",\"type\":\"uint256\"},{\"internalType\":\"uint8\",\"name\":\"v\",\"type\":\"uint8\"},{\"internalType\":\"bytes32\",\"name\":\"r\",\"type\":\"bytes32\"},{\"internalType\":\"bytes32\",\"name\":\"s\",\"type\":\"bytes32\"}],\"name\":\"permit\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"symbol\",\"outputs\":[{\"internalType\":\"string\",\"name\":\"\",\"type\":\"string\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[],\"name\":\"totalSupply\",\"outputs\":[{\"internalType\":\"uint256\",\"name\":\"\",\"type\":\"uint256\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"}],\"name\":\"transfer\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"value\",\"type\":\"uint256\"}],\"name\":\"transferFrom\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]",
	Bin: "0x610160604052348015610010575f5ffd5b506040518060400160405280600881526020017f576869747a617264000000000000000000000000000000000000000000000000815250806040518060400160405280600181526020017f31000000000000000000000000000000000000000000000000000000000000008152506040518060400160405280600881526020017f576869747a6172640000000000000000000000000000000000000000000000008152506040518060400160405280600481526020017f57485a440000000000000000000000000000000000000000000000000000000081525081600390816100f991906104bf565b50806004908161010991906104bf565b50505061011b826101b260201b60201c565b6101208181525050610132816101b260201b60201c565b6101408181525050818051906020012060e08181525050808051906020012061010081815250504660a0818152505061016f61021760201b60201c565b608081815250503073ffffffffffffffffffffffffffffffffffffffff1660c08173ffffffffffffffffffffffffffffffffffffffff168152505050505061075e565b5f5f829050601f815111156101fe57826040517f305a27a90000000000000000000000000000000000000000000000000000000081526004016101f591906105f4565b60405180910390fd5b80518161020a9061064a565b5f1c175f1b915050919050565b5f7f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60e05161010051463060405160200161025695949392919061070d565b60405160208183030381529060405280519060200120905090565b5f81519050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f60028204905060018216806102ec57607f821691505b6020821081036102ff576102fe6102a8565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026103617fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610326565b61036b8683610326565b95508019841693508086168417925050509392505050565b5f819050919050565b5f819050919050565b5f6103af6103aa6103a584610383565b61038c565b610383565b9050919050565b5f819050919050565b6103c883610395565b6103dc6103d4826103b6565b848454610332565b825550505050565b5f5f905090565b6103f36103e4565b6103fe8184846103bf565b505050565b5f5b82811015610424576104195f8284016103eb565b600181019050610405565b505050565b601f82111561047757828211156104765761044381610305565b61044c83610317565b61045585610317565b6020861015610462575f90505b80830161047182840382610403565b505050505b5b505050565b5f82821c905092915050565b5f6104975f198460080261047c565b1980831691505092915050565b5f6104af8383610488565b9150826002028217905092915050565b6104c882610271565b67ffffffffffffffff8111156104e1576104e061027b565b5b6104eb82546102d5565b6104f6828285610429565b5f60209050601f831160018114610527575f8415610515578287015190505b61051f85826104a4565b865550610586565b601f19841661053586610305565b5f5b8281101561055c57848901518255600182019150602085019450602081019050610537565b868310156105795784890151610575601f891682610488565b8355505b6001600288020188555050505b505050505050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f6105c682610271565b6105d0818561058e565b93506105e081856020860161059e565b6105e9816105ac565b840191505092915050565b5f6020820190508181035f83015261060c81846105bc565b905092915050565b5f81519050919050565b5f819050602082019050919050565b5f819050919050565b5f610641825161062d565b80915050919050565b5f61065482610614565b8261065e8461061e565b905061066981610636565b925060208210156106a9576106a47fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff83602003600802610326565b831692505b5050919050565b6106b98161062d565b82525050565b6106c881610383565b82525050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6106f7826106ce565b9050919050565b610707816106ed565b82525050565b5f60a0820190506107205f8301886106b0565b61072d60208301876106b0565b61073a60408301866106b0565b61074760608301856106bf565b61075460808301846106fe565b9695505050505050565b60805160a05160c05160e051610100516101205161014051611ee56107af5f395f610daa01525f610d7a01525f61131901525f6112f801525f610c7a01525f610cd001525f610cf90152611ee55ff3fe608060405234801561000f575f5ffd5b506004361061011f575f3560e01c80637d1d5d19116100ab578063ae6643ab1161006f578063ae6643ab14610339578063d505accf14610357578063dd62ed3e14610373578063de5f72fd146103a3578063ea66b875146103ad5761011f565b80637d1d5d19146102795780637ecebe001461029757806384b0196e146102c757806395d89b41146102eb578063a9059cbb146103095761011f565b806323b872dd116100f257806323b872dd146101bf578063313ce567146101ef5780633644e5151461020d57806370a082311461022b578063766976401461025b5761011f565b806306fdde0314610123578063095ea7b31461014157806311a163e91461017157806318160ddd146101a1575b5f5ffd5b61012b6103dd565b6040516101389190611722565b60405180910390f35b61015b600480360381019061015691906117d3565b61046d565b604051610168919061182b565b60405180910390f35b61018b60048036038101906101869190611844565b61048f565b604051610198919061187e565b60405180910390f35b6101a96104a4565b6040516101b6919061187e565b60405180910390f35b6101d960048036038101906101d49190611897565b6104ad565b6040516101e6919061182b565b60405180910390f35b6101f76104db565b6040516102049190611902565b60405180910390f35b6102156104e3565b6040516102229190611933565b60405180910390f35b61024560048036038101906102409190611844565b6104f1565b604051610252919061187e565b60405180910390f35b610263610536565b604051610270919061187e565b60405180910390f35b610281610543565b60405161028e919061187e565b60405180910390f35b6102b160048036038101906102ac9190611844565b61054a565b6040516102be919061187e565b60405180910390f35b6102cf61055b565b6040516102e29796959493929190611a4c565b60405180910390f35b6102f3610600565b6040516103009190611722565b60405180910390f35b610323600480360381019061031e91906117d3565b610690565b604051610330919061182b565b60405180910390f35b6103416106b2565b60405161034e919061187e565b60405180910390f35b610371600480360381019061036c9190611b22565b6106bf565b005b61038d60048036038101906103889190611bbf565b610804565b60405161039a919061187e565b60405180910390f35b6103ab610886565b005b6103c760048036038101906103c29190611844565b610ac6565b6040516103d4919061187e565b60405180910390f35b6060600380546103ec90611c2a565b80601f016020809104026020016040519081016040528092919081815260200182805461041890611c2a565b80156104635780601f1061043a57610100808354040283529160200191610463565b820191905f5260205f20905b81548152906001019060200180831161044657829003601f168201915b5050505050905090565b5f5f610477610adb565b9050610484818585610ae2565b600191505092915050565b6009602052805f5260405f205f915090505481565b5f600254905090565b5f5f6104b7610adb565b90506104c4858285610af4565b6104cf858585610b87565b60019150509392505050565b5f6012905090565b5f6104ec610c77565b905090565b5f5f5f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050919050565b68056bc75e2d6310000081565b6201518081565b5f61055482610d2d565b9050919050565b5f6060805f5f5f606061056c610d73565b610574610da3565b46305f5f1b5f67ffffffffffffffff81111561059357610592611c5a565b5b6040519080825280602002602001820160405280156105c15781602001602082028036833780820191505090505b507f0f00000000000000000000000000000000000000000000000000000000000000959493929190965096509650965096509650965090919293949596565b60606004805461060f90611c2a565b80601f016020809104026020016040519081016040528092919081815260200182805461063b90611c2a565b80156106865780601f1061065d57610100808354040283529160200191610686565b820191905f5260205f20905b81548152906001019060200180831161066957829003601f168201915b5050505050905090565b5f5f61069a610adb565b90506106a7818585610b87565b600191505092915050565b683635c9adc5dea0000081565b8342111561070457836040517f627913020000000000000000000000000000000000000000000000000000000081526004016106fb919061187e565b60405180910390fd5b5f7f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c98888886107328c610dd3565b8960405160200161074896959493929190611c87565b6040516020818303038152906040528051906020012090505f61076a82610e26565b90505f61077982878787610e3f565b90508973ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16146107ed57808a6040517f4b800e460000000000000000000000000000000000000000000000000000000081526004016107e4929190611ce6565b60405180910390fd5b6107f88a8a8a610ae2565b50505050505050505050565b5f60015f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905092915050565b5f60095f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205490508042101561090c57806040517f12272bab000000000000000000000000000000000000000000000000000000008152600401610903919061187e565b60405180910390fd5b5f60085f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050683635c9adc5dea00000811061098f576040517f6cb0e82a00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f81683635c9adc5dea000006109a59190611d3a565b90505f68056bc75e2d6310000082106109c75768056bc75e2d631000006109c9565b815b905080836109d79190611d6d565b60085f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20819055506201518042610a279190611d6d565b60095f3373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550610a723382610e6d565b3373ffffffffffffffffffffffffffffffffffffffff167f5d4f415c63cd8a5874d9d291cdd64cec37e5dc236d90d659c958d109d78074b382604051610ab8919061187e565b60405180910390a250505050565b6008602052805f5260405f205f915090505481565b5f33905090565b610aef8383836001610eec565b505050565b5f610aff8484610804565b90507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff811015610b815781811015610b72578281836040517ffb8f41b2000000000000000000000000000000000000000000000000000000008152600401610b6993929190611da0565b60405180910390fd5b610b8084848484035f610eec565b5b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610bf7575f6040517f96c6fd1e000000000000000000000000000000000000000000000000000000008152600401610bee9190611dd5565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610c67575f6040517fec442f05000000000000000000000000000000000000000000000000000000008152600401610c5e9190611dd5565b60405180910390fd5b610c728383836110bb565b505050565b5f7f000000000000000000000000000000000000000000000000000000000000000073ffffffffffffffffffffffffffffffffffffffff163073ffffffffffffffffffffffffffffffffffffffff16148015610cf257507f000000000000000000000000000000000000000000000000000000000000000046145b15610d1f577f00000000000000000000000000000000000000000000000000000000000000009050610d2a565b610d276112d4565b90505b90565b5f60075f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f20549050919050565b6060610d9e7f0000000000000000000000000000000000000000000000000000000000000000611369565b905090565b6060610dce7f0000000000000000000000000000000000000000000000000000000000000000611369565b905090565b5f60075f8373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f815480929190600101919050559050919050565b5f610e38610e32610c77565b836113db565b9050919050565b5f5f5f5f610e4f8888888861141b565b925092509250610e5f8282611502565b829350505050949350505050565b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603610edd575f6040517fec442f05000000000000000000000000000000000000000000000000000000008152600401610ed49190611dd5565b60405180910390fd5b610ee85f83836110bb565b5050565b5f73ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff1603610f5c575f6040517fe602df05000000000000000000000000000000000000000000000000000000008152600401610f539190611dd5565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1603610fcc575f6040517f94280d62000000000000000000000000000000000000000000000000000000008152600401610fc39190611dd5565b60405180910390fd5b8160015f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f208190555080156110b5578273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925846040516110ac919061187e565b60405180910390a35b50505050565b5f73ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff160361110b578060025f8282546110ff9190611d6d565b925050819055506111d9565b5f5f5f8573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2054905081811015611194578381836040517fe450d38c00000000000000000000000000000000000000000000000000000000815260040161118b93929190611da0565b60405180910390fd5b8181035f5f8673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f2081905550505b5f73ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1603611220578060025f828254039250508190555061126a565b805f5f8473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020015f205f82825401925050819055505b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516112c7919061187e565b60405180910390a3505050565b5f7f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f7f00000000000000000000000000000000000000000000000000000000000000007f0000000000000000000000000000000000000000000000000000000000000000463060405160200161134e959493929190611dee565b60405160208183030381529060405280519060200120905090565b60605f61137583611664565b90505f602067ffffffffffffffff81111561139357611392611c5a565b5b6040519080825280601f01601f1916602001820160405280156113c55781602001600182028036833780820191505090505b5090508181528360208201528092505050919050565b5f6040517f190100000000000000000000000000000000000000000000000000000000000081528360028201528260228201526042812091505092915050565b5f5f5f7f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0845f1c1115611457575f6003859250925092506114f8565b5f6001888888886040515f815260200160405260405161147a9493929190611e3f565b6020604051602081039080840390855afa15801561149a573d5f5f3e3d5ffd5b5050506020604051035190505f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16036114eb575f60015f5f1b935093509350506114f8565b805f5f5f1b935093509350505b9450945094915050565b5f600381111561151557611514611e82565b5b82600381111561152857611527611e82565b5b0315611660576001600381111561154257611541611e82565b5b82600381111561155557611554611e82565b5b0361158c576040517ff645eedf00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b600260038111156115a05761159f611e82565b5b8260038111156115b3576115b2611e82565b5b036115f757805f1c6040517ffce698f70000000000000000000000000000000000000000000000000000000081526004016115ee919061187e565b60405180910390fd5b60038081111561160a57611609611e82565b5b82600381111561161d5761161c611e82565b5b0361165f57806040517fd78bce0c0000000000000000000000000000000000000000000000000000000081526004016116569190611933565b60405180910390fd5b5b5050565b5f5f60ff835f1c169050601f8111156116a9576040517fb3512b0c00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b80915050919050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f601f19601f8301169050919050565b5f6116f4826116b2565b6116fe81856116bc565b935061170e8185602086016116cc565b611717816116da565b840191505092915050565b5f6020820190508181035f83015261173a81846116ea565b905092915050565b5f5ffd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f61176f82611746565b9050919050565b61177f81611765565b8114611789575f5ffd5b50565b5f8135905061179a81611776565b92915050565b5f819050919050565b6117b2816117a0565b81146117bc575f5ffd5b50565b5f813590506117cd816117a9565b92915050565b5f5f604083850312156117e9576117e8611742565b5b5f6117f68582860161178c565b9250506020611807858286016117bf565b9150509250929050565b5f8115159050919050565b61182581611811565b82525050565b5f60208201905061183e5f83018461181c565b92915050565b5f6020828403121561185957611858611742565b5b5f6118668482850161178c565b91505092915050565b611878816117a0565b82525050565b5f6020820190506118915f83018461186f565b92915050565b5f5f5f606084860312156118ae576118ad611742565b5b5f6118bb8682870161178c565b93505060206118cc8682870161178c565b92505060406118dd868287016117bf565b9150509250925092565b5f60ff82169050919050565b6118fc816118e7565b82525050565b5f6020820190506119155f8301846118f3565b92915050565b5f819050919050565b61192d8161191b565b82525050565b5f6020820190506119465f830184611924565b92915050565b5f7fff0000000000000000000000000000000000000000000000000000000000000082169050919050565b6119808161194c565b82525050565b61198f81611765565b82525050565b5f81519050919050565b5f82825260208201905092915050565b5f819050602082019050919050565b6119c7816117a0565b82525050565b5f6119d883836119be565b60208301905092915050565b5f602082019050919050565b5f6119fa82611995565b611a04818561199f565b9350611a0f836119af565b805f5b83811015611a3f578151611a2688826119cd565b9750611a31836119e4565b925050600181019050611a12565b5085935050505092915050565b5f60e082019050611a5f5f83018a611977565b8181036020830152611a7181896116ea565b90508181036040830152611a8581886116ea565b9050611a94606083018761186f565b611aa16080830186611986565b611aae60a0830185611924565b81810360c0830152611ac081846119f0565b905098975050505050505050565b611ad7816118e7565b8114611ae1575f5ffd5b50565b5f81359050611af281611ace565b92915050565b611b018161191b565b8114611b0b575f5ffd5b50565b5f81359050611b1c81611af8565b92915050565b5f5f5f5f5f5f5f60e0888a031215611b3d57611b3c611742565b5b5f611b4a8a828b0161178c565b9750506020611b5b8a828b0161178c565b9650506040611b6c8a828b016117bf565b9550506060611b7d8a828b016117bf565b9450506080611b8e8a828b01611ae4565b93505060a0611b9f8a828b01611b0e565b92505060c0611bb08a828b01611b0e565b91505092959891949750929550565b5f5f60408385031215611bd557611bd4611742565b5b5f611be28582860161178c565b9250506020611bf38582860161178c565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f6002820490506001821680611c4157607f821691505b602082108103611c5457611c53611bfd565b5b50919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b5f60c082019050611c9a5f830189611924565b611ca76020830188611986565b611cb46040830187611986565b611cc1606083018661186f565b611cce608083018561186f565b611cdb60a083018461186f565b979650505050505050565b5f604082019050611cf95f830185611986565b611d066020830184611986565b9392505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f611d44826117a0565b9150611d4f836117a0565b9250828203905081811115611d6757611d66611d0d565b5b92915050565b5f611d77826117a0565b9150611d82836117a0565b9250828201905080821115611d9a57611d99611d0d565b5b92915050565b5f606082019050611db35f830186611986565b611dc0602083018561186f565b611dcd604083018461186f565b949350505050565b5f602082019050611de85f830184611986565b92915050565b5f60a082019050611e015f830188611924565b611e0e6020830187611924565b611e1b6040830186611924565b611e28606083018561186f565b611e356080830184611986565b9695505050505050565b5f608082019050611e525f830187611924565b611e5f60208301866118f3565b611e6c6040830185611924565b611e796060830184611924565b95945050505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffdfea26469706673582212203eaa460bcef84c5c8825a8910a8a73a83872f9d4c617e57ed0866ed6582b14ef64736f6c63430008250033",
}

// WhitzardTokenABI is the input ABI used to generate the binding from.
// Deprecated: Use WhitzardTokenMetaData.ABI instead.
var WhitzardTokenABI = WhitzardTokenMetaData.ABI

// WhitzardTokenBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use WhitzardTokenMetaData.Bin instead.
var WhitzardTokenBin = WhitzardTokenMetaData.Bin

// DeployWhitzardToken deploys a new Ethereum contract, binding an instance of WhitzardToken to it.
func DeployWhitzardToken(auth *bind.TransactOpts, backend bind.ContractBackend) (common.Address, *types.Transaction, *WhitzardToken, error) {
	parsed, err := WhitzardTokenMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(WhitzardTokenBin), backend)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &WhitzardToken{WhitzardTokenCaller: WhitzardTokenCaller{contract: contract}, WhitzardTokenTransactor: WhitzardTokenTransactor{contract: contract}, WhitzardTokenFilterer: WhitzardTokenFilterer{contract: contract}}, nil
}

// WhitzardToken is an auto generated Go binding around an Ethereum contract.
type WhitzardToken struct {
	WhitzardTokenCaller     // Read-only binding to the contract
	WhitzardTokenTransactor // Write-only binding to the contract
	WhitzardTokenFilterer   // Log filterer for contract events
}

// WhitzardTokenCaller is an auto generated read-only Go binding around an Ethereum contract.
type WhitzardTokenCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WhitzardTokenTransactor is an auto generated write-only Go binding around an Ethereum contract.
type WhitzardTokenTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WhitzardTokenFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type WhitzardTokenFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// WhitzardTokenSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type WhitzardTokenSession struct {
	Contract     *WhitzardToken    // Generic contract binding to set the session for
	CallOpts     bind.CallOpts     // Call options to use throughout this session
	TransactOpts bind.TransactOpts // Transaction auth options to use throughout this session
}

// WhitzardTokenCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type WhitzardTokenCallerSession struct {
	Contract *WhitzardTokenCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts        // Call options to use throughout this session
}

// WhitzardTokenTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type WhitzardTokenTransactorSession struct {
	Contract     *WhitzardTokenTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts        // Transaction auth options to use throughout this session
}

// WhitzardTokenRaw is an auto generated low-level Go binding around an Ethereum contract.
type WhitzardTokenRaw struct {
	Contract *WhitzardToken // Generic contract binding to access the raw methods on
}

// WhitzardTokenCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type WhitzardTokenCallerRaw struct {
	Contract *WhitzardTokenCaller // Generic read-only contract binding to access the raw methods on
}

// WhitzardTokenTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type WhitzardTokenTransactorRaw struct {
	Contract *WhitzardTokenTransactor // Generic write-only contract binding to access the raw methods on
}

// NewWhitzardToken creates a new instance of WhitzardToken, bound to a specific deployed contract.
func NewWhitzardToken(address common.Address, backend bind.ContractBackend) (*WhitzardToken, error) {
	contract, err := bindWhitzardToken(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &WhitzardToken{WhitzardTokenCaller: WhitzardTokenCaller{contract: contract}, WhitzardTokenTransactor: WhitzardTokenTransactor{contract: contract}, WhitzardTokenFilterer: WhitzardTokenFilterer{contract: contract}}, nil
}

// NewWhitzardTokenCaller creates a new read-only instance of WhitzardToken, bound to a specific deployed contract.
func NewWhitzardTokenCaller(address common.Address, caller bind.ContractCaller) (*WhitzardTokenCaller, error) {
	contract, err := bindWhitzardToken(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &WhitzardTokenCaller{contract: contract}, nil
}

// NewWhitzardTokenTransactor creates a new write-only instance of WhitzardToken, bound to a specific deployed contract.
func NewWhitzardTokenTransactor(address common.Address, transactor bind.ContractTransactor) (*WhitzardTokenTransactor, error) {
	contract, err := bindWhitzardToken(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &WhitzardTokenTransactor{contract: contract}, nil
}

// NewWhitzardTokenFilterer creates a new log filterer instance of WhitzardToken, bound to a specific deployed contract.
func NewWhitzardTokenFilterer(address common.Address, filterer bind.ContractFilterer) (*WhitzardTokenFilterer, error) {
	contract, err := bindWhitzardToken(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &WhitzardTokenFilterer{contract: contract}, nil
}

// bindWhitzardToken binds a generic wrapper to an already deployed contract.
func bindWhitzardToken(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := WhitzardTokenMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_WhitzardToken *WhitzardTokenRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _WhitzardToken.Contract.WhitzardTokenCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_WhitzardToken *WhitzardTokenRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WhitzardToken.Contract.WhitzardTokenTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_WhitzardToken *WhitzardTokenRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _WhitzardToken.Contract.WhitzardTokenTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_WhitzardToken *WhitzardTokenCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _WhitzardToken.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_WhitzardToken *WhitzardTokenTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WhitzardToken.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_WhitzardToken *WhitzardTokenTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _WhitzardToken.Contract.contract.Transact(opts, method, params...)
}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32)
func (_WhitzardToken *WhitzardTokenCaller) DOMAINSEPARATOR(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "DOMAIN_SEPARATOR")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32)
func (_WhitzardToken *WhitzardTokenSession) DOMAINSEPARATOR() ([32]byte, error) {
	return _WhitzardToken.Contract.DOMAINSEPARATOR(&_WhitzardToken.CallOpts)
}

// DOMAINSEPARATOR is a free data retrieval call binding the contract method 0x3644e515.
//
// Solidity: function DOMAIN_SEPARATOR() view returns(bytes32)
func (_WhitzardToken *WhitzardTokenCallerSession) DOMAINSEPARATOR() ([32]byte, error) {
	return _WhitzardToken.Contract.DOMAINSEPARATOR(&_WhitzardToken.CallOpts)
}

// FAUCETAMOUNT is a free data retrieval call binding the contract method 0x76697640.
//
// Solidity: function FAUCET_AMOUNT() view returns(uint256)
func (_WhitzardToken *WhitzardTokenCaller) FAUCETAMOUNT(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "FAUCET_AMOUNT")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// FAUCETAMOUNT is a free data retrieval call binding the contract method 0x76697640.
//
// Solidity: function FAUCET_AMOUNT() view returns(uint256)
func (_WhitzardToken *WhitzardTokenSession) FAUCETAMOUNT() (*big.Int, error) {
	return _WhitzardToken.Contract.FAUCETAMOUNT(&_WhitzardToken.CallOpts)
}

// FAUCETAMOUNT is a free data retrieval call binding the contract method 0x76697640.
//
// Solidity: function FAUCET_AMOUNT() view returns(uint256)
func (_WhitzardToken *WhitzardTokenCallerSession) FAUCETAMOUNT() (*big.Int, error) {
	return _WhitzardToken.Contract.FAUCETAMOUNT(&_WhitzardToken.CallOpts)
}

// FAUCETCOOLDOWN is a free data retrieval call binding the contract method 0x7d1d5d19.
//
// Solidity: function FAUCET_COOLDOWN() view returns(uint256)
func (_WhitzardToken *WhitzardTokenCaller) FAUCETCOOLDOWN(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "FAUCET_COOLDOWN")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// FAUCETCOOLDOWN is a free data retrieval call binding the contract method 0x7d1d5d19.
//
// Solidity: function FAUCET_COOLDOWN() view returns(uint256)
func (_WhitzardToken *WhitzardTokenSession) FAUCETCOOLDOWN() (*big.Int, error) {
	return _WhitzardToken.Contract.FAUCETCOOLDOWN(&_WhitzardToken.CallOpts)
}

// FAUCETCOOLDOWN is a free data retrieval call binding the contract method 0x7d1d5d19.
//
// Solidity: function FAUCET_COOLDOWN() view returns(uint256)
func (_WhitzardToken *WhitzardTokenCallerSession) FAUCETCOOLDOWN() (*big.Int, error) {
	return _WhitzardToken.Contract.FAUCETCOOLDOWN(&_WhitzardToken.CallOpts)
}

// FAUCETLIFETIMECAP is a free data retrieval call binding the contract method 0xae6643ab.
//
// Solidity: function FAUCET_LIFETIME_CAP() view returns(uint256)
func (_WhitzardToken *WhitzardTokenCaller) FAUCETLIFETIMECAP(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "FAUCET_LIFETIME_CAP")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// FAUCETLIFETIMECAP is a free data retrieval call binding the contract method 0xae6643ab.
//
// Solidity: function FAUCET_LIFETIME_CAP() view returns(uint256)
func (_WhitzardToken *WhitzardTokenSession) FAUCETLIFETIMECAP() (*big.Int, error) {
	return _WhitzardToken.Contract.FAUCETLIFETIMECAP(&_WhitzardToken.CallOpts)
}

// FAUCETLIFETIMECAP is a free data retrieval call binding the contract method 0xae6643ab.
//
// Solidity: function FAUCET_LIFETIME_CAP() view returns(uint256)
func (_WhitzardToken *WhitzardTokenCallerSession) FAUCETLIFETIMECAP() (*big.Int, error) {
	return _WhitzardToken.Contract.FAUCETLIFETIMECAP(&_WhitzardToken.CallOpts)
}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address owner, address spender) view returns(uint256)
func (_WhitzardToken *WhitzardTokenCaller) Allowance(opts *bind.CallOpts, owner common.Address, spender common.Address) (*big.Int, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "allowance", owner, spender)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address owner, address spender) view returns(uint256)
func (_WhitzardToken *WhitzardTokenSession) Allowance(owner common.Address, spender common.Address) (*big.Int, error) {
	return _WhitzardToken.Contract.Allowance(&_WhitzardToken.CallOpts, owner, spender)
}

// Allowance is a free data retrieval call binding the contract method 0xdd62ed3e.
//
// Solidity: function allowance(address owner, address spender) view returns(uint256)
func (_WhitzardToken *WhitzardTokenCallerSession) Allowance(owner common.Address, spender common.Address) (*big.Int, error) {
	return _WhitzardToken.Contract.Allowance(&_WhitzardToken.CallOpts, owner, spender)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address account) view returns(uint256)
func (_WhitzardToken *WhitzardTokenCaller) BalanceOf(opts *bind.CallOpts, account common.Address) (*big.Int, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "balanceOf", account)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address account) view returns(uint256)
func (_WhitzardToken *WhitzardTokenSession) BalanceOf(account common.Address) (*big.Int, error) {
	return _WhitzardToken.Contract.BalanceOf(&_WhitzardToken.CallOpts, account)
}

// BalanceOf is a free data retrieval call binding the contract method 0x70a08231.
//
// Solidity: function balanceOf(address account) view returns(uint256)
func (_WhitzardToken *WhitzardTokenCallerSession) BalanceOf(account common.Address) (*big.Int, error) {
	return _WhitzardToken.Contract.BalanceOf(&_WhitzardToken.CallOpts, account)
}

// ClaimedTotal is a free data retrieval call binding the contract method 0xea66b875.
//
// Solidity: function claimedTotal(address account) view returns(uint256)
func (_WhitzardToken *WhitzardTokenCaller) ClaimedTotal(opts *bind.CallOpts, account common.Address) (*big.Int, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "claimedTotal", account)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// ClaimedTotal is a free data retrieval call binding the contract method 0xea66b875.
//
// Solidity: function claimedTotal(address account) view returns(uint256)
func (_WhitzardToken *WhitzardTokenSession) ClaimedTotal(account common.Address) (*big.Int, error) {
	return _WhitzardToken.Contract.ClaimedTotal(&_WhitzardToken.CallOpts, account)
}

// ClaimedTotal is a free data retrieval call binding the contract method 0xea66b875.
//
// Solidity: function claimedTotal(address account) view returns(uint256)
func (_WhitzardToken *WhitzardTokenCallerSession) ClaimedTotal(account common.Address) (*big.Int, error) {
	return _WhitzardToken.Contract.ClaimedTotal(&_WhitzardToken.CallOpts, account)
}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_WhitzardToken *WhitzardTokenCaller) Decimals(opts *bind.CallOpts) (uint8, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "decimals")

	if err != nil {
		return *new(uint8), err
	}

	out0 := *abi.ConvertType(out[0], new(uint8)).(*uint8)

	return out0, err

}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_WhitzardToken *WhitzardTokenSession) Decimals() (uint8, error) {
	return _WhitzardToken.Contract.Decimals(&_WhitzardToken.CallOpts)
}

// Decimals is a free data retrieval call binding the contract method 0x313ce567.
//
// Solidity: function decimals() view returns(uint8)
func (_WhitzardToken *WhitzardTokenCallerSession) Decimals() (uint8, error) {
	return _WhitzardToken.Contract.Decimals(&_WhitzardToken.CallOpts)
}

// Eip712Domain is a free data retrieval call binding the contract method 0x84b0196e.
//
// Solidity: function eip712Domain() view returns(bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)
func (_WhitzardToken *WhitzardTokenCaller) Eip712Domain(opts *bind.CallOpts) (struct {
	Fields            [1]byte
	Name              string
	Version           string
	ChainId           *big.Int
	VerifyingContract common.Address
	Salt              [32]byte
	Extensions        []*big.Int
}, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "eip712Domain")

	outstruct := new(struct {
		Fields            [1]byte
		Name              string
		Version           string
		ChainId           *big.Int
		VerifyingContract common.Address
		Salt              [32]byte
		Extensions        []*big.Int
	})
	if err != nil {
		return *outstruct, err
	}

	outstruct.Fields = *abi.ConvertType(out[0], new([1]byte)).(*[1]byte)
	outstruct.Name = *abi.ConvertType(out[1], new(string)).(*string)
	outstruct.Version = *abi.ConvertType(out[2], new(string)).(*string)
	outstruct.ChainId = *abi.ConvertType(out[3], new(*big.Int)).(**big.Int)
	outstruct.VerifyingContract = *abi.ConvertType(out[4], new(common.Address)).(*common.Address)
	outstruct.Salt = *abi.ConvertType(out[5], new([32]byte)).(*[32]byte)
	outstruct.Extensions = *abi.ConvertType(out[6], new([]*big.Int)).(*[]*big.Int)

	return *outstruct, err

}

// Eip712Domain is a free data retrieval call binding the contract method 0x84b0196e.
//
// Solidity: function eip712Domain() view returns(bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)
func (_WhitzardToken *WhitzardTokenSession) Eip712Domain() (struct {
	Fields            [1]byte
	Name              string
	Version           string
	ChainId           *big.Int
	VerifyingContract common.Address
	Salt              [32]byte
	Extensions        []*big.Int
}, error) {
	return _WhitzardToken.Contract.Eip712Domain(&_WhitzardToken.CallOpts)
}

// Eip712Domain is a free data retrieval call binding the contract method 0x84b0196e.
//
// Solidity: function eip712Domain() view returns(bytes1 fields, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)
func (_WhitzardToken *WhitzardTokenCallerSession) Eip712Domain() (struct {
	Fields            [1]byte
	Name              string
	Version           string
	ChainId           *big.Int
	VerifyingContract common.Address
	Salt              [32]byte
	Extensions        []*big.Int
}, error) {
	return _WhitzardToken.Contract.Eip712Domain(&_WhitzardToken.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_WhitzardToken *WhitzardTokenCaller) Name(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "name")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_WhitzardToken *WhitzardTokenSession) Name() (string, error) {
	return _WhitzardToken.Contract.Name(&_WhitzardToken.CallOpts)
}

// Name is a free data retrieval call binding the contract method 0x06fdde03.
//
// Solidity: function name() view returns(string)
func (_WhitzardToken *WhitzardTokenCallerSession) Name() (string, error) {
	return _WhitzardToken.Contract.Name(&_WhitzardToken.CallOpts)
}

// NextClaimAt is a free data retrieval call binding the contract method 0x11a163e9.
//
// Solidity: function nextClaimAt(address account) view returns(uint256)
func (_WhitzardToken *WhitzardTokenCaller) NextClaimAt(opts *bind.CallOpts, account common.Address) (*big.Int, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "nextClaimAt", account)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// NextClaimAt is a free data retrieval call binding the contract method 0x11a163e9.
//
// Solidity: function nextClaimAt(address account) view returns(uint256)
func (_WhitzardToken *WhitzardTokenSession) NextClaimAt(account common.Address) (*big.Int, error) {
	return _WhitzardToken.Contract.NextClaimAt(&_WhitzardToken.CallOpts, account)
}

// NextClaimAt is a free data retrieval call binding the contract method 0x11a163e9.
//
// Solidity: function nextClaimAt(address account) view returns(uint256)
func (_WhitzardToken *WhitzardTokenCallerSession) NextClaimAt(account common.Address) (*big.Int, error) {
	return _WhitzardToken.Contract.NextClaimAt(&_WhitzardToken.CallOpts, account)
}

// Nonces is a free data retrieval call binding the contract method 0x7ecebe00.
//
// Solidity: function nonces(address owner) view returns(uint256)
func (_WhitzardToken *WhitzardTokenCaller) Nonces(opts *bind.CallOpts, owner common.Address) (*big.Int, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "nonces", owner)

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// Nonces is a free data retrieval call binding the contract method 0x7ecebe00.
//
// Solidity: function nonces(address owner) view returns(uint256)
func (_WhitzardToken *WhitzardTokenSession) Nonces(owner common.Address) (*big.Int, error) {
	return _WhitzardToken.Contract.Nonces(&_WhitzardToken.CallOpts, owner)
}

// Nonces is a free data retrieval call binding the contract method 0x7ecebe00.
//
// Solidity: function nonces(address owner) view returns(uint256)
func (_WhitzardToken *WhitzardTokenCallerSession) Nonces(owner common.Address) (*big.Int, error) {
	return _WhitzardToken.Contract.Nonces(&_WhitzardToken.CallOpts, owner)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_WhitzardToken *WhitzardTokenCaller) Symbol(opts *bind.CallOpts) (string, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "symbol")

	if err != nil {
		return *new(string), err
	}

	out0 := *abi.ConvertType(out[0], new(string)).(*string)

	return out0, err

}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_WhitzardToken *WhitzardTokenSession) Symbol() (string, error) {
	return _WhitzardToken.Contract.Symbol(&_WhitzardToken.CallOpts)
}

// Symbol is a free data retrieval call binding the contract method 0x95d89b41.
//
// Solidity: function symbol() view returns(string)
func (_WhitzardToken *WhitzardTokenCallerSession) Symbol() (string, error) {
	return _WhitzardToken.Contract.Symbol(&_WhitzardToken.CallOpts)
}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_WhitzardToken *WhitzardTokenCaller) TotalSupply(opts *bind.CallOpts) (*big.Int, error) {
	var out []interface{}
	err := _WhitzardToken.contract.Call(opts, &out, "totalSupply")

	if err != nil {
		return *new(*big.Int), err
	}

	out0 := *abi.ConvertType(out[0], new(*big.Int)).(**big.Int)

	return out0, err

}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_WhitzardToken *WhitzardTokenSession) TotalSupply() (*big.Int, error) {
	return _WhitzardToken.Contract.TotalSupply(&_WhitzardToken.CallOpts)
}

// TotalSupply is a free data retrieval call binding the contract method 0x18160ddd.
//
// Solidity: function totalSupply() view returns(uint256)
func (_WhitzardToken *WhitzardTokenCallerSession) TotalSupply() (*big.Int, error) {
	return _WhitzardToken.Contract.TotalSupply(&_WhitzardToken.CallOpts)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 value) returns(bool)
func (_WhitzardToken *WhitzardTokenTransactor) Approve(opts *bind.TransactOpts, spender common.Address, value *big.Int) (*types.Transaction, error) {
	return _WhitzardToken.contract.Transact(opts, "approve", spender, value)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 value) returns(bool)
func (_WhitzardToken *WhitzardTokenSession) Approve(spender common.Address, value *big.Int) (*types.Transaction, error) {
	return _WhitzardToken.Contract.Approve(&_WhitzardToken.TransactOpts, spender, value)
}

// Approve is a paid mutator transaction binding the contract method 0x095ea7b3.
//
// Solidity: function approve(address spender, uint256 value) returns(bool)
func (_WhitzardToken *WhitzardTokenTransactorSession) Approve(spender common.Address, value *big.Int) (*types.Transaction, error) {
	return _WhitzardToken.Contract.Approve(&_WhitzardToken.TransactOpts, spender, value)
}

// Faucet is a paid mutator transaction binding the contract method 0xde5f72fd.
//
// Solidity: function faucet() returns()
func (_WhitzardToken *WhitzardTokenTransactor) Faucet(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _WhitzardToken.contract.Transact(opts, "faucet")
}

// Faucet is a paid mutator transaction binding the contract method 0xde5f72fd.
//
// Solidity: function faucet() returns()
func (_WhitzardToken *WhitzardTokenSession) Faucet() (*types.Transaction, error) {
	return _WhitzardToken.Contract.Faucet(&_WhitzardToken.TransactOpts)
}

// Faucet is a paid mutator transaction binding the contract method 0xde5f72fd.
//
// Solidity: function faucet() returns()
func (_WhitzardToken *WhitzardTokenTransactorSession) Faucet() (*types.Transaction, error) {
	return _WhitzardToken.Contract.Faucet(&_WhitzardToken.TransactOpts)
}

// Permit is a paid mutator transaction binding the contract method 0xd505accf.
//
// Solidity: function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns()
func (_WhitzardToken *WhitzardTokenTransactor) Permit(opts *bind.TransactOpts, owner common.Address, spender common.Address, value *big.Int, deadline *big.Int, v uint8, r [32]byte, s [32]byte) (*types.Transaction, error) {
	return _WhitzardToken.contract.Transact(opts, "permit", owner, spender, value, deadline, v, r, s)
}

// Permit is a paid mutator transaction binding the contract method 0xd505accf.
//
// Solidity: function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns()
func (_WhitzardToken *WhitzardTokenSession) Permit(owner common.Address, spender common.Address, value *big.Int, deadline *big.Int, v uint8, r [32]byte, s [32]byte) (*types.Transaction, error) {
	return _WhitzardToken.Contract.Permit(&_WhitzardToken.TransactOpts, owner, spender, value, deadline, v, r, s)
}

// Permit is a paid mutator transaction binding the contract method 0xd505accf.
//
// Solidity: function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) returns()
func (_WhitzardToken *WhitzardTokenTransactorSession) Permit(owner common.Address, spender common.Address, value *big.Int, deadline *big.Int, v uint8, r [32]byte, s [32]byte) (*types.Transaction, error) {
	return _WhitzardToken.Contract.Permit(&_WhitzardToken.TransactOpts, owner, spender, value, deadline, v, r, s)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 value) returns(bool)
func (_WhitzardToken *WhitzardTokenTransactor) Transfer(opts *bind.TransactOpts, to common.Address, value *big.Int) (*types.Transaction, error) {
	return _WhitzardToken.contract.Transact(opts, "transfer", to, value)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 value) returns(bool)
func (_WhitzardToken *WhitzardTokenSession) Transfer(to common.Address, value *big.Int) (*types.Transaction, error) {
	return _WhitzardToken.Contract.Transfer(&_WhitzardToken.TransactOpts, to, value)
}

// Transfer is a paid mutator transaction binding the contract method 0xa9059cbb.
//
// Solidity: function transfer(address to, uint256 value) returns(bool)
func (_WhitzardToken *WhitzardTokenTransactorSession) Transfer(to common.Address, value *big.Int) (*types.Transaction, error) {
	return _WhitzardToken.Contract.Transfer(&_WhitzardToken.TransactOpts, to, value)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 value) returns(bool)
func (_WhitzardToken *WhitzardTokenTransactor) TransferFrom(opts *bind.TransactOpts, from common.Address, to common.Address, value *big.Int) (*types.Transaction, error) {
	return _WhitzardToken.contract.Transact(opts, "transferFrom", from, to, value)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 value) returns(bool)
func (_WhitzardToken *WhitzardTokenSession) TransferFrom(from common.Address, to common.Address, value *big.Int) (*types.Transaction, error) {
	return _WhitzardToken.Contract.TransferFrom(&_WhitzardToken.TransactOpts, from, to, value)
}

// TransferFrom is a paid mutator transaction binding the contract method 0x23b872dd.
//
// Solidity: function transferFrom(address from, address to, uint256 value) returns(bool)
func (_WhitzardToken *WhitzardTokenTransactorSession) TransferFrom(from common.Address, to common.Address, value *big.Int) (*types.Transaction, error) {
	return _WhitzardToken.Contract.TransferFrom(&_WhitzardToken.TransactOpts, from, to, value)
}

// WhitzardTokenApprovalIterator is returned from FilterApproval and is used to iterate over the raw logs and unpacked data for Approval events raised by the WhitzardToken contract.
type WhitzardTokenApprovalIterator struct {
	Event *WhitzardTokenApproval // Event containing the contract specifics and raw log

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
func (it *WhitzardTokenApprovalIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WhitzardTokenApproval)
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
		it.Event = new(WhitzardTokenApproval)
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
func (it *WhitzardTokenApprovalIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WhitzardTokenApprovalIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WhitzardTokenApproval represents a Approval event raised by the WhitzardToken contract.
type WhitzardTokenApproval struct {
	Owner   common.Address
	Spender common.Address
	Value   *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterApproval is a free log retrieval operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_WhitzardToken *WhitzardTokenFilterer) FilterApproval(opts *bind.FilterOpts, owner []common.Address, spender []common.Address) (*WhitzardTokenApprovalIterator, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var spenderRule []interface{}
	for _, spenderItem := range spender {
		spenderRule = append(spenderRule, spenderItem)
	}

	logs, sub, err := _WhitzardToken.contract.FilterLogs(opts, "Approval", ownerRule, spenderRule)
	if err != nil {
		return nil, err
	}
	return &WhitzardTokenApprovalIterator{contract: _WhitzardToken.contract, event: "Approval", logs: logs, sub: sub}, nil
}

// WatchApproval is a free log subscription operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_WhitzardToken *WhitzardTokenFilterer) WatchApproval(opts *bind.WatchOpts, sink chan<- *WhitzardTokenApproval, owner []common.Address, spender []common.Address) (event.Subscription, error) {

	var ownerRule []interface{}
	for _, ownerItem := range owner {
		ownerRule = append(ownerRule, ownerItem)
	}
	var spenderRule []interface{}
	for _, spenderItem := range spender {
		spenderRule = append(spenderRule, spenderItem)
	}

	logs, sub, err := _WhitzardToken.contract.WatchLogs(opts, "Approval", ownerRule, spenderRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WhitzardTokenApproval)
				if err := _WhitzardToken.contract.UnpackLog(event, "Approval", log); err != nil {
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

// ParseApproval is a log parse operation binding the contract event 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925.
//
// Solidity: event Approval(address indexed owner, address indexed spender, uint256 value)
func (_WhitzardToken *WhitzardTokenFilterer) ParseApproval(log types.Log) (*WhitzardTokenApproval, error) {
	event := new(WhitzardTokenApproval)
	if err := _WhitzardToken.contract.UnpackLog(event, "Approval", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WhitzardTokenEIP712DomainChangedIterator is returned from FilterEIP712DomainChanged and is used to iterate over the raw logs and unpacked data for EIP712DomainChanged events raised by the WhitzardToken contract.
type WhitzardTokenEIP712DomainChangedIterator struct {
	Event *WhitzardTokenEIP712DomainChanged // Event containing the contract specifics and raw log

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
func (it *WhitzardTokenEIP712DomainChangedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WhitzardTokenEIP712DomainChanged)
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
		it.Event = new(WhitzardTokenEIP712DomainChanged)
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
func (it *WhitzardTokenEIP712DomainChangedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WhitzardTokenEIP712DomainChangedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WhitzardTokenEIP712DomainChanged represents a EIP712DomainChanged event raised by the WhitzardToken contract.
type WhitzardTokenEIP712DomainChanged struct {
	Raw types.Log // Blockchain specific contextual infos
}

// FilterEIP712DomainChanged is a free log retrieval operation binding the contract event 0x0a6387c9ea3628b88a633bb4f3b151770f70085117a15f9bf3787cda53f13d31.
//
// Solidity: event EIP712DomainChanged()
func (_WhitzardToken *WhitzardTokenFilterer) FilterEIP712DomainChanged(opts *bind.FilterOpts) (*WhitzardTokenEIP712DomainChangedIterator, error) {

	logs, sub, err := _WhitzardToken.contract.FilterLogs(opts, "EIP712DomainChanged")
	if err != nil {
		return nil, err
	}
	return &WhitzardTokenEIP712DomainChangedIterator{contract: _WhitzardToken.contract, event: "EIP712DomainChanged", logs: logs, sub: sub}, nil
}

// WatchEIP712DomainChanged is a free log subscription operation binding the contract event 0x0a6387c9ea3628b88a633bb4f3b151770f70085117a15f9bf3787cda53f13d31.
//
// Solidity: event EIP712DomainChanged()
func (_WhitzardToken *WhitzardTokenFilterer) WatchEIP712DomainChanged(opts *bind.WatchOpts, sink chan<- *WhitzardTokenEIP712DomainChanged) (event.Subscription, error) {

	logs, sub, err := _WhitzardToken.contract.WatchLogs(opts, "EIP712DomainChanged")
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WhitzardTokenEIP712DomainChanged)
				if err := _WhitzardToken.contract.UnpackLog(event, "EIP712DomainChanged", log); err != nil {
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

// ParseEIP712DomainChanged is a log parse operation binding the contract event 0x0a6387c9ea3628b88a633bb4f3b151770f70085117a15f9bf3787cda53f13d31.
//
// Solidity: event EIP712DomainChanged()
func (_WhitzardToken *WhitzardTokenFilterer) ParseEIP712DomainChanged(log types.Log) (*WhitzardTokenEIP712DomainChanged, error) {
	event := new(WhitzardTokenEIP712DomainChanged)
	if err := _WhitzardToken.contract.UnpackLog(event, "EIP712DomainChanged", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WhitzardTokenFaucetClaimedIterator is returned from FilterFaucetClaimed and is used to iterate over the raw logs and unpacked data for FaucetClaimed events raised by the WhitzardToken contract.
type WhitzardTokenFaucetClaimedIterator struct {
	Event *WhitzardTokenFaucetClaimed // Event containing the contract specifics and raw log

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
func (it *WhitzardTokenFaucetClaimedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WhitzardTokenFaucetClaimed)
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
		it.Event = new(WhitzardTokenFaucetClaimed)
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
func (it *WhitzardTokenFaucetClaimedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WhitzardTokenFaucetClaimedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WhitzardTokenFaucetClaimed represents a FaucetClaimed event raised by the WhitzardToken contract.
type WhitzardTokenFaucetClaimed struct {
	Account common.Address
	Amount  *big.Int
	Raw     types.Log // Blockchain specific contextual infos
}

// FilterFaucetClaimed is a free log retrieval operation binding the contract event 0x5d4f415c63cd8a5874d9d291cdd64cec37e5dc236d90d659c958d109d78074b3.
//
// Solidity: event FaucetClaimed(address indexed account, uint256 amount)
func (_WhitzardToken *WhitzardTokenFilterer) FilterFaucetClaimed(opts *bind.FilterOpts, account []common.Address) (*WhitzardTokenFaucetClaimedIterator, error) {

	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}

	logs, sub, err := _WhitzardToken.contract.FilterLogs(opts, "FaucetClaimed", accountRule)
	if err != nil {
		return nil, err
	}
	return &WhitzardTokenFaucetClaimedIterator{contract: _WhitzardToken.contract, event: "FaucetClaimed", logs: logs, sub: sub}, nil
}

// WatchFaucetClaimed is a free log subscription operation binding the contract event 0x5d4f415c63cd8a5874d9d291cdd64cec37e5dc236d90d659c958d109d78074b3.
//
// Solidity: event FaucetClaimed(address indexed account, uint256 amount)
func (_WhitzardToken *WhitzardTokenFilterer) WatchFaucetClaimed(opts *bind.WatchOpts, sink chan<- *WhitzardTokenFaucetClaimed, account []common.Address) (event.Subscription, error) {

	var accountRule []interface{}
	for _, accountItem := range account {
		accountRule = append(accountRule, accountItem)
	}

	logs, sub, err := _WhitzardToken.contract.WatchLogs(opts, "FaucetClaimed", accountRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WhitzardTokenFaucetClaimed)
				if err := _WhitzardToken.contract.UnpackLog(event, "FaucetClaimed", log); err != nil {
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

// ParseFaucetClaimed is a log parse operation binding the contract event 0x5d4f415c63cd8a5874d9d291cdd64cec37e5dc236d90d659c958d109d78074b3.
//
// Solidity: event FaucetClaimed(address indexed account, uint256 amount)
func (_WhitzardToken *WhitzardTokenFilterer) ParseFaucetClaimed(log types.Log) (*WhitzardTokenFaucetClaimed, error) {
	event := new(WhitzardTokenFaucetClaimed)
	if err := _WhitzardToken.contract.UnpackLog(event, "FaucetClaimed", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}

// WhitzardTokenTransferIterator is returned from FilterTransfer and is used to iterate over the raw logs and unpacked data for Transfer events raised by the WhitzardToken contract.
type WhitzardTokenTransferIterator struct {
	Event *WhitzardTokenTransfer // Event containing the contract specifics and raw log

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
func (it *WhitzardTokenTransferIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(WhitzardTokenTransfer)
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
		it.Event = new(WhitzardTokenTransfer)
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
func (it *WhitzardTokenTransferIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *WhitzardTokenTransferIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// WhitzardTokenTransfer represents a Transfer event raised by the WhitzardToken contract.
type WhitzardTokenTransfer struct {
	From  common.Address
	To    common.Address
	Value *big.Int
	Raw   types.Log // Blockchain specific contextual infos
}

// FilterTransfer is a free log retrieval operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_WhitzardToken *WhitzardTokenFilterer) FilterTransfer(opts *bind.FilterOpts, from []common.Address, to []common.Address) (*WhitzardTokenTransferIterator, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _WhitzardToken.contract.FilterLogs(opts, "Transfer", fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return &WhitzardTokenTransferIterator{contract: _WhitzardToken.contract, event: "Transfer", logs: logs, sub: sub}, nil
}

// WatchTransfer is a free log subscription operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_WhitzardToken *WhitzardTokenFilterer) WatchTransfer(opts *bind.WatchOpts, sink chan<- *WhitzardTokenTransfer, from []common.Address, to []common.Address) (event.Subscription, error) {

	var fromRule []interface{}
	for _, fromItem := range from {
		fromRule = append(fromRule, fromItem)
	}
	var toRule []interface{}
	for _, toItem := range to {
		toRule = append(toRule, toItem)
	}

	logs, sub, err := _WhitzardToken.contract.WatchLogs(opts, "Transfer", fromRule, toRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(WhitzardTokenTransfer)
				if err := _WhitzardToken.contract.UnpackLog(event, "Transfer", log); err != nil {
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

// ParseTransfer is a log parse operation binding the contract event 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef.
//
// Solidity: event Transfer(address indexed from, address indexed to, uint256 value)
func (_WhitzardToken *WhitzardTokenFilterer) ParseTransfer(log types.Log) (*WhitzardTokenTransfer, error) {
	event := new(WhitzardTokenTransfer)
	if err := _WhitzardToken.contract.UnpackLog(event, "Transfer", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
