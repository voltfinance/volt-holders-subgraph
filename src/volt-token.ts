import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  VoltToken,
  Transfer
} from "../generated/VoltToken/VoltToken"
import { SystemInfo, VoltBalances } from "../generated/schema"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const ZERO = BigInt.fromI32(0)
// Would ignore transfer events from and to these addresses;
// Since the user would still have ownership over the tokens they staked in these addresses
const STAKING_ADDRESSES = [
  "0x97a6e78c9208c21afaDa67e7E61d7ad27688eFd1", // xVOLT contract
  "0xA670b12F8485aa379e99cF097017785b6acA5968", // WFUSE/VOLT lp
  "0x4E6b54f8dee787B16D8CdBA4f759342b19239C2c"  // FUSD/VOLT lp
]

function getOrCreateSystemInfo(id: string): SystemInfo{
  let system = SystemInfo.load(id)

  if(!system) {
    system = new SystemInfo(id)

    system.userCount = BigInt.fromI32(0)
    system.save()
  }

  return system
}

function getOrCreateUserBalance(id: string): VoltBalances {
  let userBalance = VoltBalances.load(id)

  if(!userBalance) {
    userBalance = new VoltBalances(id)

    userBalance.owner = Address.fromHexString(id)
    userBalance.balance = ZERO
    userBalance.save()
  }

  return userBalance
}

function updateUserBalance(userBalance: VoltBalances, amount: BigInt, system: SystemInfo): void {
  if(userBalance.id === ZERO_ADDRESS){
    return
  }
  const oldBalance = userBalance.balance
  let newBalance = oldBalance.plus(amount)
  if(newBalance.lt(ZERO)){ newBalance = ZERO }

  if(oldBalance.equals(ZERO) && newBalance.gt(ZERO) ) {
    system.userCount = system.userCount.plus(BigInt.fromI32(1))
  }
  if(newBalance.equals(ZERO) && oldBalance.gt(ZERO)) {
    system.userCount = system.userCount.minus(BigInt.fromI32(1))
  }

  userBalance.balance = newBalance

  system.save()
  userBalance.save()
}


export function handleTransfer(event: Transfer): void {
  const from = event.params.from
  const to = event.params.to
  const value = event.params.value
  const voltAddress = event.address.toHexString()

  const system = getOrCreateSystemInfo(voltAddress)
  const fromBalance = getOrCreateUserBalance(from.toHexString())
  const toBalance = getOrCreateUserBalance(to.toHexString())
  
  if(STAKING_ADDRESSES.includes(from.toHexString()) || STAKING_ADDRESSES.includes(to.toHexString())) {
    return
  }

  updateUserBalance(fromBalance, value.neg(), system)
  updateUserBalance(toBalance, value, system)
}
