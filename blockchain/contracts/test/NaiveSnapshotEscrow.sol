// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/// @title NaiveSnapshotEscrow
/// @notice TEST ONLY, never deployed to Sepolia. The design Whitzard avoids (RM4c / K3): the
///         snapshot is taken by looping over every member in `openRequest` and writing each Ready
///         member into storage. Its gas grows linearly with the number of members, so past some
///         size the transaction no longer fits in a block. Only the snapshot step is modelled;
///         contributions and payout would be the same as in `Escrow`.
contract NaiveSnapshotEscrow {
    struct Request {
        address requester;
        uint256 amount;
        uint256 share;
        uint256 snapshotSize;
    }

    address[] public members;
    mapping(address member => bool) public isMember;
    mapping(address member => bool) public isReady;

    uint256 public requestCount;
    mapping(uint256 id => Request) public requests;
    mapping(uint256 id => mapping(address member => bool)) public inSnapshot;

    /// @notice Emitted when `member` joins.
    event Registered(address indexed member);

    /// @notice Emitted when `member` changes Ready status.
    event ReadyChanged(address indexed member, bool ready);

    /// @notice Emitted when a request is opened with `snapshotSize` members.
    event RequestOpened(uint256 indexed id, address indexed requester, uint256 share, uint256 snapshotSize);

    /// @notice The caller is already a member.
    error AlreadyRegistered(address member);

    /// @notice The caller is not a member.
    error NotRegistered(address member);

    /// @notice No member other than the requester is Ready.
    error EmptySnapshot();

    /// @notice Joins the member list.
    function register() external {
        if (isMember[msg.sender]) revert AlreadyRegistered(msg.sender);
        isMember[msg.sender] = true;
        members.push(msg.sender);
        emit Registered(msg.sender);
    }

    /// @notice Sets the caller's Ready status.
    function setReady(bool ready) external {
        if (!isMember[msg.sender]) revert NotRegistered(msg.sender);
        isReady[msg.sender] = ready;
        emit ReadyChanged(msg.sender, ready);
    }

    /// @notice Opens a request, copying every Ready member (except the caller) into its snapshot.
    /// @dev O(members): one storage read per member and one storage write per Ready member.
    function openRequest(uint256 amount) external returns (uint256 id) {
        id = ++requestCount;
        uint256 size;
        uint256 count = members.length;
        for (uint256 i = 0; i < count; i++) {
            address member = members[i];
            if (member != msg.sender && isReady[member]) {
                inSnapshot[id][member] = true;
                size++;
            }
        }
        if (size == 0) revert EmptySnapshot();

        uint256 share = amount / size;
        requests[id] = Request(msg.sender, amount, share, size);
        emit RequestOpened(id, msg.sender, share, size);
    }

    /// @notice Number of members ever registered.
    function memberCount() external view returns (uint256) {
        return members.length;
    }
}
