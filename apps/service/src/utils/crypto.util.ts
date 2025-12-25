import CryptoJS from 'crypto-js'

const secret: Readonly<string> = 'layen-secret'

/**
 * Encrypt
 * @param ciphertext 加密内容
 * @returns 加密后的结果
 */
export function encrypt(ciphertext: string) {
  const enc = CryptoJS.AES.encrypt(ciphertext, secret).toString()
  return enc
}

/**
 * Decrypt
 * @param ciphertext 密文
 * @returns 解密后的结果
 */
export function decrypt(ciphertext: string | CryptoJS.lib.CipherParams) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, secret)
  const originalText = bytes.toString(CryptoJS.enc.Utf8)
  return originalText
}
