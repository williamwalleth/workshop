import { EVMFetch, Network } from 'evm-fetch'
import {
  Vault__factory
} from '@balancer-labs/typechain'

export async function abc() {
  const fetcher = new EVMFetch({
    network: Network.POLYGON,
    provider: 'https://polygon-mainnet.infura.io/v3/f4b7c65997354c3783277ae1644ebdfd'
  })

  fetcher.addCall({
    key: 'poolTokens',
    address: '0xBA12222222228d8Ba445958a75a0704d566BF2C8',
    function: 'getPoolTokens',
    abi: Vault__factory.abi,
    params: ['0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000012']
  })

  const result = await fetcher.fetch()  
  console.log(result)
}


(async () => {
  await abc()
})()
