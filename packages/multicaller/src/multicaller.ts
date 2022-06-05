import { FunctionFragment, Interface } from '@ethersproject/abi'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Contract } from '@ethersproject/contracts'
import { set } from 'lodash'

export type Call = {
  key: string;
  address: string;
  function: string | FunctionFragment;
  abi: any[];
  params?: any[];
};

enum Network {
  MAINNET = '1',
  KOVAN = '42',
  POLYGON = '137',
  ARBITRUM = '42161'
}

const ContractAddressMap = {
  [Network.MAINNET]: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
  [Network.POLYGON]: '0x275617327c958bD06b5D6b871E7f491D76113dd8',
  [Network.ARBITRUM]: '0x80C7DD17B01855a6D2347444a0FCC36136a314de',
  [Network.KOVAN]: '0x5ba1e12693dc8f9c48aad8770482f4739beed696'
}

export class Multicaller {
  public address: string
  public calls: Call[] = []
  public paths: string[] = []

  constructor(
    public readonly network: Network,
    public readonly provider: JsonRpcProvider,
    public readonly options: Record<string, any> = {},
    public readonly requireAll = false
  ) {
    this.address = ContractAddressMap[network]
  }

  public call(callParams: Call): Multicaller {
    this.calls.push(callParams)
    this.paths.push(callParams.key)
    return this
  }

  public async execute<T>(from?: any): Promise<T> {
    const obj = from || {}
    const result = await this._execute()
    result.forEach((r, i) => set(obj, this.paths[i], r))
    this.calls = []
    this.paths = []
    return obj
  }

  private getMulticallerInstance(): Contract {
    return new Contract(
      this.address,
      [
        'function tryAggregate(bool requireSuccess, tuple(address, bytes)[] memory calls) public view returns (tuple(bool, bytes)[] memory returnData)'
      ],
      this.provider
    )
  }

  private callInterfaces(): Interface[] {
    return this.calls.map(call => new Interface(call.abi))
  }

  private encodedCalls(): Array<string[]> {
    const interfaces = this.callInterfaces()

    return this.calls.map((call, i) => [
      call.address.toLowerCase(),
      interfaces[i].encodeFunctionData(call.function, call.params)
    ])
  }

  private async _execute<T>(): Promise<(T | null)[]> {
    const multicaller = this.getMulticallerInstance()
    const interfaces = this.callInterfaces()

    try {
      const res: [boolean, string][] = await multicaller.tryAggregate(
        // if false, allows individual calls to fail without causing entire multicall to fail
        this.requireAll,
        this.encodedCalls(),
        this.options
      )

      return res.map(([success, returnData], i) => {
        if (!success) return null
        const decodedResult = interfaces[i].decodeFunctionResult(
          this.calls[i].function,
          returnData
        )
        // Automatically unwrap any simple return values
        return decodedResult.length > 1 ? decodedResult : decodedResult[0]
      })
    } catch (e) {
      return Promise.reject(e)
    }
  }
}
