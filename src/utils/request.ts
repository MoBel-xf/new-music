// src/utils/request.ts
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  isAxiosError,
  CanceledError,
} from 'axios'

// ─── 常量 ────────────────────────────────────────────────────────────────────
const DEFAULT_TIMEOUT = 10_000
const MAX_RETRIES     = 2
const RETRY_DELAY_MS  = 600
const RETRYABLE_CODES = new Set([408, 429, 500, 502, 503, 504])

// ─── 扩展 AxiosRequestConfig ─────────────────────────────────────────────────
declare module 'axios' {
  interface AxiosRequestConfig {
    /** 已重试次数（内部使用） */
    _retryCount?: number
    /** 禁用自动重试 */
    noRetry?: boolean
    /** 绑定此 key 的请求将自动取消上一个同 key 的请求 */
    cancelKey?: string
  }
}

// ─── 取消令牌注册表 ───────────────────────────────────────────────────────────
const controllerMap = new Map<string, AbortController>()

/**
 * 手动取消指定 key 的请求
 */
export function cancelRequest(key: string, reason = 'manual cancel') {
  controllerMap.get(key)?.abort(reason)
  controllerMap.delete(key)
}

/**
 * 取消所有进行中的请求（页面卸载 / 路由切换时使用）
 */
export function cancelAll(reason = 'cancel all') {
  controllerMap.forEach((ctrl) => ctrl.abort(reason))
  controllerMap.clear()
}

// ─── Axios 实例 ───────────────────────────────────────────────────────────────
const instance: AxiosInstance = axios.create({
  timeout: DEFAULT_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
})

// ─── 请求拦截器 ───────────────────────────────────────────────────────────────
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const key = config.cancelKey

  if (key) {
    // 取消同 key 上一个请求
    controllerMap.get(key)?.abort(`superseded by new request: ${key}`)
    const controller = new AbortController()
    controllerMap.set(key, controller)
    config.signal = controller.signal
  }

  // 开发环境打印请求日志
  if (import.meta.env.DEV) {
    console.debug(`[request] ${config.method?.toUpperCase()} ${config.url}`, config.params ?? '')
  }

  return config
})

// ─── 响应拦截器 ───────────────────────────────────────────────────────────────
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    // 清理已完成请求的取消控制器
    const key = (response.config as AxiosRequestConfig).cancelKey
    if (key) controllerMap.delete(key)

    if (import.meta.env.DEV) {
      console.debug(`[response] ${response.status} ${response.config.url}`)
    }

    return response.data
  },
  async (error: unknown) => {
    // 被取消的请求直接透传，不重试不报错
    if (error instanceof CanceledError) {
      console.debug('[request cancelled]', error.message)
      return Promise.reject(error)
    }

    if (!isAxiosError(error) || !error.config) {
      return Promise.reject(error)
    }

    const config = error.config as AxiosRequestConfig
    const status = error.response?.status ?? 0

    // 清理取消控制器
    if (config.cancelKey) controllerMap.delete(config.cancelKey)

    // ── 重试逻辑 ──────────────────────────────────────────
    const retryCount = config._retryCount ?? 0
    const shouldRetry =
      !config.noRetry &&
      retryCount < MAX_RETRIES &&
      (RETRYABLE_CODES.has(status) || error.code === 'ECONNABORTED' /* timeout */)

    if (shouldRetry) {
      config._retryCount = retryCount + 1
      await sleep(RETRY_DELAY_MS * config._retryCount)

      if (import.meta.env.DEV) {
        console.debug(`[retry ${config._retryCount}/${MAX_RETRIES}] ${config.url}`)
      }

      return instance(config)
    }

    // ── 错误格式化 ────────────────────────────────────────
    const msg = error.response?.data?.message
      ?? error.message
      ?? 'Network Error'

    console.warn(`[request error] ${status} ${config.url}`, msg)
    return Promise.reject(new RequestError(msg, status, error))
  },
)

// ─── 工具函数 ─────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

// ─── 自定义错误类 ─────────────────────────────────────────────────────────────
export class RequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'RequestError'
  }
}

// ─── 便捷方法 ─────────────────────────────────────────────────────────────────
type RequestOptions = AxiosRequestConfig & {
  /** 请求失败时静默返回 null，不抛出错误（适合非关键接口）*/
  silent?: boolean
}

async function request<T = unknown>(options: RequestOptions): Promise<T> {
  try {
    return await instance(options) as T
  } catch (err) {
    if (options.silent) {
      if (!(err instanceof CanceledError)) {
        console.warn('[silent error]', options.url, err)
      }
      return null as unknown as T
    }
    throw err
  }
}

request.get = function <T = unknown>(url: string, options?: RequestOptions) {
  return request<T>({ ...options, method: 'GET', url })
}

request.post = function <T = unknown>(url: string, data?: unknown, options?: RequestOptions) {
  return request<T>({ ...options, method: 'POST', url, data })
}

/** 静默 GET：失败返回 null，不抛错（原各平台的 safeGet） */
request.safeGet = function <T = unknown>(url: string, options?: RequestOptions) {
  return request<T>({ ...options, method: 'GET', url, silent: true })
}

export default request
