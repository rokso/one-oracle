import {LeafKeyCoder, LeafValueCoder} from '@umb-network/toolbox'

export const encodeKey = (quote: string) => `0x${LeafKeyCoder.encode(quote).toString('hex')}`
export const encodeKeys = (quotes: string[]) => quotes.map(encodeKey)
export const encodeValue = (n: number) => LeafValueCoder.encode(n, '')
