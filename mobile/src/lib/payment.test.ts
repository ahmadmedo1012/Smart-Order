import { describe, expect, it } from 'vitest'
import {
  WALLET_CAP_LYD,
  libyanaUssdCode,
  madarUssdCode,
  isWalletMethod,
  paymentNumber,
} from './payment'

describe('libyanaUssdCode — عقد رمز ليبيانا (نقل حرفي من الويب r140)', () => {
  it('يبني الرمز بدراهم مقرّبة ويحذف صفر البادئة', () => {
    expect(libyanaUssdCode('0942119637', 1)).toBe('*122*218942119637*1000*1#')
    expect(libyanaUssdCode('0942119637', 19.5)).toBe('*122*218942119637*19500*1#')
  })

  it('يقرّب كسور الفاصلة العائمة (العيب الصامت 1000.999…)', () => {
    // 1001 millimes عبر float: 1.001 * 1000 = 1000.9999999999999
    expect(libyanaUssdCode('0940000000', 1.001)).toBe('*122*218940000000*1001*1#')
  })
})

describe('madarUssdCode — عقد رمز مدار', () => {
  it('يبني الرمز بالدينار كما هو', () => {
    expect(madarUssdCode('0910089975', 19.5)).toBe('*140*4*1*19.5*0910089975#')
  })
})

describe('isWalletMethod', () => {
  it('يميّز المحافظ عن النقد والتحويل اليدوي', () => {
    expect(isWalletMethod('LIBYANA')).toBe(true)
    expect(isWalletMethod('MADAR')).toBe(true)
    expect(isWalletMethod('CASH')).toBe(false)
    expect(isWalletMethod('COD')).toBe(false)
    expect(isWalletMethod('MANUAL_TRANSFER')).toBe(false)
  })
})

describe('paymentNumber — تحليل config (نفس عقد الويب)', () => {
  it('يستخرج الرقم من JSON سليم', () => {
    expect(paymentNumber({ id: 'x', type: 'MADAR', name: 'مدار', instructions: null, config: '{"number":"0910089975"}' })).toBe('0910089975')
  })

  it('يُعيد null لغياب config أو تلفه أو فراغ الرقم', () => {
    expect(paymentNumber(null)).toBeNull()
    expect(paymentNumber({ id: 'x', type: 'CASH', name: 'نقد', instructions: null, config: null })).toBeNull()
    expect(paymentNumber({ id: 'x', type: 'CASH', name: 'نقد', instructions: null, config: 'not-json{' })).toBeNull()
    expect(paymentNumber({ id: 'x', type: 'CASH', name: 'نقد', instructions: null, config: '{"number":""}' })).toBeNull()
  })
})

describe('WALLET_CAP_LYD', () => {
  it('يطابق قيد الشبكة 99 د.ل', () => {
    expect(WALLET_CAP_LYD).toBe(99)
  })
})
