import { View, Text, ScrollView, Image, Input } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState } from 'react'
import BottomNav from '../../components/BottomNav/index'
import { request, BASE_URL } from '../../utils/request'
import './mall.scss'


interface Product {
  id: number
  name: string
  image?: string
  points_cost: number
  stock: number
  status: string
  product_type?: string
  size_options?: string[]
}

interface UserPoints {
  points_balance: number
  points_total: number
}

type ExchangeStep = 'size' | 'delivery' | 'address' | 'confirm' | null

interface ExchangeFlow {
  product: Product
  step: ExchangeStep
  size: string
  deliveryType: 'shipping' | 'pickup'
  receiverName: string
  receiverPhone: string
  receiverAddress: string
}

const TYPE_LABEL: Record<string, string> = {
  apparel: '服饰',
  shoes: '鞋子',
  virtual: '虚拟',
}

const EMPTY_FLOW = (product: Product): ExchangeFlow => ({
  product,
  step: null,
  size: '',
  deliveryType: 'shipping',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
})

export default function MallPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [myPoints, setMyPoints] = useState<UserPoints | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [flow, setFlow] = useState<ExchangeFlow | null>(null)

  useLoad(() => { loadAll() })

  const loadAll = async () => {
    try {
      const [prods, pts] = await Promise.all([
        request<Product[]>({ url: '/points/products', auth: false }),
        request<UserPoints>({ url: '/points/my' }),
      ])
      setProducts(prods)
      setMyPoints(pts)
    } catch (e) {
    } finally {
      setLoading(false)
    }
  }

  const startExchange = (product: Product) => {
    if (!myPoints || myPoints.points_balance < product.points_cost) {
      Taro.showToast({ title: `积分不足，还差 ${product.points_cost - (myPoints?.points_balance || 0)} 积分`, icon: 'none' })
      return
    }
    const f = EMPTY_FLOW(product)
    const isVirtual = product.product_type === 'virtual'
    const needsSize = (product.product_type === 'apparel' || product.product_type === 'shoes') && product.size_options?.length

    if (isVirtual) {
      f.step = 'confirm'
    } else if (needsSize) {
      f.step = 'size'
    } else {
      f.step = 'delivery'
    }
    setFlow(f)
  }

  const closeFlow = () => setFlow(null)

  const goNext = (patch: Partial<ExchangeFlow>) => {
    setFlow(prev => {
      if (!prev) return null
      const next = { ...prev, ...patch }
      switch (next.step) {
        case 'size':    next.step = 'delivery'; break
        case 'delivery':next.step = next.deliveryType === 'shipping' ? 'address' : 'confirm'; break
        case 'address': next.step = 'confirm'; break
        default: break
      }
      return next
    })
  }

  const goBack = () => {
    setFlow(prev => {
      if (!prev) return null
      const next = { ...prev }
      const needsSize = (next.product.product_type === 'apparel' || next.product.product_type === 'shoes') && next.product.size_options?.length
      switch (next.step) {
        case 'delivery': next.step = needsSize ? 'size' : null; if (!next.step) return null; break
        case 'address':  next.step = 'delivery'; break
        case 'confirm':  next.step = next.deliveryType === 'shipping' ? 'address' : 'delivery'; break
        default: return null
      }
      return next
    })
  }

  const doExchange = async () => {
    if (!flow) return
    setSubmitting(true)
    try {
      const data: any = {}
      if (flow.size) data.size = flow.size
      data.delivery_type = flow.product.product_type === 'virtual' ? 'virtual' : flow.deliveryType
      if (flow.deliveryType === 'shipping' && flow.product.product_type !== 'virtual') {
        data.address = { name: flow.receiverName, phone: flow.receiverPhone, detail: flow.receiverAddress }
      }
      await request({ url: `/points/exchange/${flow.product.id}`, method: 'POST', data })
      setFlow(null)
      Taro.showToast({ title: '兑换成功！', icon: 'success' })
      loadAll()
    } catch (e: any) {
      Taro.showToast({ title: e?.message || '兑换失败', icon: 'none' })
    } finally {
      setSubmitting(false)
    }
  }

  const renderStep = () => {
    if (!flow) return null
    const { product, step, size, deliveryType, receiverName, receiverPhone, receiverAddress } = flow
    const isVirtual = product.product_type === 'virtual'
    const stepLabels: Record<string, string> = { size: '选择尺码', delivery: '领取方式', address: '收货信息', confirm: '确认兑换' }

    return (
      <View className='exchange-overlay' onClick={(e) => { if ((e.target as any).className?.includes?.('exchange-overlay')) closeFlow() }}>
        <View className='exchange-sheet'>
          {/* Sheet header */}
          <View className='sheet-header'>
            <View className='sheet-back' onClick={goBack}>
              <Text className='sheet-back-text'>← 返回</Text>
            </View>
            <Text className='sheet-title'>{stepLabels[step!]}</Text>
            <View className='sheet-close' onClick={closeFlow}>
              <Text className='sheet-close-text'>✕</Text>
            </View>
          </View>

          {/* Product summary bar */}
          <View className='sheet-product-bar'>
            {product.image ? (
              <Image src={`${BASE_URL}${product.image}`} className='sheet-product-img' mode='aspectFill' />
            ) : (
              <View className='sheet-product-img-placeholder'><Text className='sheet-product-img-icon'>◇</Text></View>
            )}
            <View className='sheet-product-info'>
              <Text className='sheet-product-name'>{product.name}</Text>
              <Text className='sheet-product-cost'>{product.points_cost} 积分</Text>
            </View>
          </View>

          {/* Step content */}
          <View className='sheet-body'>

            {/* ── Step 1: Size ── */}
            {step === 'size' && (
              <View className='step-size'>
                <Text className='step-hint'>
                  {product.product_type === 'apparel' ? '请选择服装尺码' : '请选择鞋码'}
                </Text>
                <View className='size-grid'>
                  {product.size_options!.map((s) => (
                    <View
                      key={s}
                      className={`size-item ${size === s ? 'selected' : ''}`}
                      onClick={() => setFlow(f => f ? { ...f, size: s } : null)}
                    >
                      <Text className='size-text'>{s}</Text>
                    </View>
                  ))}
                </View>
                <View className={`sheet-btn ${!size ? 'disabled' : ''}`} onClick={() => size && goNext({ size })}>
                  <Text className='sheet-btn-text'>{size ? `确认：${size}` : '请先选择尺码'}</Text>
                </View>
              </View>
            )}

            {/* ── Step 2: Delivery ── */}
            {step === 'delivery' && (
              <View className='step-delivery'>
                <Text className='step-hint'>请选择领取方式</Text>
                <View className='delivery-options'>
                  <View
                    className={`delivery-item ${deliveryType === 'shipping' ? 'selected' : ''}`}
                    onClick={() => setFlow(f => f ? { ...f, deliveryType: 'shipping' } : null)}
                  >
                    <View className='delivery-icon-wrap'><Text className='delivery-icon'>📦</Text></View>
                    <View className='delivery-content'>
                      <Text className='delivery-label'>邮寄</Text>
                      <Text className='delivery-desc'>填写收货地址，快递送上门</Text>
                      <Text className='delivery-note'>运费到付</Text>
                    </View>
                    <View className={`delivery-radio ${deliveryType === 'shipping' ? 'on' : ''}`} />
                  </View>
                  <View
                    className={`delivery-item ${deliveryType === 'pickup' ? 'selected' : ''}`}
                    onClick={() => setFlow(f => f ? { ...f, deliveryType: 'pickup' } : null)}
                  >
                    <View className='delivery-icon-wrap'><Text className='delivery-icon'>🏃</Text></View>
                    <View className='delivery-content'>
                      <Text className='delivery-label'>活动现场自提</Text>
                      <Text className='delivery-desc'>凭兑换记录在活动现场领取</Text>
                    </View>
                    <View className={`delivery-radio ${deliveryType === 'pickup' ? 'on' : ''}`} />
                  </View>
                </View>
                <View className='sheet-btn' onClick={() => goNext({})}>
                  <Text className='sheet-btn-text'>下一步</Text>
                </View>
              </View>
            )}

            {/* ── Step 3: Address ── */}
            {step === 'address' && (
              <View className='step-address'>
                <Text className='step-hint'>填写收货信息</Text>
                <View className='address-form'>
                  <View className='address-row'>
                    <Text className='address-label'>收件人</Text>
                    <Input
                      className='address-input'
                      value={receiverName}
                      onInput={(e) => setFlow(f => f ? { ...f, receiverName: e.detail.value } : null)}
                      placeholder='请输入姓名'
                      placeholderClass='address-placeholder'
                    />
                  </View>
                  <View className='address-row'>
                    <Text className='address-label'>联系电话</Text>
                    <Input
                      className='address-input'
                      value={receiverPhone}
                      onInput={(e) => setFlow(f => f ? { ...f, receiverPhone: e.detail.value } : null)}
                      placeholder='请输入手机号'
                      placeholderClass='address-placeholder'
                      type='number'
                    />
                  </View>
                  <View className='address-row address-row-tall'>
                    <Text className='address-label'>收货地址</Text>
                    <Input
                      className='address-input'
                      value={receiverAddress}
                      onInput={(e) => setFlow(f => f ? { ...f, receiverAddress: e.detail.value } : null)}
                      placeholder='省市区 + 详细地址'
                      placeholderClass='address-placeholder'
                    />
                  </View>
                </View>
                <Text className='address-tip'>运费为到付，请在收货时支付</Text>
                <View
                  className={`sheet-btn ${!receiverName || !receiverPhone || !receiverAddress ? 'disabled' : ''}`}
                  onClick={() => (receiverName && receiverPhone && receiverAddress) && goNext({})}
                >
                  <Text className='sheet-btn-text'>下一步</Text>
                </View>
              </View>
            )}

            {/* ── Step 4: Confirm ── */}
            {step === 'confirm' && (
              <View className='step-confirm'>
                <View className='confirm-rows'>
                  <View className='confirm-row'>
                    <Text className='confirm-key'>消耗积分</Text>
                    <Text className='confirm-val cost'>{product.points_cost} 积分</Text>
                  </View>
                  {size && (
                    <View className='confirm-row'>
                      <Text className='confirm-key'>{product.product_type === 'shoes' ? '鞋码' : '尺码'}</Text>
                      <Text className='confirm-val'>{size}</Text>
                    </View>
                  )}
                  {!isVirtual && (
                    <View className='confirm-row'>
                      <Text className='confirm-key'>领取方式</Text>
                      <Text className='confirm-val'>{deliveryType === 'shipping' ? '邮寄' : '活动现场自提'}</Text>
                    </View>
                  )}
                  {deliveryType === 'shipping' && !isVirtual && (
                    <>
                      <View className='confirm-row'>
                        <Text className='confirm-key'>收件人</Text>
                        <Text className='confirm-val'>{receiverName}</Text>
                      </View>
                      <View className='confirm-row'>
                        <Text className='confirm-key'>联系电话</Text>
                        <Text className='confirm-val'>{receiverPhone}</Text>
                      </View>
                      <View className='confirm-row'>
                        <Text className='confirm-key'>收货地址</Text>
                        <Text className='confirm-val addr'>{receiverAddress}</Text>
                      </View>
                    </>
                  )}
                  {deliveryType === 'pickup' && !isVirtual && (
                    <View className='pickup-tip'>
                      <Text className='pickup-tip-text'>请在活动现场凭兑换记录领取</Text>
                    </View>
                  )}
                  {isVirtual && (
                    <View className='pickup-tip'>
                      <Text className='pickup-tip-text'>虚拟商品，兑换后即时生效</Text>
                    </View>
                  )}
                </View>
                <View className={`sheet-btn confirm-btn ${submitting ? 'disabled' : ''}`} onClick={!submitting ? doExchange : undefined}>
                  <Text className='sheet-btn-text'>{submitting ? '兑换中...' : `确认兑换 · ${product.points_cost} 积分`}</Text>
                </View>
                <Text className='confirm-balance'>当前余额：{myPoints?.points_balance ?? '--'} 积分 → 兑换后：{(myPoints?.points_balance ?? 0) - product.points_cost} 积分</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    )
  }

  return (
    <View className='mall-page'>
      <View className='mall-header'>
        <View className='mall-title-row'>
          <Text className='mall-title'>POINTS MALL</Text>
          <View className='my-balance' onClick={() => Taro.navigateTo({ url: '/pages/points/my' })}>
            <Text className='balance-num'>{myPoints?.points_balance ?? '--'}</Text>
            <Text className='balance-label'>积分</Text>
          </View>
        </View>
        <Text className='mall-sub'>签到获取积分，兑换专属权益</Text>
      </View>

      {loading ? (
        <View className='loading'><Text className='loading-text'>LOADING...</Text></View>
      ) : products.length === 0 ? (
        <View className='empty'>
          <Text className='empty-title'>商城筹备中</Text>
          <Text className='empty-sub'>即将上线，敬请期待</Text>
        </View>
      ) : (
        <ScrollView scrollY className='products-grid-scroll'>
          <View className='products-grid'>
            {products.map((p) => {
              const canExchange = (myPoints?.points_balance || 0) >= p.points_cost && p.stock > 0
              const typeLabel = p.product_type ? TYPE_LABEL[p.product_type] : undefined
              const btnLabel = p.stock === 0 ? '售罄' : !canExchange ? '不足' : (p.product_type === 'apparel' || p.product_type === 'shoes') ? '选码兑换' : '兑换'
              return (
                <View key={p.id} className='product-card'>
                  <View className='product-img-wrap'>
                    {p.image ? (
                      <Image src={`${BASE_URL}${p.image}`} className='product-img' mode='aspectFill' />
                    ) : (
                      <View className='product-img-placeholder'>
                        <Text className='product-img-icon'>◇</Text>
                      </View>
                    )}
                    {typeLabel && (
                      <View className='type-badge'><Text className='type-badge-text'>{typeLabel}</Text></View>
                    )}
                    {p.stock <= 5 && p.stock > 0 && (
                      <View className='stock-badge'><Text className='stock-text'>仅剩{p.stock}</Text></View>
                    )}
                    {p.stock === 0 && (
                      <View className='sold-out-mask'><Text className='sold-out-text'>已售罄</Text></View>
                    )}
                  </View>
                  <View className='product-info'>
                    <Text className='product-name'>{p.name}</Text>
                    {(p.product_type === 'apparel' || p.product_type === 'shoes') && p.size_options?.length && (
                      <Text className='product-sizes'>
                        {p.product_type === 'apparel' ? '尺码' : '鞋码'}：{p.size_options.join(' / ')}
                      </Text>
                    )}
                    <View className='product-bottom'>
                      <View className='product-cost'>
                        <Text className='cost-num'>{p.points_cost}</Text>
                        <Text className='cost-label'>积分</Text>
                      </View>
                      <View
                        className={`exchange-btn ${!canExchange ? 'disabled' : ''}`}
                        onClick={() => canExchange && startExchange(p)}
                      >
                        <Text className='exchange-text'>{btnLabel}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>
          <View className='mall-footer' onClick={() => Taro.navigateTo({ url: '/pages/points/orders' })}>
            <Text className='mall-footer-text'>查看我的兑换记录 →</Text>
          </View>
        </ScrollView>
      )}

      {flow && renderStep()}

      {!flow && <BottomNav current='mall' />}
    </View>
  )
}
