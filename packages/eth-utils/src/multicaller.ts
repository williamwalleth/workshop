import { FunctionFragment, Interface } from '@ethersproject/abi'
import { JsonRpcProvider } from '@ethersproject/providers'
import { Contract } from '@ethersproject/contracts'
import { set } from 'lodash'

type Call = {
  key: string;
  address: string;
  function: string | FunctionFragment;
  abi: any[];
  params?: any[];
};

export class Multicaller {
  public calls: Call[] = []
  public paths: string[] = []

  constructor(
    public readonly address: string,
    public readonly network: string,
    public readonly provider: JsonRpcProvider,
    public readonly options: Record<string, any> = {},
    public readonly requireAll = false
  ) {}

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
