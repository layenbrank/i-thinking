const back = document.getElementById('back')
const forward = document.getElementById('forward')
const reload = document.getElementById('reload')
const form = document.getElementById('form')
const urlInput = document.getElementById('url')

function parseAddress(raw) {
  const text = raw.trim()
  if (!text) return null
  if (/^https?:\/\//i.test(text)) return text
  if (/^[\w.-]+\.[a-z]{2,}([/:].*)?$/i.test(text)) return `https://${text}`
  return `https://www.google.com/search?q=${encodeURIComponent(text)}`
}

back.addEventListener('click', function () {
  window.chromeShell.back()
})
forward.addEventListener('click', function () {
  window.chromeShell.forward()
})
reload.addEventListener('click', function () {
  window.chromeShell.reload()
})
form.addEventListener('submit', function (event) {
  event.preventDefault()
  const next = parseAddress(urlInput.value)
  if (next) window.chromeShell.navigate(next)
})

window.chromeShell.onState(function (state) {
  urlInput.value = state.url
  back.disabled = !state.canGoBack
  forward.disabled = !state.canGoForward
})
